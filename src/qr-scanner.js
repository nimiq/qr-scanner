class XQrScanner extends XElement {
    onCreate() {
        const video = this.$('video');
        const canvas = this.$('canvas');
        this._scanner = new QrScannerLib(video, canvas, this._onDecode.bind(this));
    }

    _onDecode(data) {
        this.fire('x-decoded', data);
    }

    set active(active) {
        this._scanner.active = active;
    }

    setGrayscaleWeights(red, green, blue) {
        this._scanner.setGrayscaleWeights(red, green, blue);
    }
}