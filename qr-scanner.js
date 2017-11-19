class QrScanner extends XElement {
    onCreate() {
        console.log('scanner init',this)
        this.$video = this.$('video');
        this.$canvas = this.$('canvas');
        this.$context = this.$canvas.getContext('2d');
        this.$video.addEventListener('play', () => this._drawOnCanvas(), false);
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
            .then(stream => this.$video.srcObject = stream)
            .catch(console.error);
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
            // console.log(decoded);
        } catch (e) {
            // no qr-code in this frame
        }
    }
}

