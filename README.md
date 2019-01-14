# QR Scanner

Javascript QR Code Scanner based on [Lazar Lazslo's javascript port](https://github.com/LazarSoft/jsqrcode) of [Google's ZXing library](https://github.com/zxing/zxing).

In this library, several improvements have been applied over the original port:

- Lightweight: ~33.7 kB (~12 kB gzipped) minified with Google's closure compiler.
- Improved binarizer which makes it more tolerant to shades and reflections on the screen.
- Can be configured for better performance on colored QR codes.
- Runs in a WebWorker which keeps the main / UI thread responsive.
- Works on higher resolution pictures by default.

The library supports scanning a continuous video stream from a web cam as well as scanning of single images.

## Demo
See https://nimiq.github.io/qr-scanner/demo/

## Usage

### Web Cam Scanning

#### 1. Import the library:
```
<script src="qr-scanner.min.js"></script>
```

#### 2. Create HTML
Create a `<video>` element where the web cam video stream should get rendered: 
```html
<video></video>
```

#### 3. Create a QrScanner Instance
```js
const qrScanner = new QrScanner(videoElem, result => console.log('decoded qr code:', result));
```
As an optional third parameter a specific resolution that should be worked on can be specified. The default is 400.

Note: to read from a Web Cam stream, your page must be served via HTTPS.


### Single Image Scanning

#### 1. Import the library:
```
<script src="qr-scanner.min.js"></script>
```

#### 2. Scan your image
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
