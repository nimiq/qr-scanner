self.onmessage = event => {
    const type = event.data.type;
    const data = event.data.data;

    switch (type) {
        case 'setDebug':
            qrcode.debug = data;
            break;
        case 'decode':
            decode(data);
            break;
        case 'grayscaleWeights':
            setGrayscaleWeights(data);
            break;
    }
};

function decode(data) {
    let result = null;
    try {
        result = qrcode.decode(data);
    } catch (e) {
        if (!e.message.startsWith('QR Error')) 
            throw e; // some unexpected error
    } finally {
        self.postMessage({
            type: 'qrResult',
            data: result
        });
    }
}

function setGrayscaleWeights(data) {
    if (data.red + data.green + data.blue !== 256) 
        throw new Error('Weights have to sum up to 256');
    qrcode.grayscaleWeights = data;
}

function sendDebugImage(debugImage) {
    self.postMessage({
        type: 'debugImage',
        data: debugImage
    }, [debugImage.data.buffer]);
}