<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>QR Scanner Demo</title>
</head>
<body>
<h1>Scan from WebCam:</h1>
<div id="video-container">
    <video id="qr-video"></video>
</div>
<div>
    <label>
        Highlight Style
        <select id="scan-region-highlight-style-select">
            <option value="default-style">Default style</option>
            <option value="example-style-1">Example custom style 1</option>
            <option value="example-style-2">Example custom style 2</option>
        </select>
    </label>
    <label>
        <input id="show-scan-region" type="checkbox">
        Show scan region canvas
    </label>
</div>
<div>
    <select id="inversion-mode-select">
        <option value="original">Scan original (dark QR code on bright background)</option>
        <option value="invert">Scan with inverted colors (bright QR code on dark background)</option>
        <option value="both">Scan both</option>
    </select>
    <br>
</div>
<b>Device has camera: </b>
<span id="cam-has-camera"></span>
<br>
<div>
    <b>Preferred camera:</b>
    <select id="cam-list">
        <option value="environment" selected>Environment Facing (default)</option>
        <option value="user">User Facing</option>
    </select>
</div>
<b>Camera has flash: </b>
<span id="cam-has-flash"></span>
<div>
    <button id="flash-toggle">📸 Flash: <span id="flash-state">off</span></button>
</div>
<br>
<b>Detected QR code: </b>
<span id="cam-qr-result">None</span>
<br>
<b>Last detected at: </b>
<span id="cam-qr-result-timestamp"></span>
<br>
<button id="start-button">Start</button>
<button id="stop-button">Stop</button>
<hr>

<h1>Scan from File:</h1>
<input type="file" id="file-selector">
<b>Detected QR code: </b>
<span id="file-qr-result">None</span>

<!--<script src="../qr-scanner.umd.min.js"></script>-->
<!--<script src="../qr-scanner.legacy.min.js"></script>-->
<script type="module">
    import QrScanner from "../qr-scanner.min.js";

    const video = document.getElementById('qr-video');
    const videoContainer = document.getElementById('video-container');
    const camHasCamera = document.getElementById('cam-has-camera');
    const camList = document.getElementById('cam-list');
    const camHasFlash = document.getElementById('cam-has-flash');
    const flashToggle = document.getElementById('flash-toggle');
    const flashState = document.getElementById('flash-state');
    const camQrResult = document.getElementById('cam-qr-result');
    const camQrResultTimestamp = document.getElementById('cam-qr-result-timestamp');
    const fileSelector = document.getElementById('file-selector');
    const fileQrResult = document.getElementById('file-qr-result');

    function setResult(label, result) {
        console.log(result.data);
        label.textContent = result.data;
        camQrResultTimestamp.textContent = new Date().toString();
        label.style.color = 'teal';
        clearTimeout(label.highlightTimeout);
        label.highlightTimeout = setTimeout(() => label.style.color = 'inherit', 100);
    }

    // ####### Web Cam Scanning #######

    const scanner = new QrScanner(video, result => setResult(camQrResult, result), {
        onDecodeError: error => {
            camQrResult.textContent = error;
            camQrResult.style.color = 'inherit';
        },
        highlightScanRegion: true,
        highlightCodeOutline: true,
    });

    const updateFlashAvailability = () => {
        scanner.hasFlash().then(hasFlash => {
            camHasFlash.textContent = hasFlash;
            flashToggle.style.display = hasFlash ? 'inline-block' : 'none';
        });
    };

    scanner.start().then(() => {
        updateFlashAvailability();
        // List cameras after the scanner started to avoid listCamera's stream and the scanner's stream being requested
        // at the same time which can result in listCamera's unconstrained stream also being offered to the scanner.
        // Note that we can also start the scanner after listCameras, we just have it this way around in the demo to
        // start the scanner earlier.
        QrScanner.listCameras(true).then(cameras => cameras.forEach(camera => {
            const option = document.createElement('option');
            option.value = camera.id;
            option.text = camera.label;
            camList.add(option);
        }));
    });

    QrScanner.hasCamera().then(hasCamera => camHasCamera.textContent = hasCamera);

    // for debugging
    window.scanner = scanner;

    document.getElementById('scan-region-highlight-style-select').addEventListener('change', (e) => {
        videoContainer.className = e.target.value;
        scanner._updateOverlay(); // reposition the highlight because style 2 sets position: relative
    });

    document.getElementById('show-scan-region').addEventListener('change', (e) => {
        const input = e.target;
        const label = input.parentNode;
        label.parentNode.insertBefore(scanner.$canvas, label.nextSibling);
        scanner.$canvas.style.display = input.checked ? 'block' : 'none';
    });

    document.getElementById('inversion-mode-select').addEventListener('change', event => {
        scanner.setInversionMode(event.target.value);
    });

    camList.addEventListener('change', event => {
        scanner.setCamera(event.target.value).then(updateFlashAvailability);
    });

    flashToggle.addEventListener('click', () => {
        scanner.toggleFlash().then(() => flashState.textContent = scanner.isFlashOn() ? 'on' : 'off');
    });

    document.getElementById('start-button').addEventListener('click', () => {
        scanner.start();
    });

    document.getElementById('stop-button').addEventListener('click', () => {
        scanner.stop();
    });

    // ####### File Scanning #######

    fileSelector.addEventListener('change', event => {
        const file = fileSelector.files[0];
        if (!file) {
            return;
        }
        QrScanner.scanImage(file, { returnDetailedScanResult: true })
            .then(result => setResult(fileQrResult, result))
            .catch(e => setResult(fileQrResult, { data: e || 'No QR code found.' }));
    });
</script>

<style>
    div {
        margin-bottom: 16px;
    }

    #video-container {
        line-height: 0;
    }

    #video-container.example-style-1 .scan-region-highlight-svg,
    #video-container.example-style-1 .code-outline-highlight {
        stroke: #64a2f3 !important;
    }

    #video-container.example-style-2 {
        position: relative;
        width: max-content;
        height: max-content;
        overflow: hidden;
    }
    #video-container.example-style-2 .scan-region-highlight {
        border-radius: 30px;
        outline: rgba(0, 0, 0, .25) solid 50vmax;
    }
    #video-container.example-style-2 .scan-region-highlight-svg {
        display: none;
    }
    #video-container.example-style-2 .code-outline-highlight {
        stroke: rgba(255, 255, 255, .5) !important;
        stroke-width: 15 !important;
        stroke-dasharray: none !important;
    }

    #flash-toggle {
        display: none;
    }

    hr {
        margin-top: 32px;
    }
    input[type="file"] {
        display: block;
        margin-bottom: 16px;
    }
</style>
</body>
</html>
