class QrScanner extends XElement {
    onCreate() {
        this.$video = this.$('video');
        this.$canvas = this.$('canvas');
        this.$context = this.$canvas.getContext('2d');
        this.$video.addEventListener('play', () => this._drawOnCanvas(), false);
    }

    _drawOnCanvas() {
        if (this.$video.paused || this.$video.ended) return false;
        this.$context.drawImage(this.$video, -(this.$video.clientWidth - 320) / 2, -(this.$video.clientHeight - 320) / 2);
        this._decode();
        requestAnimationFrame(() => this._drawOnCanvas());
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

    _cameraOn() {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
            .then(stream => {
                this.$video.srcObject = stream
            })
            .catch(console.error);
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