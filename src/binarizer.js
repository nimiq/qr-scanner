// Implementation taken from https://github.com/nimiq-design/nimiqode and follows the idea of
// https://github.com/zxing/zxing/blob/master/core/src/main/java/com/google/zxing/common/HybridBinarizer.java


class Binarizer {
    static calculateRequiredBufferSize(imageWidth, imageHeight) {
        // memory for threshold for every block
        const [, blockCountX, blockCountY] = Binarizer._calculateBlockSize(imageWidth, imageHeight);
        return blockCountX * blockCountY;
    }

    static _calculateBlockSize(imageWidth, imageHeight) {
        const blockSize = Math.max(
            Math.floor(Math.min(imageWidth, imageHeight) / Binarizer.TARGET_BLOCK_COUNT_ALONG_SHORTER_SIDE),
            Binarizer.MIN_BLOCK_SIZE
        );

        const blockCountX = Math.ceil(imageWidth / blockSize);
        const blockCountY = Math.ceil(imageHeight / blockSize);
        return [blockSize, blockCountX, blockCountY];
    }

    static binarize(inputGrayscale, imageWidth, imageHeight, outputBinary = inputGrayscale, buffer = null) {
        const [blockSize, blockCountX, blockCountY] =
            Binarizer._calculateBlockSize(imageWidth, imageHeight);
        let blockThresholds;
        if (buffer) {
            if (!(buffer instanceof Uint8ClampedArray) || buffer.byteLength !== blockCountX * blockCountY) {
                throw new Error('QR Error: Illegal Buffer.');
            }
            blockThresholds = buffer;
        } else {
            blockThresholds = new Uint8ClampedArray(blockCountX * blockCountY);
        }
        // calculate the thresholds for the blocks
        for (let blockIndexY=0; blockIndexY < blockCountY; ++blockIndexY) {
            for (let blockIndexX=0; blockIndexX < blockCountX; ++blockIndexX) {
                const threshold = Binarizer._calculateBlockThreshold(inputGrayscale, imageWidth, imageHeight,
                    blockIndexX, blockIndexY, blockCountX, blockSize, blockThresholds);
                blockThresholds[blockIndexY * blockCountX + blockIndexX] = threshold;
            }
        }
        for (let blockIndexY=0; blockIndexY < blockCountY; ++blockIndexY) {
            for (let blockIndexX=0; blockIndexX < blockCountX; ++blockIndexX) {
                // calculate the average threshold over a 5x5 grid to essentially make the area bigger and increase
                // the chance that we have a bright and dark pixel in the area for good threshold computation. By
                // keeping the real block size small we ensure a good local threshold estimate (the step size in x and
                // y direction is essentially smaller).
                //
                // Instead of (min+max)/2 like in _calculateBlockThreshold, here we use a real average to be more prune
                // against outliers. E.g. imagine whats behind the scanned screen is really dark, the screen (including
                // dark pixels on the screen) rather bright. In this case, we want the threshold on the screen to be
                // rather bright and therefore not to factor in the background too much.
                let sum = 0;
                for (let i = -2; i<=2; ++i) {
                    for (let j = -2; j<=2; ++j) {
                        const neighborIndexX = Math.max(0, Math.min(blockCountX-1, blockIndexX+i));
                        const neighborIndexY = Math.max(0, Math.min(blockCountY-1, blockIndexY+j));
                        sum += blockThresholds[neighborIndexY * blockCountX + neighborIndexX];
                    }
                }
                Binarizer._applyThresholdToBlock(inputGrayscale, imageWidth, imageHeight, blockIndexX, blockIndexY,
                    blockSize, sum / 25, outputBinary);
            }
        }
    }

    static _calculateBlockThreshold(inputGrayscale, imageWidth, imageHeight, blockIndexX, blockIndexY, blockCountX, blockSize,
                                    blockThresholds) {
        let min = 0xFF, max = 0;
        const left = Math.min(blockIndexX * blockSize, imageWidth - blockSize);
        const top = Math.min(blockIndexY * blockSize, imageHeight - blockSize);
        let rowStart = top * imageWidth + left;
        for (let y=0; y<blockSize; ++y) {
            for (let x=0; x<blockSize; ++x) {
                const pixel = inputGrayscale[rowStart + x];
                if (pixel < min) {
                    min = pixel;
                }
                if (pixel > max) {
                    max = pixel;
                }
            }
            rowStart += imageWidth;
        }
        // Small bias towards black by moving the threshold up. We do this, as in the finder patterns white holes tend
        // to appear which makes them undetectable.
        const blackBias = 1.1;
        if (max - min > Binarizer.MIN_DYNAMIC_RANGE) {
            // The values span a minimum dynamic range, so we can assume we have bright and dark pixels. Return the
            // average of min and max as threshold. We could also compute the real average of all pixel but following
            // the assumption that the nimiqode consists of bright and dark pixels and essentially not much in between
            // then by (min + max)/2 we make the cut really between those two classes. If using the average over all
            // pixel then in a block of mostly bright pixels and few dark pixels, the avg would tend to the bright side
            // and darker bright pixels could be interpreted as dark.
            const threshold = (min + max) / 2;
            const maxBias = (min + max) / 4;
            return Math.min(255, threshold + maxBias, threshold * blackBias);
        } else {
            // We have a low dynamic range and assume the block is of solid bright or dark color.
            // TODO this zxing implementation is somewhat weird. Think of a better threshold propagation strategy.
            // Ideas:
            // - start the propagation in the middle of the screen following the assumption that the nimiqode / screen
            //   is centered in the image. By this, we avoid propagation of thresholds from the surrounding to the
            //   screen which hold the only interesting information to us.
            // - Combine the threshold propagation with edge detection
            // - When propagating a threshold adapt it by comparing the average brightness in my block to the average
            //   brightness in block we are propagating from
            if (blockIndexX === 0 || blockIndexY === 0) {
                // cant compare to the neighbours. Assume it's a light background
                return min - 1;
            } else {
                const myIndex = blockIndexY * blockCountX + blockIndexX;
                const leftBlockThreshold = blockThresholds[myIndex - 1];
                const topBlockThreshold = blockThresholds[myIndex - blockCountX];
                const topLeftBlockThreshold = blockCountX[myIndex - blockCountX - 1];
                const neighbourAverage = (leftBlockThreshold + topBlockThreshold + topLeftBlockThreshold) / 3;
                if (neighbourAverage > min) {
                    return neighbourAverage; // no need to apply black bias as it was already applied to neighbors
                } else {
                    // the block is brighter than its neighbors and we assume it to be white
                    return min - 1;
                }
            }
        }
    }


    static _applyThresholdToBlock(inputGrayscale, imageWidth, imageHeight, blockIndexX, blockIndexY, blockSize, threshold,
                                 outputBinary = inputGrayscale) {
        const left = Math.min(blockIndexX * blockSize, imageWidth - blockSize);
        const top = Math.min(blockIndexY * blockSize, imageHeight - blockSize);
        let rowStart = top * imageWidth + left;
        for (let y=0; y<blockSize; ++y) {
            for (let x=0; x<blockSize; ++x) {
                const index = rowStart + x;
                outputBinary[index] = inputGrayscale[index] <= threshold;
            }
            rowStart += imageWidth;
        }
    }
}
Binarizer.TARGET_BLOCK_COUNT_ALONG_SHORTER_SIDE = 40;
Binarizer.MIN_BLOCK_SIZE = 16;
Binarizer.MIN_DYNAMIC_RANGE = 12; // if the dynamic range in a block is below this value it's assumed to be single color