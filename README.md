# qr-scanner

Javascript QR Code Scanner based on [Lazar Lazslos javascript port](https://github.com/LazarSoft/jsqrcode) of [Googles ZXing library](https://github.com/zxing/zxing).

In this library, several improvements have been applied over the original port:

- This library uses an improved binarizer for transforming color input images into black and white images in the preprocessing step 
which makes it more tolerant to shades and reflections on the screen.

- The qr scanner can be configured for better performance on colored QR codes.

- The scanner runs in a WebWorker which keeps the main / UI thread responsive.

- The library was changed to be compatible with Googles closure compiler and compiled to just ~33.7 kb of javascript (~12 kb gzipped).

- Work on higher resolution pictures by default.


## Usage

You can either use the ready to use UI (index.html + qr-scanner.js + qr-scanner-wroker.min.js, based on the lightweight [X-Element frontend framework](https://github.com/nimiq/x-element))
or use just the qr-scanner-wroker.min.js Webworker as follows:

Create a new Worker:
```js
const qrWorker = new Worker('/path/to/qr-scanner-worker.min.js');
```

Send [ImageData](https://developer.mozilla.org/en-US/docs/Web/API/ImageData) to the worker:
```js
qrWorker.postMessage({
    type: 'decode',
    data: imageData
}, [imageData.data.buffer]);
```

Handle the result from the qr worker:
```js
qrWorker.addEventListener('message', event => {
  const type = event.data.type;
  const data = event.data.data;
  if (type === 'qrResult') {
      if (data !== null) {
          alert(data);
      }
  }
});
```

To enable debug mode:
```js
qrWorker.postMessage({
    type: 'setDebug',
    data: true
});
```

To handle the debug image:
```js
qrWorker.addEventListener('message', event => {
  const type = event.data.type;
  const data = event.data.data;
  if (type === 'debugImage') {
      canvasContext.putImageData(data, 0, 0);
  }
});
```

## Building the project
The project is prebuild in qr-scanner-worker.min.js. Building yourself is only neccessary if you wanna change the code in
the /src folder. Nodejs and Java are required prequesites for building.

Install required build packages:
```batch
npm install
```

Building:
```batch
gulp build
```
