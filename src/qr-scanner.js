export default class QrScanner {
    /* async */
    static hasCamera() {
        // note that enumerateDevices can always be called and does not prompt the user for permission. However, device
        // labels are only readable if served via https and an active media stream exists or permanent permission is
        // given. That doesn't matter for us though as we don't require labels.
        return navigator.mediaDevices.enumerateDevices()
            .then(devices => devices.some(device => device.kind === 'videoinput'))
            .catch(() => false);
    }

    constructor(video, onDecode, canvasSize = QrScanner.DEFAULT_CANVAS_SIZE) {
        this.$video = video;
        this.$canvas = document.createElement('canvas');
        this._onDecode = onDecode;
        this._active = false;
        this._paused = false;

        this.$canvas.width = canvasSize;
        this.$canvas.height = canvasSize;
        this._sourceRect = {
            x: 0,
            y: 0,
            width: canvasSize,
            height: canvasSize
        };

        this._onCanPlay = this._onCanPlay.bind(this);
        this._onPlay = this._onPlay.bind(this);
        this._onVisibilityChange = this._onVisibilityChange.bind(this);

        this.$video.addEventListener('canplay', this._onCanPlay);
        this.$video.addEventListener('play', this._onPlay);
        document.addEventListener('visibilitychange', this._onVisibilityChange);

        this._qrWorker = new Worker(QrScanner.WORKER_PATH);
    }

    destroy() {
        this.$video.removeEventListener('canplay', this._onCanPlay);
        this.$video.removeEventListener('play', this._onPlay);
        document.removeEventListener('visibilitychange', this._onVisibilityChange);

        this.stop();
        this._qrWorker.postMessage({
            type: 'close'
        });
    }

    /* async */
    start() {
        if (this._active && !this._paused) {
            return Promise.resolve();
        }
        if (window.location.protocol !== 'https:') {
            // warn but try starting the camera anyways
            console.warn('The camera stream is only accessible if the page is transferred via https.');
        }
        this._active = true;
        this._paused = false;
        if (document.hidden) {
            // camera will be started as soon as tab is in foreground
            return Promise.resolve();
        }
        clearTimeout(this._offTimeout);
        this._offTimeout = null;
        if (this.$video.srcObject) {
            // camera stream already/still set
            this.$video.play();
            return Promise.resolve();
        }

        let facingMode = 'environment';
        return this._getCameraStream('environment', true)
            .catch(() => {
                // we (probably) don't have an environment camera
                facingMode = 'user';
                return this._getCameraStream(); // throws if camera is not accessible (e.g. due to not https)
            })
            .then(stream => {
                this.$video.srcObject = stream;
                this._setVideoMirror(facingMode);
            })
            .catch(e => {
                this._active = false;
                throw e;
            });
    }

    stop() {
        this.pause();
        this._active = false;
    }

    pause() {
        this._paused = true;
        if (!this._active) {
            return;
        }
        this.$video.pause();
        if (this._offTimeout) {
            return;
        }
        this._offTimeout = setTimeout(() => {
            const track = this.$video.srcObject && this.$video.srcObject.getTracks()[0];
            if (!track) return;
            track.stop();
            this.$video.srcObject = null;
            this._offTimeout = null;
        }, 300);
    }

    /* async */
    static scanImage(imageOrFileOrUrl, sourceRect=null, worker=null, canvas=null, fixedCanvasSize=false,
                     alsoTryWithoutSourceRect=false) {
        let createdNewWorker = false;
        let promise = new Promise((resolve, reject) => {
            if (!worker) {
                worker = new Worker(QrScanner.WORKER_PATH);
                createdNewWorker = true;
                worker.postMessage({ type: 'inversionMode', data: 'both' }); // scan inverted color qr codes too
            }
            let timeout, onMessage, onError;
            onMessage = event => {
                if (event.data.type !== 'qrResult') {
                    return;
                }
                worker.removeEventListener('message', onMessage);
                worker.removeEventListener('error', onError);
                clearTimeout(timeout);
                if (event.data.data !== null) {
                    resolve(event.data.data);
                } else {
                    reject('QR code not found.');
                }
            };
            onError = (e) => {
                worker.removeEventListener('message', onMessage);
                worker.removeEventListener('error', onError);
                clearTimeout(timeout);
                const errorMessage = !e ? 'Unknown Error' : (e.message || e);
                reject('Scanner error: ' + errorMessage);
            };
            worker.addEventListener('message', onMessage);
            worker.addEventListener('error', onError);
            timeout = setTimeout(() => onError('timeout'), 3000);
            QrScanner._loadImage(imageOrFileOrUrl).then(image => {
                const imageData = QrScanner._getImageData(image, sourceRect, canvas, fixedCanvasSize);
                worker.postMessage({
                    type: 'decode',
                    data: imageData
                }, [imageData.data.buffer]);
            }).catch(onError);
        });

        if (sourceRect && alsoTryWithoutSourceRect) {
            promise = promise.catch(() => QrScanner.scanImage(imageOrFileOrUrl, null, worker, canvas, fixedCanvasSize));
        }

        promise = promise.finally(() => {
            if (!createdNewWorker) return;
            worker.postMessage({
                type: 'close'
            });
        });

        return promise;
    }

    setGrayscaleWeights(red, green, blue, useIntegerApproximation = true) {
        this._qrWorker.postMessage({
            type: 'grayscaleWeights',
            data: { red, green, blue, useIntegerApproximation }
        });
    }

    setInversionMode(inversionMode) {
        this._qrWorker.postMessage({
            type: 'inversionMode',
            data: inversionMode
        });
    }

    _onCanPlay() {
        this._updateSourceRect();
        this.$video.play();
    }

    _onPlay() {
        this._updateSourceRect();
        this._scanFrame();
    }

    _onVisibilityChange() {
        if (document.hidden) {
            this.pause();
        } else if (this._active) {
            this.start();
        }
    }

    _updateSourceRect() {
        const smallestDimension = Math.min(this.$video.videoWidth, this.$video.videoHeight);
        const sourceRectSize = Math.round(2 / 3 * smallestDimension);
        this._sourceRect.width = this._sourceRect.height = sourceRectSize;
        this._sourceRect.x = (this.$video.videoWidth - sourceRectSize) / 2;
        this._sourceRect.y = (this.$video.videoHeight - sourceRectSize) / 2;
    }

    _scanFrame() {
        if (!this._active || this.$video.paused || this.$video.ended) return false;
        // using requestAnimationFrame to avoid scanning if tab is in background
        requestAnimationFrame(() => {
            QrScanner.scanImage(this.$video, this._sourceRect, this._qrWorker, this.$canvas, true)
                .then(this._onDecode, error => {
                    if (this._active && error !== 'QR code not found.') {
                        console.error(error);
                    }
                })
                .then(() => this._scanFrame());
        });
    }

    _getCameraStream(facingMode, exact = false) {
        const constraintsToTry = [{
            width: { min: 1024 }
        }, {
            width: { min: 768 }
        }, {}];

        if (facingMode) {
            if (exact) {
                facingMode = { exact: facingMode };
            }
            constraintsToTry.forEach(constraint => constraint.facingMode = facingMode);
        }
        return this._getMatchingCameraStream(constraintsToTry);
    }

    _getMatchingCameraStream(constraintsToTry) {
        if (constraintsToTry.length === 0) {
            return Promise.reject('Camera not found.');
        }
        return navigator.mediaDevices.getUserMedia({
            video: constraintsToTry.shift()
        }).catch(() => this._getMatchingCameraStream(constraintsToTry));
    }

    _setVideoMirror(facingMode) {
        // in user facing mode mirror the video to make it easier for the user to position the QR code
        const scaleFactor = facingMode==='user'? -1 : 1;
        this.$video.style.transform = 'scaleX(' + scaleFactor + ')';
    }

    static _getImageData(image, sourceRect=null, canvas=null, fixedCanvasSize=false) {
        canvas = canvas || document.createElement('canvas');
        const sourceRectX = sourceRect && sourceRect.x? sourceRect.x : 0;
        const sourceRectY = sourceRect && sourceRect.y? sourceRect.y : 0;
        const sourceRectWidth = sourceRect && sourceRect.width? sourceRect.width : image.width || image.videoWidth;
        const sourceRectHeight = sourceRect && sourceRect.height? sourceRect.height : image.height || image.videoHeight;
        if (!fixedCanvasSize && (canvas.width !== sourceRectWidth || canvas.height !== sourceRectHeight)) {
            canvas.width = sourceRectWidth;
            canvas.height = sourceRectHeight;
        }
        const context = canvas.getContext('2d', { alpha: false });
        context.imageSmoothingEnabled = false; // gives less blurry images
        context.drawImage(image, sourceRectX, sourceRectY, sourceRectWidth, sourceRectHeight, 0, 0, canvas.width, canvas.height);
        return context.getImageData(0, 0, canvas.width, canvas.height);
    }

    /* async */
    static _loadImage(imageOrFileOrUrl) {
        if (imageOrFileOrUrl instanceof HTMLCanvasElement || imageOrFileOrUrl instanceof HTMLVideoElement
            || window.ImageBitmap && imageOrFileOrUrl instanceof window.ImageBitmap
            || window.OffscreenCanvas && imageOrFileOrUrl instanceof window.OffscreenCanvas) {
            return Promise.resolve(imageOrFileOrUrl);
        } else if (imageOrFileOrUrl instanceof Image) {
            return QrScanner._awaitImageLoad(imageOrFileOrUrl).then(() => imageOrFileOrUrl);
        } else if (imageOrFileOrUrl instanceof File || imageOrFileOrUrl instanceof URL
            ||  typeof(imageOrFileOrUrl)==='string') {
            const image = new Image();
            if (imageOrFileOrUrl instanceof File) {
                image.src = URL.createObjectURL(imageOrFileOrUrl);
            } else {
                image.src = imageOrFileOrUrl;
            }
            return QrScanner._awaitImageLoad(image).then(() => {
                if (imageOrFileOrUrl instanceof File) {
                    URL.revokeObjectURL(image.src);
                }
                return image;
            });
        } else {
            return Promise.reject('Unsupported image type.');
        }
    }

    /* async */
    static _awaitImageLoad(image) {
        return new Promise((resolve, reject) => {
            if (image.complete && image.naturalWidth!==0) {
                // already loaded
                resolve();
            } else {
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
            }
        });
    }
}
QrScanner.DEFAULT_CANVAS_SIZE = 400;
QrScanner.WORKER_PATH = 'qr-scanner-worker.min.js';
