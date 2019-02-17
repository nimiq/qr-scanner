import jsQR from '../node_modules/jsqr-es6/dist/jsQR.js';

let inversionAttempts = 'dontInvert';
let grayscaleWeights = {
    // weights for quick luma integer approximation (https://en.wikipedia.org/wiki/YUV#Full_swing_for_BT.601)
    red: 77,
    green: 150,
    blue: 29,
    useIntegerApproximation: true,
};

self.onmessage = event => {
    const type = event['data']['type'];
    const data = event['data']['data'];

    switch (type) {
        case 'decode':
            decode(data);
            break;
        case 'grayscaleWeights':
            setGrayscaleWeights(data);
            break;
        case 'inversionMode':
            setInversionMode(data);
            break;
        case 'close':
            // close after earlier messages in the event loop finished processing
            self.close();
            break;
    }
};

function decode(data) {
    const rgbaData = data['data'];
    const width = data['width'];
    const height = data['height'];
    const result = jsQR(rgbaData, width, height, {
        inversionAttempts: inversionAttempts,
        greyScaleWeights: grayscaleWeights,
    });
    self.postMessage({
        type: 'qrResult',
        data: result? result.data : null,
    });
}

function setGrayscaleWeights(data) {
    // update grayscaleWeights in a closure compiler compatible fashion
    grayscaleWeights.red = data['red'];
    grayscaleWeights.green = data['green'];
    grayscaleWeights.blue = data['blue'];
    grayscaleWeights.useIntegerApproximation = data['useIntegerApproximation'];
}

function setInversionMode(inversionMode) {
    switch (inversionMode) {
        case 'original':
            inversionAttempts = 'dontInvert';
            break;
        case 'invert':
            // TODO mode 'onlyInvert' is currently broken in jsQR. Enable when fixed.
            inversionAttempts = 'attemptBoth';
            break;
        case 'both':
            inversionAttempts = 'attemptBoth';
            break;
        default:
            throw new Error('Invalid inversion mode');
    }
}
