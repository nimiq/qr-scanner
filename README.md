# qr-scanner

Javascript QR Code Scanner based on [Lazar Lazslo's javascript port](https://github.com/LazarSoft/jsqrcode) of [Google's ZXing library](https://github.com/zxing/zxing).

In this library, several improvements have been applied over the original port:

- Lightweight: ~33.7 kB (~12 kB gzipped) minified with Google's closure compiler.

- Improved binarizer which makes it more tolerant to shades and reflections on the screen.

- Can be configured for better performance on colored QR codes.

- Runs in a WebWorker which keeps the main / UI thread responsive.

- Works on higher resolution pictures by default.


## Usage

### Plain 

#### 1. Import the library:
```
<script src="qr-scanner-lib.min.js"></script>
```

#### 2. Create HTML
You need both a `<video>` and a `<canvas>` element: 
```html
<video></video>
<canvas></canvas>

```

#### 3. Instanciate Library
```js
const qrScanner = new QrScannerLib(videoElem, canvasElem, (text) =>{
  console.log('decoded qr code:', text)
})
```

### As X-Element
Alternatively you can use this library as an [X-Element](https://github.com/nimiq/x-element)):

#### 1. Import the element:
```
<script src="qr-scanner.min.js"></script>
```

#### 2. Create HTML
You need both a `<video>` and a `<canvas>` element: 
```html
<x-qr-scanner>
    <video muted autoplay playsinline></video>
    <canvas></canvas>
</x-qr-scanner>

```

#### 3. Instanciate Library
```js
const qrScanner = new QrScanner()
```


### Color Correction
Change the weights for red, green and blue in the grayscale computation to improve contrast for QR codes of a
specific color:

```js
qrScanner.setGrayscaleWeights(red, green, blue)
```

## Build the project
The project is prebuild in qr-scanner-worker.min.js. Building yourself is only neccessary if you want to change the code in
the /src folder. Nodejs and Java are required for building.

Install required build packages:
```batch
npm install
```

Building:
```batch
gulp build
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
  const type = event.data.type;
  const data = event.data.data;
  if (type === 'debugImage') {
      canvasContext.putImageData(data, 0, 0);
  }
});
```
