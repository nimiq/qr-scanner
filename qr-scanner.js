class QrScanner extends XElement {
    onCreate() {
        this.$video = this.$('video');
        this.$canvas = this.$('canvas');
        this.$context = this.$canvas.getContext('2d');
        this._sourceRectSize = 0;
        window.addEventListener('resize', () => this._updateSourceRect());
        this.$video.addEventListener('canplay', () => this._updateSourceRect());
        this.$video.addEventListener('play', () => this._scanFrame(), false);
    }

    _updateSourceRect() {
        var smallestDimension = Math.min(this.$video.videoWidth, this.$video.videoHeight/*,
            // visible part of the video
            this.$el.offsetWidth/this.$video.offsetWidth * this.$video.videoWidth,
            this.$el.offsetHeight/this.$video.offsetHeight * this.$video.videoHeight,
            window.innerWidth/this.$video.offsetWidth * this.$video.videoWidth,
            window.innerHeight/this.$video.offsetHeight * this.$video.videoHeight*/);
        this._sourceRectSize = Math.round(3/4 * smallestDimension);
    }

    _scanFrame() {
        if (this.$video.paused || this.$video.ended) return false;
        this.$context.drawImage(this.$video, (this.$video.videoWidth - this._sourceRectSize) / 2,
            (this.$video.videoHeight - this._sourceRectSize) / 2, this._sourceRectSize, this._sourceRectSize,
            0, 0, 512, 512);
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
                width: 768,
                height: 1024
            },
            {
                facingMode: "environment",
                width: 1024,
                height: 768
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