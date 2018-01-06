class QrScanner {
    constructor(video, canvas, onDecode) {
        this.$video = video;
        this.$canvas = canvas;
        this._onDecode = onDecode;

        this._sourceRect = {
            x: 0,
            y: 0,
            width: this.$canvas.width,
            height: this.$canvas.height
        };

        this.$video.addEventListener('canplay', () => this._updateSourceRect());
        this.$video.addEventListener('play', () => {
            this._updateSourceRect();
            this._scanFrame();
        }, false);
        this._qrWorker = new Worker('/qr-scanner/qr-scanner-worker.min.js');
    }

    _updateSourceRect() {
        const smallestDimension = Math.min(this.$video.videoWidth, this.$video.videoHeight);
        const sourceRectSize = Math.round(2 / 3 * smallestDimension);
        this._sourceRect.width = this._sourceRect.height = sourceRectSize;
        this._sourceRect.x = (this.$video.videoWidth - sourceRectSize) / 2;
        this._sourceRect.y = (this.$video.videoHeight - sourceRectSize) / 2;
    }

    _scanFrame() {
        if (this.$video.paused || this.$video.ended) return false;
        requestAnimationFrame(() => {
            QrScannerLib.scanImage(this.$video, this._sourceRect, this._qrWorker, this.$canvas, true)
                .then(this._onDecode, error => {
                    if (error !== 'QR code not found.') {
                        console.error(error);
                    }
                })
                .then(() => this._scanFrame());
        });
    }

    set active(active) {
        if (active)
            this._cameraOn();
        else
            this._cameraOff();
    }

    _cameraOn(settingsToTry) {
        clearTimeout(this._offTimeout);
        const defaultSettings = [{
            facingMode: "environment",
            width: { min: 1024 }
        }, {
            facingMode: "environment",
            width: { min: 768 }
        }, {
            facingMode: "environment",
        }];
        settingsToTry = settingsToTry || defaultSettings;
        navigator.mediaDevices.getUserMedia({
                video: settingsToTry.shift()
            })
            .then(stream => this.$video.srcObject = stream)
            .catch(() => {
                if (settingsToTry.length > 0) {
                    this._cameraOn(settingsToTry)
                } else {
                    throw new Error('Couldn\'t start camera');
                }
            });
    }

    _cameraOff() {
        this.$video.pause();
        this._offTimeout = setTimeout(() => this.$video.srcObject.getTracks()[0].stop(), 3000);
    }

    setGrayscaleWeights(red, green, blue) {
        this._qrWorker.postMessage({
            type: 'grayscaleWeights',
            data: { red, green, blue }
        });
    }

    /* async */
    static scanImage(imageOrFileOrUrl, sourceRect=null, worker=null, canvas=null, fixedCanvasSize=false) {
        return new Promise((resolve, reject) => {
            worker = worker || new Worker('/qr-scanner/qr-scanner-worker.min.js');
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
            onError = () => {
                worker.removeEventListener('message', onMessage);
                worker.removeEventListener('error', onError);
                clearTimeout(timeout);
                reject('Worker error.');
            };
            worker.addEventListener('message', onMessage);
            worker.addEventListener('error', onError);
            timeout = setTimeout(onError, 3000);
            QrScannerLib._loadImage(imageOrFileOrUrl).then(image => {
                const imageData = QrScannerLib._getImageData(image, sourceRect, canvas, fixedCanvasSize);
                worker.postMessage({
                    type: 'decode',
                    data: imageData
                }, [imageData.data.buffer]);
            }).catch(reject);
        });
    }

    /* async */
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
            || typeof(ImageBitmap)!=='undefined' && imageOrFileOrUrl instanceof ImageBitmap
            || typeof(OffscreenCanvas)!=='undefined' && imageOrFileOrUrl instanceof OffscreenCanvas) {
            return Promise.resolve(imageOrFileOrUrl);
        } else if (imageOrFileOrUrl instanceof Image) {
            return QrScannerLib._awaitImageLoad(imageOrFileOrUrl).then(() => imageOrFileOrUrl);
        } else if (imageOrFileOrUrl instanceof File || imageOrFileOrUrl instanceof URL
            ||  typeof(imageOrFileOrUrl)==='string') {
            const image = new Image();
            if (imageOrFileOrUrl instanceof File) {
                image.src = URL.createObjectURL(imageOrFileOrUrl);
            } else {
                image.src = imageOrFileOrUrl;
            }
            return QrScannerLib._awaitImageLoad(image).then(() => {
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