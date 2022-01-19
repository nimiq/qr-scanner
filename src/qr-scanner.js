export default class QrScanner {
    static async hasCamera() {
        try {
            return !!(await QrScanner.listCameras(false)).length;
        } catch (e) {
            return false;
        }
    }

    static async listCameras(requestLabels = false) {
        if (!navigator.mediaDevices) return [];

        // Note that enumerateDevices can always be called and does not prompt the user for permission.
        // However, enumerateDevices only includes device labels if served via https and an active media stream exists
        // or permission to access the camera was given. Therefore, ask for camera permission by opening a stream, if
        // labels were requested.
        let openedStream = null;
        if (requestLabels) {
            try {
                openedStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
            } catch (e) {
                // Fail gracefully, especially if the device has no camera or on mobile when the camera is already in
                // use and some browsers disallow a second stream.
            }
        }
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'videoinput').map((device, i) => ({
                id: device.deviceId,
                label: device.label || (i === 0 ? 'Default Camera' : `Camera ${i + 1}`),
            }));
        } finally {
            // close the stream we just opened for getting camera access for listing the device labels
            if (openedStream) {
                for (const track of openedStream.getTracks()) {
                    track.stop();
                    openedStream.removeTrack(track);
                }
            }
        }
    }

    constructor(
        video,
        onDecode,
        canvasSizeOrOnDecodeError = this._onDecodeError,
        canvasSizeOrCalculateScanRegion = this._calculateScanRegion,
        preferredCamera = 'environment'
    ) {
        this.$video = video;
        this.$canvas = document.createElement('canvas');
        this._onDecode = onDecode;
        this._legacyCanvasSize = QrScanner.DEFAULT_CANVAS_SIZE;
        this._preferredCamera = preferredCamera;
        this._active = false;
        this._paused = false;
        this._flashOn = false;

        if (typeof canvasSizeOrOnDecodeError === 'number') {
            // legacy function signature where the third argument is the canvas size
            this._legacyCanvasSize = canvasSizeOrOnDecodeError;
            console.warn('You\'re using a deprecated version of the QrScanner constructor which will be removed in '
                + 'the future');
        } else {
            this._onDecodeError = canvasSizeOrOnDecodeError;
        }

        if (typeof canvasSizeOrCalculateScanRegion === 'number') {
            // legacy function signature where the fourth argument is the canvas size
            this._legacyCanvasSize = canvasSizeOrCalculateScanRegion;
            console.warn('You\'re using a deprecated version of the QrScanner constructor which will be removed in '
                + 'the future');
        } else {
            this._calculateScanRegion = canvasSizeOrCalculateScanRegion;
        }

        this._scanRegion = this._calculateScanRegion(video);

        this._onPlay = this._onPlay.bind(this);
        this._onLoadedMetaData = this._onLoadedMetaData.bind(this);
        this._onVisibilityChange = this._onVisibilityChange.bind(this);

        video.disablePictureInPicture = true;
        // Allow inline playback on iPhone instead of requiring full screen playback,
        // see https://webkit.org/blog/6784/new-video-policies-for-ios/
        video.playsInline = true;
        // Allow play() on iPhone without requiring a user gesture. Should not really be needed as camera stream
        // includes no audio, but just to be safe.
        video.muted = true;

        // Avoid Safari stopping the video stream on a hidden video.
        // See https://github.com/cozmo/jsQR/issues/185
        let shouldHideVideo = false;
        if (video.hidden) {
            video.hidden = false;
            shouldHideVideo = true;
        }
        if (!document.body.contains(video)) {
            document.body.appendChild(video);
            shouldHideVideo = true;
        }
        requestAnimationFrame(() => {
            // Checking in requestAnimationFrame which should avoid a potential additional re-flow for getComputedStyle.
            const computedStyle = window.getComputedStyle(video);
            if (computedStyle.display === 'none') {
                video.style.setProperty('display', 'block', 'important');
                shouldHideVideo = true;
            }
            if (computedStyle.visibility !== 'visible') {
                video.style.setProperty('visibility', 'visible', 'important');
                shouldHideVideo = true;
            }
            if (shouldHideVideo) {
                // Hide the video in a way that doesn't cause Safari to stop the playback.
                console.warn('QrScanner has overwritten the video hiding style to avoid Safari stopping the playback.');
                video.style.opacity = 0;
                video.style.width = 0;
                video.style.height = 0;
            }
        });

        video.addEventListener('play', this._onPlay);
        video.addEventListener('loadedmetadata', this._onLoadedMetaData);
        document.addEventListener('visibilitychange', this._onVisibilityChange);

        this._qrEnginePromise = QrScanner.createQrEngine();
    }

    async hasFlash() {
        let stream = null;
        try {
            stream = this.$video.srcObject || (await this._getCameraStream()).stream;
            return 'torch' in stream.getVideoTracks()[0].getSettings();
        } catch (e) {
            return false;
        } finally {
            // close the stream we just opened for detecting whether it supports flash
            if (stream && stream !== this.$video.srcObject) {
                console.warn('Call hasFlash after successfully starting the scanner to avoid creating '
                    + 'a temporary video stream');
                for (const track of stream.getTracks()) {
                    track.stop();
                    stream.removeTrack(track);
                }
            }
        }
    }

    isFlashOn() {
        return this._flashOn;
    }

    async toggleFlash() {
        if (this._flashOn) {
            await this.turnFlashOff();
        } else {
            await this.turnFlashOn();
        }
    }

    async turnFlashOn() {
        if (this._flashOn) return;
        this._flashOn = true;
        if (!this._active || this._paused) return; // flash will be turned on later on .start()
        try {
            if (!await this.hasFlash()) throw 'No flash available';
            // Note that the video track is guaranteed to exist at this point
            await this.$video.srcObject.getVideoTracks()[0].applyConstraints({
                advanced: [{ torch: true }],
            });
        } catch (e) {
            this._flashOn = false;
            throw e;
        }
    }

    async turnFlashOff() {
        if (!this._flashOn) return;
        // applyConstraints with torch: false does not work to turn the flashlight off, as a stream's torch stays
        // continuously on, see https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints#torch. Therefore,
        // we have to stop the stream to turn the flashlight off.
        this._flashOn = false;
        await this._restartVideoStream();
    }

    destroy() {
        this.$video.removeEventListener('loadedmetadata', this._onLoadedMetaData);
        this.$video.removeEventListener('play', this._onPlay);
        document.removeEventListener('visibilitychange', this._onVisibilityChange);

        this.stop();
        QrScanner._postWorkerMessage(this._qrEnginePromise, 'close');
    }

    async start() {
        if (this._active && !this._paused) return;

        if (window.location.protocol !== 'https:') {
            // warn but try starting the camera anyways
            console.warn('The camera stream is only accessible if the page is transferred via https.');
        }

        this._active = true;
        if (document.hidden) return; // camera will be started as soon as tab is in foreground
        this._paused = false;
        if (this.$video.srcObject) {
            // camera stream already/still set
            this.$video.play();
            return;
        }

        try {
            const { stream, facingMode } = await this._getCameraStream();
            this.$video.srcObject = stream;
            this.$video.play();
            this._setVideoMirror(facingMode);

            // Restart the flash if it was previously on
            if (this._flashOn) {
                this._flashOn = false; // force turnFlashOn to restart the flash
                this.turnFlashOn().catch(() => {});
            }
        } catch (e) {
            this._active = false;
            throw e;
        }
    }

    stop() {
        this.pause();
        this._active = false;
    }

    async pause(stopStreamImmediately = false) {
        this._paused = true;
        if (!this._active) return true;
        this.$video.pause();

        const stopStream = () => {
            const tracks = this.$video.srcObject ? this.$video.srcObject.getTracks() : [];
            for (const track of tracks) {
                track.stop(); //  note that this will also automatically turn the flashlight off
                this.$video.srcObject.removeTrack(track);
            }
            this.$video.srcObject = null;
        };

        if (stopStreamImmediately) {
            stopStream();
            return true;
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
        if (!this._paused) return false;
        stopStream();
        return true;
    }

    async setCamera(facingModeOrDeviceId) {
        if (facingModeOrDeviceId === this._preferredCamera) return;
        this._preferredCamera = facingModeOrDeviceId;
        // Restart the scanner with the new camera which will also update the video mirror and the scan region.
        await this._restartVideoStream();
    }

    static async scanImage(
        imageOrFileOrUrl,
        scanRegion = null,
        qrEngine = null,
        canvas = null,
        disallowCanvasResizing = false,
        alsoTryWithoutScanRegion = false
    ) {
        const gotExternalEngine = !!qrEngine;

        try {
            let image;
            let canvasContext;
            [qrEngine, image] = await Promise.all([
                qrEngine || QrScanner.createQrEngine(),
                QrScanner._loadImage(imageOrFileOrUrl),
            ]);
            [canvas, canvasContext] = this._drawToCanvas(image, scanRegion, canvas, disallowCanvasResizing);

            if (qrEngine instanceof Worker) {
                if (!gotExternalEngine) {
                    // Enable scanning of inverted color qr codes. Not using _postWorkerMessage as it's async
                    qrEngine.postMessage({ type: 'inversionMode', data: 'both' });
                }
                return await new Promise((resolve, reject) => {
                    let timeout, onMessage, onError;
                    onMessage = event => {
                        if (event.data.type !== 'qrResult') {
                            return;
                        }
                        qrEngine.removeEventListener('message', onMessage);
                        qrEngine.removeEventListener('error', onError);
                        clearTimeout(timeout);
                        if (event.data.data !== null) {
                            resolve(event.data.data);
                        } else {
                            reject(QrScanner.NO_QR_CODE_FOUND);
                        }
                    };
                    onError = (e) => {
                        qrEngine.removeEventListener('message', onMessage);
                        qrEngine.removeEventListener('error', onError);
                        clearTimeout(timeout);
                        const errorMessage = !e ? 'Unknown Error' : (e.message || e);
                        reject('Scanner error: ' + errorMessage);
                    };
                    qrEngine.addEventListener('message', onMessage);
                    qrEngine.addEventListener('error', onError);
                    timeout = setTimeout(() => onError('timeout'), 10000);
                    const imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
                    qrEngine.postMessage({
                        type: 'decode',
                        data: imageData
                    }, [imageData.data.buffer]);
                });
            } else {
                return await Promise.race([
                    new Promise((resolve, reject) => window.setTimeout(() => reject('Scanner error: timeout'), 10000)),
                    (async () => {
                        try {
                            const [scanResult] = await qrEngine.detect(canvas);
                            if (!scanResult) throw QrScanner.NO_QR_CODE_FOUND;
                            return scanResult.rawValue;
                        } catch (e) {
                            throw `Scanner error: ${e instanceof Error ? e.message : e}`;
                        }
                    })(),
                ]);
            }
        } catch (e) {
            if (!scanRegion || !alsoTryWithoutScanRegion) throw e;
            return await QrScanner.scanImage(imageOrFileOrUrl, null, qrEngine, canvas, disallowCanvasResizing);
        } finally {
            if (!gotExternalEngine) {
                QrScanner._postWorkerMessage(qrEngine, 'close');
            }
        }
    }

    setGrayscaleWeights(red, green, blue, useIntegerApproximation = true) {
        // Note that for the native BarcodeDecoder, this is a no-op. However, the native implementations work also
        // well with colored qr codes.
        QrScanner._postWorkerMessage(
            this._qrEnginePromise,
            'grayscaleWeights',
            { red, green, blue, useIntegerApproximation }
        );
    }

    setInversionMode(inversionMode) {
        // Note that for the native BarcodeDecoder, this is a no-op. However, the native implementations scan normal
        // and inverted qr codes by default
        QrScanner._postWorkerMessage(this._qrEnginePromise, 'inversionMode', inversionMode);
    }

    static async createQrEngine(workerPath = QrScanner.WORKER_PATH) {
        const hasNativeBarcodeDetector = 'BarcodeDetector' in window && BarcodeDetector.getSupportedFormats
            ? (await BarcodeDetector.getSupportedFormats()).includes('qr_code')
            : false;
        return hasNativeBarcodeDetector ? new BarcodeDetector({ formats: ['qr_code'] }) : new Worker(workerPath);
    }

    _onPlay() {
        this._scanRegion = this._calculateScanRegion(this.$video);
        this._scanFrame();
    }

    _onLoadedMetaData() {
        this._scanRegion = this._calculateScanRegion(this.$video);
    }

    _onVisibilityChange() {
        if (document.hidden) {
            this.pause();
        } else if (this._active) {
            this.start();
        }
    }

    _calculateScanRegion(video) {
        // Default scan region calculation. Note that this can be overwritten in the constructor.
        const smallestDimension = Math.min(video.videoWidth, video.videoHeight);
        const scanRegionSize = Math.round(2 / 3 * smallestDimension);
        return {
            x: Math.round((video.videoWidth - scanRegionSize) / 2),
            y: Math.round((video.videoHeight - scanRegionSize) / 2),
            width: scanRegionSize,
            height: scanRegionSize,
            downScaledWidth: this._legacyCanvasSize,
            downScaledHeight: this._legacyCanvasSize,
        };
    }

    _scanFrame() {
        if (!this._active || this.$video.paused || this.$video.ended) return;
        // using requestAnimationFrame to avoid scanning if tab is in background
        requestAnimationFrame(async () => {
            if (this.$video.readyState <= 1) {
                // Skip scans until the video is ready as drawImage() only works correctly on a video with readyState
                // > 1, see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage#Notes.
                // This also avoids false positives for videos paused after a successful scan which remains visible on
                // the canvas until the video is started again and ready.
                this._scanFrame();
                return;
            }

            let result;
            try {
                result = await QrScanner.scanImage(
                    this.$video,
                    this._scanRegion,
                    this._qrEnginePromise,
                    this.$canvas
                );
            } catch (error) {
                if (!this._active) return;
                const errorMessage = error.message || error;
                if (errorMessage.includes('service unavailable')) {
                    // When the native BarcodeDetector crashed, create a new one
                    this._qrEnginePromise = QrScanner.createQrEngine();
                }
                this._onDecodeError(error);
            }

            if (result) {
                this._onDecode(result);
            }

            this._scanFrame();
        });
    }

    _onDecodeError(error) {
        // default error handler; can be overwritten in the constructor
        if (error === QrScanner.NO_QR_CODE_FOUND) return;
        console.log(error);
    }

    async _getCameraStream() {
        if (!navigator.mediaDevices) throw 'Camera not found.';

        const preferenceType = this._preferredCamera === 'environment' || this._preferredCamera === 'user'
            ? 'facingMode'
            : 'deviceId';
        const constraintsWithoutCamera = [{
            width: { min: 1024 }
        }, {
            width: { min: 768 }
        }, {}];
        const constraintsWithCamera = constraintsWithoutCamera.map((constraint) => Object.assign({}, constraint, {
            [preferenceType]: { exact: this._preferredCamera },
        }));

        for (const constraints of [...constraintsWithCamera, ...constraintsWithoutCamera]) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: constraints, audio: false });
                // Try to determine the facing mode from the stream, otherwise use a guess or 'environment' as
                // default. Note that the guess is not always accurate as Safari returns cameras of different facing
                // mode, even for exact facingMode constraints.
                const facingMode = this._getFacingMode(stream)
                    || (constraints.facingMode
                        ? this._preferredCamera // _preferredCamera is a facing mode and we are able to fulfill it
                        : (this._preferredCamera === 'environment'
                            ? 'user' // switch as _preferredCamera was environment but we are not able to fulfill it
                            : 'environment' // switch from unfulfilled user facingMode or default to environment
                        )
                    );
                return { stream, facingMode };
            } catch (e) {}
        }

        throw 'Camera not found.';
    }

    async _restartVideoStream() {
        // Note that we always pause the stream and not only if !this._paused as even if this._paused === true, the
        // stream might still be running, as it's by default only stopped after a delay of 300ms.
        const wasPaused = this._paused;
        const paused = await this.pause(true);
        if (!paused || wasPaused || !this._active) return;
        await this.start();
    }

    _setVideoMirror(facingMode) {
        // in user facing mode mirror the video to make it easier for the user to position the QR code
        const scaleFactor = facingMode==='user'? -1 : 1;
        this.$video.style.transform = 'scaleX(' + scaleFactor + ')';
    }

    _getFacingMode(videoStream) {
        const videoTrack = videoStream.getVideoTracks()[0];
        if (!videoTrack) return null; // unknown
        // inspired by https://github.com/JodusNodus/react-qr-reader/blob/master/src/getDeviceId.js#L13
        return /rear|back|environment/i.test(videoTrack.label)
            ? 'environment'
            : /front|user|face/i.test(videoTrack.label)
                ? 'user'
                : null; // unknown
    }

    static _drawToCanvas(image, scanRegion=null, canvas=null, disallowCanvasResizing=false) {
        canvas = canvas || document.createElement('canvas');
        const scanRegionX = scanRegion && scanRegion.x? scanRegion.x : 0;
        const scanRegionY = scanRegion && scanRegion.y? scanRegion.y : 0;
        const scanRegionWidth = scanRegion && scanRegion.width? scanRegion.width : image.width || image.videoWidth;
        const scanRegionHeight = scanRegion && scanRegion.height? scanRegion.height : image.height || image.videoHeight;

        if (!disallowCanvasResizing) {
            const canvasWidth = scanRegion && scanRegion.downScaledWidth
                ? scanRegion.downScaledWidth
                : scanRegionWidth;
            const canvasHeight = scanRegion && scanRegion.downScaledHeight
                ? scanRegion.downScaledHeight
                : scanRegionHeight;
            // Setting the canvas width or height clears the canvas, even if the values didn't change, therefore only
            // set them if they actually changed.
            if (canvas.width !== canvasWidth) {
                canvas.width = canvasWidth;
            }
            if (canvas.height !== canvasHeight) {
                canvas.height = canvasHeight;
            }
        }

        const context = canvas.getContext('2d', { alpha: false });
        context.imageSmoothingEnabled = false; // gives less blurry images
        context.drawImage(
            image,
            scanRegionX, scanRegionY, scanRegionWidth, scanRegionHeight,
            0, 0, canvas.width, canvas.height
        );
        return [canvas, context];
    }

    static async _loadImage(imageOrFileOrBlobOrUrl) {
        if (imageOrFileOrBlobOrUrl instanceof HTMLCanvasElement || imageOrFileOrBlobOrUrl instanceof HTMLVideoElement
            || window.ImageBitmap && imageOrFileOrBlobOrUrl instanceof window.ImageBitmap
            || window.OffscreenCanvas && imageOrFileOrBlobOrUrl instanceof window.OffscreenCanvas) {
            return imageOrFileOrBlobOrUrl;
        } else if (imageOrFileOrBlobOrUrl instanceof Image) {
            await QrScanner._awaitImageLoad(imageOrFileOrBlobOrUrl);
            return imageOrFileOrBlobOrUrl;
        } else if (imageOrFileOrBlobOrUrl instanceof File || imageOrFileOrBlobOrUrl instanceof Blob
            || imageOrFileOrBlobOrUrl instanceof URL || typeof(imageOrFileOrBlobOrUrl)==='string') {
            const image = new Image();
            if (imageOrFileOrBlobOrUrl instanceof File || imageOrFileOrBlobOrUrl instanceof Blob) {
                image.src = URL.createObjectURL(imageOrFileOrBlobOrUrl);
            } else {
                image.src = imageOrFileOrBlobOrUrl;
            }
            try {
                await QrScanner._awaitImageLoad(image);
                return image;
            } finally {
                if (imageOrFileOrBlobOrUrl instanceof File || imageOrFileOrBlobOrUrl instanceof Blob) {
                    URL.revokeObjectURL(image.src);
                }
            }
        } else {
            throw 'Unsupported image type.';
        }
    }

    static async _awaitImageLoad(image) {
        if (image.complete && image.naturalWidth !== 0) return; // already loaded
        await new Promise((resolve, reject) => {
            let onLoad, onError;
            onLoad = () => {
                image.removeEventListener('load', onLoad);
                image.removeEventListener('error', onError);
                resolve();
            };
            onError = () => {
                image.removeEventListener('load', onLoad);
                image.removeEventListener('error', onError);
                reject('Image load error');
            };
            image.addEventListener('load', onLoad);
            image.addEventListener('error', onError);
        });
    }

    static async _postWorkerMessage(qrEngineOrQrEnginePromise, type, data) {
        const qrEngine = await qrEngineOrQrEnginePromise;
        if (!(qrEngine instanceof Worker)) return;
        qrEngine.postMessage({ type, data });
    }
}
QrScanner.DEFAULT_CANVAS_SIZE = 400;
QrScanner.NO_QR_CODE_FOUND = 'No QR code found';
QrScanner.WORKER_PATH = 'qr-scanner-worker.min.js';
