# QR Scanner

Javascript QR Code Scanner based on [Cosmo Wolfe's javascript port](https://github.com/cozmo/jsqr) of [Google's ZXing library](https://github.com/zxing/zxing).

In this library, several improvements have been applied over the original port:

- Web cam scanning support out of the box
- Uses the browser's native [BarcodeDetector](https://web.dev/shape-detection/) [if available](https://github.com/WICG/shape-detection-api#overview)
- Lightweight: ~59.3 kB (~16.3 kB gzipped) minified with Google's closure compiler. If the native `BarcodeDetector` is available, only ~15.3 kB (~5.6 kB gzipped) are loaded.
- Improved performance and reduced memory footprint.
- Runs in a WebWorker which keeps the main / UI thread responsive.
- Can be configured for better performance on colored QR codes.

According to [our benchmarking](https://github.com/danimoh/qr-scanner-benchmark) this project's scanner engine's detection rate is about 2-3 times (and up to 8 times) as high as the one of the most popular javascript QR scanner library [LazarSoft/jsqrcode](https://github.com/LazarSoft/jsqrcode). Also the other library oftentimes misreads the content of QR codes, while for this project no misreads occurred in the benchmarking.

The library supports scanning a continuous video stream from a web cam as well as scanning of single images.

The development of this library is sponsored by [nimiq](https://www.nimiq.com), world's first browser based blockchain.

[<img src="https://nimiq.github.io/qr-scanner/nimiq_logo_rgb_horizontal.svg" alt="nimiq.com" width="250">](https://nimiq.com)


## Demo
See [https://nimiq.github.io/qr-scanner/demo/](https://nimiq.github.io/qr-scanner/demo/)

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

The QR Scanner consists of two main files. `qr-scanner.min.js` is the main API file which loads the worker script `qr-scanner-worker.min.js` via a dynamic import, only if needed. If you are not using a bundler like Rollup or Webpack that handles dynamic imports automatically, you might have to copy `qr-scanner-worker.min.js` over to your dist, next to `qr-scanner.min.js` or next to the script into which you're bundling `qr-scanner.min.js`.

`qr-scanner.min.js` is an es6 module and can be imported as follows:
```js
import QrScanner from 'path/to/qr-scanner.min.js'; // if using plain es6 import
import QrScanner from 'qr-scanner'; // if installed via package and bundling with a module bundler like webpack or rollup
```
This requires the importing script to also be an es6 module or a module script tag, e.g.:
```html
<script type="module">
    import QrScanner from 'path/to/qr-scanner.min.js';
    // do something with QrScanner
</script>
```

If your project is not based on es6 modules you can
- use a [dynamic import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import#Dynamic_Imports) to import the es6 module:
```js
import('path/to/qr-scanner.min.js').then((module) => {
    const QrScanner = module.default;
    // do something with QrScanner
});
```
- use the [UMD build](https://github.com/umdjs/umd) `qr-scanner.umd.min.js` for direct usage as non-module script
```html
<script src="path/to/qr-scanner.umd.min.js"></script>
<script>
    // do something with QrScanner
</script>
```
- bundle `qr-scanner.umd.min.js` directly with your non-module code with tools like [gulp](https://gulpjs.com/) or [grunt](https://gruntjs.com/).
- bundle the lib with `require` based bundlers like [browserify](https://browserify.org/):
```js
const QrScanner = require('qr-scanner'); // if installed via package
const QrScanner = require('path/to/qr-scanner.umd.min.js'); // if not installed via package
// do something with QrScanner
```

This library uses ECMAScript 2017 features like `async` functions. If you need to support old browsers, you can use `qr-scanner.legacy.min.js`, which is ECMAScript 2015 (ES6) compatible. It's a UMD build and can be used as a replacement for `qr-scanner.umd.min.js`, see above. Note, that the legacy build is larger as it includes some polyfills and, to support browsers that don't support dynamic imports, inlines the worker script which however would be needed to be loaded in legacy browsers anyway. You will likely not need to use the legacy build though, as general browser support is already very good for the regular build. Especially if you want to scan from the device's camera, camera support by the browser is the stricter restriction.

## Usage

### Web Cam Scanning

#### 1. Create HTML
Create a `<video>` element where the web cam video stream should get rendered: 
```html
<video></video>
```

#### 2. Create a QrScanner Instance
```js
// To enforce the use of the new api with detailed scan results, call the constructor with an options object, see below.
const qrScanner = new QrScanner(
    videoElem,
    result => console.log('decoded qr code:', result),
    { /* your options or returnDetailedScanResult: true if you're not specifying any other options */ },
);

// For backwards compatibility, omitting the options object will currently use the old api, returning scan results as
// simple strings. This old api will be removed in the next major release, by which point the options object is then
// also not required anymore to enable the new api.
const qrScanner = new QrScanner(
    videoElem,
    result => console.log('decoded qr code:', result),
    // No options provided. This will use the old api and is deprecated in the current version until next major version.
);
```

As an optional third parameter an options object can be provided.
Supported options are:

| Option | Description |
|---|---|
| `onDecodeError` | Handler to be invoked on decoding errors. The default is `QrScanner._onDecodeError`. |
| `preferredCamera` | Preference for the camera to be used. The preference can be either a device id as returned by `listCameras` or a facing mode specified as `'environment'` or `'user'`. The default is `'environment'`. Note that there is no guarantee that the preference can actually be fulfilled. |
| `maxScansPerSecond` | This option can be used to throttle the scans for less battery consumption. The default is 25. [If supported by the browser](https://caniuse.com/mdn-api_htmlvideoelement_requestvideoframecallback), the scan rate is never higher than the camera's frame rate to avoid unnecessary duplicate scans on the same frame. |
| `calculateScanRegion` | A method that determines a region to which scanning should be restricted as a performance improvement. This region can optionally also be scaled down before performing the scan as an additional performance improvement. The region is specified as `x`, `y`, `width` and `height`; the dimensions for the downscaled region as `downScaledWidth` and `downScaledHeight`. Note that the aspect ratio between `width` and `height` and `downScaledWidth` and `downScaledHeight` should remain the same. By default, the scan region is restricted to a centered square of two thirds of the video width or height, whichever is smaller, and scaled down to a 400x400 square. |
| `highlightScanRegion` | Set this option to `true` for rendering an outline around the scan region on the video stream. This uses an absolutely positioned `div` that covers the scan region. This `div` can either be supplied as option `overlay`, see below, or automatically created and then accessed via `qrScanner.$overlay`. It can be freely styled via CSS, e.g. by setting an outline, border, background color, etc. See the [demo](https://nimiq.github.io/qr-scanner/demo/) for examples. |
| `highlightCodeOutline` | Set this option to `true` for rendering an outline around detected QR codes. This uses an absolutely positioned `div` on which an SVG for rendering the outline will be placed. This `div` can either be supplied as option `overlay`, see below, or be accessed via `qrScanner.$overlay`. The SVG can be freely styled via CSS, e.g. by setting the fill color, stroke color, stroke width, etc. See the [demo](https://nimiq.github.io/qr-scanner/demo/) for examples. For more special needs, you can also use the `cornerPoints` directly, see below, for rendering an outline or the points yourself. |
| `overlay` | A custom `div` that can be supplied for use for `highlightScanRegion` and `highlightCodeOutline`. The `div` should be a sibling of `videoElem` in the DOM. If this option is supplied, the default styles for `highlightCodeOutline` are not applied as the expectation is that the element already has some custom style applied to it. |
| `returnDetailedScanResult` | Enforce reporting detailed scan results, see below. |

To use the default value for an option, omit it or supply `undefined`.

Results passed to the callback depend on whether an options object was provided:
- If no options object was provided, the result is a string with the read QR code's content. The simple string return type is for backwards compatibility, is now deprecated and will be removed in the future.
- If an options object was provided the result is an object with properties `data` which is the read QR code's string content and `cornerPoints` which are the corner points of the read QR code's outline on the camera stream.

To avoid usage of the deprecated api if you're not supplying any other options, you can supply `{ returnDetailedScanResult: true }` to enable the new api and get the detailed scan result.

#### 3. Start scanning
```js
qrScanner.start();
```

Call it when you're ready to scan, for example on a button click or directly on page load.
It will prompt the user for permission to use a camera.
Note: to read from a Web Cam stream, your page must be served via HTTPS.

#### 4. Stop scanning
```js
qrScanner.stop();
```

If you want, you can stop scanning anytime and resume it by calling `start()` again.

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
[File](https://developer.mozilla.org/en-US/docs/Web/API/File) / [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob),
[Data URIs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs),
URLs pointing to an image (if they are on the same origin or [CORS enabled](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image))

As an optional second parameter an options object can be provided.
Supported options are:

| Option | Description |
|---|---|
| `scanRegion` | A region defined by `x`, `y`, `width` and `height` to which the search for a QR code should be restricted. As a performance improvement this region can be scaled down before performing the scan by providing a `downScaledWidth` and `downScaledHeight`. Note that the aspect ratio between `width` and `height` and `downScaledWidth` and `downScaledHeight` should remain the same. By default, the region spans the whole image and is not scaled down. |
| `qrEngine` | A manually created QR scanner engine instance to be reused. This improves performance if you're scanning a lot of images. An engine can be manually created via `QrScanner.createQrEngine(QrScanner.WORKER_PATH)`. By default, no engine is reused for single image scanning. |
| `canvas` | A manually created canvas to be reused. This improves performance if you're scanning a lot of images. A canvas can be manually created via a `<canvas>` tag in your markup or `document.createElement('canvas')`. By default, no canvas is reused for single image scanning. |
| `disallowCanvasResizing` | Request a provided canvas for reuse to not be resized, irrespective of the source image or source region dimensions. Note that the canvas and source region should have the same aspect ratio to avoid that the image to scan gets distorted which could make detecting QR codes impossible. By default, the canvas size is adapted to the scan region dimensions or down scaled scan region for single image scanning. |
| `alsoTryWithoutScanRegion` | Request a second scan on the entire image if a `scanRegion` was provided and no QR code was found within that region. By default, no second scan is attempted. |
| `returnDetailedScanResult` | Enforce reporting detailed scan results, see below. |

To use the default value for an option, omit it or supply `undefined`.

Returned results depend on whether an options object was provided:
- If no options object was provided, the result is a string with the read QR code's content. The simple string return type is for backwards compatibility, is now deprecated and will be removed in the future.
- If an options object was provided the result is an object with properties `data` which is the read QR code's string content and `cornerPoints` which are the corner points of the read QR code's outline on the camera stream.

To avoid usage of the deprecated api if you're not supplying any other options, you can supply `{ returnDetailedScanResult: true }` to enable the new api and get the detailed scan result.

If no QR code could be read, `scanImage` throws.

### Checking for Camera availability

This library provides a utility method for checking whether the device has a camera. This can be useful for determining whether to offer the QR web cam scanning functionality to a user.
```js
QrScanner.hasCamera(); // async
```

### Getting the list of available Cameras

This library provides a utility method for getting a list of the device's cameras, defined via their `id` and `label`. This can be useful for letting a user choose a specific camera to use.

You can optionally request the camera's labels. Note that this however requires the user's permission to access the cameras, which he will be asked for if not granted already. If not specifically requested, device labels are determined on a best effort basis, i.e. actual labels are returned if permissions were already granted and fallback labels otherwise. If you want to request camera labels, it's recommendable to call `listCameras` after a QrScanner instance was successfully started, as by then the user will already have given his permission.
```js
QrScanner.listCameras(); // async; without requesting camera labels
QrScanner.listCameras(true); // async; requesting camera labels, potentially asking the user for permission
```

### Specifying which camera to use

You can change the preferred camera to be used. The preference can be either a device id as returned by `listCameras` or a facing mode specified as `'environment'` or `'user'`. Note that there is no guarantee that the preference can actually be fulfilled.

```js
qrScanner.setCamera(facingModeOrDeviceId); // async
```

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

### Flashlight support

On supported browsers, you can check whether the currently used camera has a flash and turn it on or off. Note that hasFlash should be called after the scanner was successfully started to avoid the need to open a temporary camera stream just to query whether it has flash support, potentially asking the user for camera access.

```js
qrScanner.hasFlash(); // check whether the browser and used camera support turning the flash on; async.
qrScanner.isFlashOn(); // check whether the flash is on
qrScanner.turnFlashOn(); // turn the flash on if supported; async
qrScanner.turnFlashOff(); // turn the flash off if supported; async
qrScanner.toggleFlash(); // toggle the flash if supported; async.
```

### Clean Up

You can destroy the QR scanner if you don't need it anymore:
```js
qrScanner.destroy();
qrScanner = null;
```
This will stop the camera stream and web worker and cleans up event listeners.
The QR scanner will be dysfunctional after it has been destroyed.

## Build the project
The project is prebuild in qr-scanner.min.js in combination with qr-scanner-worker.min.js. Building yourself is only necessary if you want to change the code in
the /src folder. NodeJs is required for building.

Install required build packages:
```batch
yarn
```

Building:
```batch
yarn build
```
