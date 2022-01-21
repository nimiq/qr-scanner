/// <reference types="offscreencanvas" />
export default class QrScanner {
    static readonly DEFAULT_CANVAS_SIZE = 400;
    static readonly NO_QR_CODE_FOUND = "No QR code found";
    static WORKER_PATH: string;
    static hasCamera(): Promise<boolean>;
    static listCameras(requestLabels?: boolean): Promise<Array<QrScanner.Camera>>;
    $video: HTMLVideoElement;
    $canvas: HTMLCanvasElement;
    private readonly _onDecode;
    private _preferredCamera;
    private _scanRegion;
    private _legacyCanvasSize;
    private _qrEnginePromise;
    private _active;
    private _paused;
    private _flashOn;
    constructor(video: HTMLVideoElement, onDecode: (result: string) => void, onDecodeError?: (error: Error | string) => void, calculateScanRegion?: (video: HTMLVideoElement) => QrScanner.ScanRegion, preferredCamera?: QrScanner.FacingMode | QrScanner.DeviceId);
    /** @deprecated */
    constructor(video: HTMLVideoElement, onDecode: (result: string) => void, onDecodeError?: (error: Error | string) => void, canvasSize?: number, preferredCamera?: QrScanner.FacingMode | QrScanner.DeviceId);
    /** @deprecated */
    constructor(video: HTMLVideoElement, onDecode: (result: string) => void, canvasSize?: number);
    hasFlash(): Promise<boolean>;
    isFlashOn(): boolean;
    toggleFlash(): Promise<void>;
    turnFlashOn(): Promise<void>;
    turnFlashOff(): Promise<void>;
    destroy(): void;
    start(): Promise<void>;
    stop(): void;
    pause(stopStreamImmediately?: boolean): Promise<boolean>;
    setCamera(facingModeOrDeviceId: QrScanner.FacingMode | QrScanner.DeviceId): Promise<void>;
    static scanImage(imageOrFileOrBlobOrUrl: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | OffscreenCanvas | ImageBitmap | SVGImageElement | File | Blob | URL | String, scanRegion?: QrScanner.ScanRegion | null, qrEngine?: Worker | BarcodeDetector | Promise<Worker | BarcodeDetector> | null, canvas?: HTMLCanvasElement | null, disallowCanvasResizing?: boolean, alsoTryWithoutScanRegion?: boolean): Promise<string>;
    setGrayscaleWeights(red: number, green: number, blue: number, useIntegerApproximation?: boolean): void;
    setInversionMode(inversionMode: QrScanner.InversionMode): void;
    static createQrEngine(workerPath?: string): Promise<Worker | BarcodeDetector>;
    private _onPlay;
    private _onLoadedMetaData;
    private _onVisibilityChange;
    private _calculateScanRegion;
    private _scanFrame;
    private _onDecodeError;
    private _getCameraStream;
    private _restartVideoStream;
    private _setVideoMirror;
    private _getFacingMode;
    private static _drawToCanvas;
    private static _loadImage;
    private static _awaitImageLoad;
    private static _postWorkerMessage;
}
declare namespace QrScanner {
    interface ScanRegion {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        downScaledWidth?: number;
        downScaledHeight?: number;
    }
    type FacingMode = 'environment' | 'user';
    type DeviceId = string;
    interface Camera {
        id: DeviceId;
        label: string;
    }
    type InversionMode = 'original' | 'invert' | 'both';
}
declare class BarcodeDetector {
    constructor(options?: {
        formats: string[];
    });
    static getSupportedFormats(): Promise<string[]>;
    detect(image: ImageBitmapSource): Promise<Array<{
        rawValue: string;
    }>>;
}
export {};
