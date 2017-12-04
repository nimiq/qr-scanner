self.onmessage = event => {
    const type = event.data.type;
    const data = event.data.data;
    if (type === 'setDebug') {
        qrcode.debug = data;
    } else if (type === 'decode') {
        let result = null;
        try {
            result = qrcode.decode(data);
        } catch(e) {
            if (!e.message.startsWith('QR Error')) {
                throw e; // some unexpected error
            }
            // console.log(e);
        } finally {
            self.postMessage({
                type: 'qrResult',
                data: result
            });
        }
    }
};


function sendDebugImage(debugImage) {
    self.postMessage({
        type: 'debugImage',
        data: debugImage
    }, [debugImage.data.buffer]);
}