# QR Scanner

Javascript QR Code Scanner based on [Lazar Lazslo's javascript port](https://github.com/LazarSoft/jsqrcode) of [Google's ZXing library](https://github.com/zxing/zxing).

In this library, several improvements have been applied over the original port:

- Lightweight: ~33.7 kB (~12 kB gzipped) minified with Google's closure compiler.
- Improved binarizer which makes it more tolerant to shades and reflections on the screen.
- Can be configured for better performance on colored QR codes.
- Runs in a WebWorker which keeps the main / UI thread responsive.
- Works on higher resolution pictures by default.

The library supports scanning a continuous video stream from a web cam as well as scanning of single images.

The development of this library is sponsored by [nimiq](https://www.nimiq.com), the world's first browser based blockchain.

[<img src="https://ucb689f1ef4767d4abfb0925e185.previews.dropboxusercontent.com/p/thumb/AAVEuJzxQiFQdRZzaAqyBe7DbR9bX8SSncfAYCBCf4p5ryvIoabV0kBBDE2QQU1xqiZNQsl3JH4mm6K5hOY77dLpx5gsTU5FMsCEYqJiXb-FZg68EjOgMWR5OW0ux2AbUuGqQHebrYg0jwUbaeZt9R8IAKWMIBF99TSdAXTwakC0rnk6KamIGaqbVio80xvAcY1vOeZctnNnjW4nYhUIjYyCsDPhgEbPhBcrVVLJhqoygm9CUgFbXBcDLAdmgLKQSTjeDyR553GV-lqLm0b1Hxw9/p.png?size_mode=5" alt="nimiq.com" width="250">](https://nimiq.com)


## Demo
See https://nimiq.github.io/qr-scanner/demo/

## Installation

To install via npm:
```bash
npm install --safe qr-scanner
```
To install via yarn:
```bash
yarn add qr-scanner
```
Or simply copy `qr-scanner.min.js` and `qr-scanner-worker.min.js` to your project.

## Setup

The QR Scanner consists of two files.

`qr-scanner.min.js` is the main API as an es6 module and can be imported as follows:
```js
import QrScanner from 'path/to/qr-scanner.min.js'; // if using plain es6 import
import QrScanner from 'qr-scanner'; // if installed via package and bundling with webpack or rollup
```
This requires the importing script to also be an es6 module or a module script tag, e.g.:
```html
<script type="module">
    import QrScanner from 'path/to/qr-scanner.min.js';
    // do something with QrScanner
</script>
```

`qr-scanner-worker.min.js` is a plain Javascript file for the separate worker thread and needs to be copied over to your project. You should then point `QrScanner.WORKER_PATH` to where you put that file:
```js
QrScanner.WORKER_PATH = 'path/to/qr-scanner-worker.min.js';
```

If you're using webpack to bundle your project, the file loader might be interesting for you, to automatically copy the worker into your build:
```js
import QrScannerWorkerPath from '!!file-loader!./node_modules/qr-scanner/qr-scanner-worker.min.js';
QrScannerLib.WORKER_PATH = QrScannerWorkerPath;
```

## Usage

### Web Cam Scanning

#### 1. Create HTML
Create a `<video>` element where the web cam video stream should get rendered: 
```html
<video></video>
```

#### 2. Create a QrScanner Instance
```js
const qrScanner = new QrScanner(videoElem, result => console.log('decoded qr code:', result));
```
As an optional third parameter a specific resolution that should be worked on can be specified. The default is 400.

Note: to read from a Web Cam stream, your page must be served via HTTPS.


### Single Image Scanning

```js
QrScanner.scanImage(image)
    .then(result => console.log(result))
    .catch(error => console.log(error || 'No QR code found.'));
```
Supported image sources are:
[HTMLImageElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement),
[SVGImageElement](https://developer.mozilla.org/en-US/docs/Web/API/SVGImageElement),
[HTMLVideoElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement),
[HTMLCanvasElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement),
[ImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap),
[OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas),
[File](https://developer.mozilla.org/en-US/docs/Web/API/File) / [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob)


### Color Inverted Mode
The scanner by default scans for dark QR codes on a bright background. You can change this behavior to scan for bright QR codes on dark background or for both at the same time:
```js
qrScanner.setInversionMode(inversionMode);
```
Where `inversionMode` can be `original`, `invert` or `both`.
The default for web cam scanning is `original` and for single image scanning `both`.

### Color Correction
Change the weights for red, green and blue in the grayscale computation to improve contrast for QR codes of a
specific color:

```js
qrScanner.setGrayscaleWeights(red, green, blue);
```
Where `red`, `green` and `blue` must sum up to 256.

### Clean Up

You can destroy the QR scanner if you don't need it anymore:
```js
qrScanner.destroy();
qrScanner = null;
```
This will stop the camera stream and web worker and cleans up event listeners.

## Build the project
The project is prebuild in qr-scanner.min.js in combination with qr-scanner-worker.min.js. Building yourself is only necessary if you want to change the code in
the /src folder. NodeJs and Java are required for building.

Install required build packages:
```batch
npm install
```

Building:
```batch
npm run build
```

## Debug Mode

To enable debug mode:
```js
qrScanner._qrWorker.postMessage({
    type: 'setDebug',
    data: true
});
```

To handle the debug image:
```js
qrScanner._qrWorker.addEventListener('message', event => {
  if (event.data.type === 'debugImage') {
      canvasContext.putImageData(event.data.data, 0, 0);
  }
});
```
