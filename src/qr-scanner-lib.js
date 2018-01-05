class QrScannerLib {
    constructor(video, canvas, onDecode) {
        this.$video = video;
        this.$canvas = canvas;
        this.$context = this.$canvas.getContext('2d', { alpha: false });
        this.$context.imageSmoothingEnabled = false; // gives less blurry images
        this._canvasSize = this.$canvas.width;
        this._sourceRectSize = this._canvasSize;

        this._onDecode = onDecode;

        window.addEventListener('resize', () => this._updateSourceRect());
        this.$video.addEventListener('canplay', () => this._updateSourceRect());
        this.$video.addEventListener('play', () => this._scanFrame(), false);
        this._qrWorker = new Worker('/qr-scanner/qr-scanner-worker.min.js');
        this._qrWorker.addEventListener('message', event => this._handleWorkerMessage(event));
    }

    _updateSourceRect() {
        const smallestDimension = Math.min(this.$video.videoWidth, this.$video.videoHeight);
        this._sourceRectSize = Math.round(2 / 3 * smallestDimension);

        const scannerWidth = this.$video.parentElement.offsetWidth;
        const scannerHeight = this.$video.parentElement.offsetHeight;
        const widthRatio = this.$video.videoWidth / scannerWidth;
        const heightRatio = this.$video.videoHeight / scannerHeight;
        const scaleFactor = 1 / (Math.min(heightRatio, widthRatio) || 1);
        const scaledOverlaySize = this._sourceRectSize * scaleFactor;
    }

    _scanFrame() {
        if (this.$video.paused || this.$video.ended) return false;
        const x0 = (this.$video.videoWidth - this._sourceRectSize) / 2;
        const y0 = (this.$video.videoHeight - this._sourceRectSize) / 2;
        this.$context.drawImage(this.$video, x0, y0, this._sourceRectSize, this._sourceRectSize, 0, 0, this._canvasSize, this._canvasSize);
        const imageData = this.$context.getImageData(0, 0, this._canvasSize, this._canvasSize);
        this._qrWorker.postMessage({
            type: 'decode',
            data: imageData
        }, [imageData.data.buffer]);
    }

    _handleWorkerMessage(event) {
        const type = event.data.type;
        const data = event.data.data;
        if (type !== 'qrResult') return;
        requestAnimationFrame(() => this._scanFrame());

        if (data === null) return;
        this._onDecode(data);
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

    scanImage(imageFile){
        return Promise.resolve('<< detected >>')
    }
}