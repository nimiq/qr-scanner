class QrScanner extends XElement {
    onCreate() {
        this._qrWorker = new Worker('qr-scanner-worker.min.js');
        this._qrWorker.onmessage = event => this._handleWorkerMessage(event);
        this.$video = this.$('video');
        this.$canvas = this.$('canvas');
        this.$debugCanvas = null;
        this.$debugContext = null;
        this.$context = this.$canvas.getContext('2d');
        this.$overlay = this.$('#qr-overlay');
        this._canvasSize = this.$canvas.width;
        this._sourceRectSize = this._canvasSize;
        window.addEventListener('resize', () => this._updateSourceRect());
        this.$video.addEventListener('canplay', () => this._updateSourceRect());
        this.$video.addEventListener('play', () => this._scanFrame(), false);
    }

    _updateSourceRect() {
        var smallestDimension = Math.min(this.$video.videoWidth, this.$video.videoHeight);
        this._sourceRectSize = Math.round(2/3 * smallestDimension);

        var scannerWidth = this.$el.offsetWidth;
        var scannerHeight = this.$el.offsetHeight;
        var widthRatio = this.$video.videoWidth / scannerWidth;
        var heightRatio = this.$video.videoHeight / scannerHeight;
        var scaleFactor = 1 / (Math.min(heightRatio, widthRatio) || 1);
        var scaledOverlaySize = this._sourceRectSize * scaleFactor;
        var borderWidth = Math.max(0, (scannerWidth - scaledOverlaySize) / 2) + 'px';
        var borderHeight = Math.max(0, (scannerHeight - scaledOverlaySize) / 2) + 'px';
        this.$overlay.style.borderTopWidth = borderHeight;
        this.$overlay.style.borderBottomWidth = borderHeight;
        this.$overlay.style.borderLeftWidth = borderWidth;
        this.$overlay.style.borderRightWidth = borderWidth;
    }

    _scanFrame() {
        if (this.$video.paused || this.$video.ended) return false;
        this.$context.drawImage(this.$video, (this.$video.videoWidth - this._sourceRectSize) / 2,
            (this.$video.videoHeight - this._sourceRectSize) / 2, this._sourceRectSize, this._sourceRectSize,
            0, 0, this._canvasSize, this._canvasSize);
        var imageData = this.$context.getImageData(0, 0, this._canvasSize, this._canvasSize);
        this._qrWorker.postMessage({
            type: 'decode',
            data: imageData
        }, [imageData.data.buffer]);
    }

    _handleWorkerMessage(event) {
        var type = event.data.type;
        var data = event.data.data;
        if (type === 'qrResult') {
            if (data !== null) {
                this.fire('x-decoded', data);
            }
            requestAnimationFrame(() => this._scanFrame());
        } else if (type === 'debugImage') {
            this.$debugContext.putImageData(data, 0, 0);
        }
    }

    set active(active) {
        if (active)
            this._cameraOn();
        else
            this._cameraOff();
    }

    _cameraOn(settingsToTry) {
        settingsToTry = settingsToTry || [
            {
                facingMode: "environment",
                width: {min: 1024}
            },
            {
                facingMode: "environment",
                width: {min: 768}
            },
            {
                facingMode: "environment",
            }

        ];
        navigator.mediaDevices.getUserMedia({
            video: settingsToTry.shift(),
            audio: false
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
        setTimeout(() => this.$video.srcObject.getTracks()[0].stop(), 3000);
    }

    set debug(isDebug) {
        this._qrWorker.postMessage({
            type: 'setDebug',
            data: isDebug
        });
        if (!this.$debugCanvas) {
            this.$debugCanvas = document.createElement('canvas');
            this.$debugCanvas.setAttribute('id', 'debug-canvas');
            this.$debugCanvas.width = this._canvasSize;
            this.$debugCanvas.height = this._canvasSize;
            this.$debugContext = this.$debugCanvas.getContext('2d');
            document.body.appendChild(this.$debugCanvas);
        }
        this.$debugCanvas.style.display = isDebug? 'block' : 'none';
    }
}



// const video = this.$('video');
// navigator.mediaDevices.enumerateDevices()
//     .then(function(devices) {
//         devices.forEach(function(device) {
//             console.log(device.kind + ": " + device.label +
//                 " id = " + device.deviceId);
//         });
//     })
// navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
//     .then(stream => video.srcObject = stream)
//     .catch(console.error);