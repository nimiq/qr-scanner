# QR Scanner

Javascript QR Code Scanner based on [Cosmo Wolfe's javascript port](https://github.com/cozmo/jsqr) of [Google's ZXing library](https://github.com/zxing/zxing).

In this library, several improvements have been applied over the original port:

- Lightweight: ~48.7 kB (~12.4 kB gzipped) minified with Google's closure compiler.
- Improved performance and reduced memory footprint.
- Runs in a WebWorker which keeps the main / UI thread responsive.
- Can be configured for better performance on colored QR codes.

According to [our benchmarking](https://github.com/danimoh/qr-scanner-benchmark) this project's scanner engine's detection rate is about 2-3 times (and up to 8 times) as high as the one of the most popular javascript QR scanner library [LazarSoft/jsqrcode](https://github.com/LazarSoft/jsqrcode). Also the other library oftentimes misreads the content of QR codes, while for this project no misreads occurred in the benchmarking.

The library supports scanning a continuous video stream from a web cam as well as scanning of single images.

The development of this library is sponsored by [nimiq](https://www.nimiq.com), world's first browser based blockchain.

[<img src="https://nimiq.github.io/qr-scanner/nimiq_logo_rgb_horizontal.svg" alt="nimiq.com" width="250">](https://nimiq.com)


## Demo
See https://nimiq.github.io/qr-scanner/demo/

## Installation

To install via npm:
```bash
npm install --save qr-scanner
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
import QrScanner from 'qr-scanner'; // if installed via package and bundling with a bundler like webpack or rollup
```
This requires the importing script to also be an es6 module or a module script tag, e.g.:
```html
<script type="module">
    import QrScanner from 'path/to/qr-scanner.min.js';
    // do something with QrScanner
</script>
```

`qr-scanner-worker.min.js` is a plain Javascript file for the separate worker thread and needs to be copied over to your project. You should then point `QrScanner.WORKER_PATH` to the location where it will be hosted:
```js
QrScanner.WORKER_PATH = 'path/to/qr-scanner-worker.min.js';
```

### Webpack specific setup

If you're using [Webpack](https://webpack.js.org/) to bundle your project, the [file-loader](https://webpack.js.org/loaders/file-loader/) or [raw-loader](https://webpack.js.org/loaders/raw-loader/) might be interesting for you for handling the `qr-scanner-worker.min.js` dependency. Which one to choose depends on your use case.

#### Using file-loader

The `file-loader` automatically copies the worker script into your build and provides the path where it will be located in the build. At runtime, the worker will then be lazy-loaded from there when needed. Due to its ability to lazy-load the worker, using the `file-loader` is the preferred approach if you do not expect the QR scanner to be used every time a user uses your app or if the QR scanner is not launched right after loading the app.

You can add the `file-loader` to your project via:
```bash
npm install --save-dev file-loader
```

You can then use it to copy the worker file and obtain the `WORKER_PATH`:
```js
import QrScannerWorkerPath from '!!file-loader!./node_modules/qr-scanner/qr-scanner-worker.min.js';
QrScannerLib.WORKER_PATH = QrScannerWorkerPath;
```

Note that the path to the worker file has to be set relatively to the source file where you use it. For example, if your source file using the `QrScanner` sits in `/src/components`, the correct import would be `import QrScannerWorkerPath from '!!file-loader!../../node_modules/qr-scanner/qr-scanner-worker.min.js';`.

#### Using raw-loader

The `raw-loader` bundles the worker as string into your build, thus no separate file gets generated in your build output. While this simplifies the build output and avoids an additional network request, it increases your bundle size and removes the ability to lazy-load the worker file only when needed.

You can add the `raw-loader` to your project via:
```bash
npm install --save-dev raw-loader
```

You can then use it to load the worker file and set the `WORKER_PATH`:
```js
import qrScannerWorkerSource from '!!raw-loader!./node_modules/qr-scanner/qr-scanner-worker.min.js';
QrScanner.WORKER_PATH = URL.createObjectURL(new Blob([qrScannerWorkerSource]));
```

Note that the path to the worker file has to be set relatively to the source file where you use it. For example, if your source file using the `QrScanner` sits in `/src/components`, the correct import would be `import qrScannerWorkerSource from '!!raw-loader!../../node_modules/qr-scanner/qr-scanner-worker.min.js';`.

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
As an optional third parameter an error handler to be invoked on decoding errors can be specified. The default is `QrScanner._onDecodeError`.

As an optional fourth parameter a specific resolution that should be worked on can be specified. The default is 400.

#### 3. Start scanning
```js
qrScanner.start();
```

Call it when you're ready to scan, for example on a button click or directly on page load.
It will prompt the user for permission to use a camera.
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
qrScanner.setGrayscaleWeights(red, green, blue, useIntegerApproximation = true);
```
Where `red`, `green` and `blue` should sum up to 256 if `useIntegerApproximation === true` and `1` otherwise. By default, [these](https://en.wikipedia.org/wiki/YUV#Full_swing_for_BT.601) values are used.

### Clean Up

You can destroy the QR scanner if you don't need it anymore:
```js
qrScanner.destroy();
qrScanner = null;
```
This will stop the camera stream and web worker and cleans up event listeners.

## Build the project
The project is prebuild in qr-scanner.min.js in combination with qr-scanner-worker.min.js. Building yourself is only necessary if you want to change the code in
the /src folder. NodeJs is required for building.

Install required build packages:
```batch
npm install
```

Building:
```batch
npm run build
```
