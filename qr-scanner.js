class QrScanner extends XElement {
    onCreate() {
        this.$video = this.$('video');
        this.$canvas = this.$('canvas');
        this.$context = this.$canvas.getContext('2d');
        this.$overlay = this.$('#qr-overlay');
        this._sourceRectSize = 400;
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
            0, 0, 400, 400);
        this._decode();
        requestAnimationFrame(() => this._scanFrame());
    }

    _decode() {
        try {
            var decoded = qrscanner.decode();
            this.fire('x-decoded', decoded);
        } catch (e) {
            // no qr-code in this frame
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
                throw Error('couldn\'t start camera');
            }
        });
    }

    _cameraOff() {
        this.$video.pause();
        setTimeout(() => this.$video.srcObject.getTracks()[0].stop(), 3000);
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