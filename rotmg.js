export const RotMGSprite = (function () {
    return class RotMGSprite {
        static RotMGify(pixels, width, height) {
            // add two pixels of padding to the image
            let newWidth = width + 2, newHeight = height + 2;
            let resultPixels = new Uint8ClampedArray(newWidth * newHeight * 4).fill(0);

            // copy the original pixels to the new array
            // and move them to the right and down by one pixel
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const sourceIndex = (y * width + x) * 4;
                    const destinationIndex = ((y + 1) * newWidth + (x + 1)) * 4;

                    for (let channel = 0; channel < 4; channel++) {
                        resultPixels[destinationIndex + channel] = pixels[sourceIndex + channel];
                    }
                }
            }

            // now we can upscale the image by 5x
            resultPixels = RotMGSprite.upscale(resultPixels, newWidth, newHeight, 5);

            // apply the black outline
            resultPixels = RotMGSprite.outline(resultPixels, newWidth * 5, newHeight * 5);

            return resultPixels;
        }

        static upscale(pixels, width, height, scale) {
            // calculate new size for the final image
            const newWidth = width * scale;
            const newHeight = height * scale;

            // store pixels for the new upscaled image
            const resultPixels = new Uint8ClampedArray(newWidth * newHeight * 4).fill(0);

            for (let y = 0; y < newHeight; y++) {
                for (let x = 0; x < newWidth; x++) {
                    const sourceX = Math.floor(x / scale);
                    const sourceY = Math.floor(y / scale);

                    const sourceIndex = (sourceY * width + sourceX) * 4;
                    const destinationIndex = (y * newWidth + x) * 4;

                    for (let channel = 0; channel < 4; channel++) {
                        resultPixels[destinationIndex + channel] = pixels[sourceIndex + channel];
                    }
                }
            }

            return resultPixels;
        }

        static outline(pixels, width, height) {
            // copy pixels
            pixels = new Uint8ClampedArray(pixels);

            const outline = {};

            function getIndex(x, y) {
                return (y * width + x) * 4;
            }

            function isTransparent(x, y) {
                if (x < 0 || y < 0 || x >= width || y >= height) return true; // Handling out of bounds
                const index = getIndex(x, y);
                return pixels[index + 3] === 0;
            }

            function applyOutline(x, y) {
                const index = getIndex(x, y);
                pixels[index] = 0; // R
                pixels[index + 1] = 0; // G
                pixels[index + 2] = 0; // B
                pixels[index + 3] = 255; // A
                outline[`${x},${y}`] = true;

            }

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (isTransparent(x, y)) {
                        continue;
                    }

                    if (outline[`${x},${y}`]) {
                        continue;
                    }

                    if (isTransparent(x, y - 1)) applyOutline(x, y - 1); // Top
                    if (isTransparent(x - 1, y)) applyOutline(x - 1, y); // Left
                    if (isTransparent(x + 1, y)) applyOutline(x + 1, y); // Right
                    if (isTransparent(x, y + 1)) applyOutline(x, y + 1); // Down
                    if (isTransparent(x - 1, y - 1)) applyOutline(x - 1, y - 1); // Top-left
                    if (isTransparent(x + 1, y - 1)) applyOutline(x + 1, y - 1); // Top-right
                    if (isTransparent(x - 1, y + 1)) applyOutline(x - 1, y + 1); // Bottom-left
                    if (isTransparent(x + 1, y + 1)) applyOutline(x + 1, y + 1); // Bottom-right
                }
            }

            return pixels;
        }
    }
})();