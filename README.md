# qr-scanner

Javascript QR Code Scanner based on [Lazar Lazslo's javascript port](https://github.com/LazarSoft/jsqrcode) of [Google's ZXing library](https://github.com/zxing/zxing).

In this library, several improvements have been applied over the original port:

- Lightweight: ~33.7 kB (~12 kB gzipped) minified with Google's closure compiler.

- Improved binarizer which makes it more tolerant to shades and reflections on the screen.

- Can be configured for better performance on colored QR codes.

- Runs in a WebWorker which keeps the main / UI thread responsive.

- Works on higher resolution pictures by default.


## Usage

You can either use the ready to use UI (index.html + qr-scanner.js + qr-scanner-worker.min.js, based on the lightweight [X-Element frontend framework](https://github.com/nimiq/x-element))
or use just the qr-scanner-worker.min.js Webworker as follows:

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

Change the weights for red, green and blue in the grayscale computation to improve contrast for QR codes of a
specific color:

```js
qrWorker.postMessage({
    type: 'grayscaleWeights',
    data: {
        red: redWeight,
        green: greenWeight,
        blue: blueWeight
    }
});
```

## Building the project
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
