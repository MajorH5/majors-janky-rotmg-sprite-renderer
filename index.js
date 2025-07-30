import { RotMGSprite } from "./rotmg.js";

const canvas = document.getElementById("canvas");
const previewCanvas = document.getElementById("previewCanvas");

const spriteInput = document.getElementById("spriteInput");
const cellWidth = document.getElementById("cellWidth");
const cellHeight = document.getElementById("cellHeight");

const download = document.getElementById("download");

const context = canvas.getContext("2d");
const previewContext = previewCanvas.getContext("2d");

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

let loadedImage = null;
let cellSizeX = 8, cellSizeY = 8;
let imageWidth = 0, imageHeight = 0;
let scaledCellSizeX = 8, scaledCellSizeY = 8;
let selectedCells = [];

let groupColorIndex = 1;

let hoverX = null, hoverY = null;
let dragX = null, dragY = null;

function inferCellSize(width, height) {
    const sizes = [64, 32, 16, 8];

    let inferedCellSizeX = 8;
    let inferedCellSizeY = 8;

    // const infer = (number) => {
    //     for (let i = 0; i < sizes.length; i++) {
    //         if (number / sizes[i] % 1 == 0) {
    //             return sizes[i];
    //         }
    //     }

    //     return null;
    // }

    // inferedCellSizeX = infer(width) || inferedCellSizeX
    // inferedCellSizeY = infer(height) || inferedCellSizeY

    return [inferedCellSizeX, inferedCellSizeY]
}

function normalizePosition(x, y, element) {
    var rect = element.getBoundingClientRect();

    var scaleX = element.width / rect.width;
    var scaleY = element.height / rect.height;

    const mouseX = (x - rect.left) * scaleX,
        mouseY = (y - rect.top) * scaleY;

    return [mouseX, mouseY];
}

function renderDraw() {
    requestAnimationFrame(renderDraw);

    if (loadedImage == null) {
        return;
    }

    context.translate(-0.5, -0.5);

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(loadedImage, 0, 0, imageWidth, imageHeight, 0, 0, canvas.width, canvas.height);

    selectedCells.forEach((cell) => {
        context.fillStyle = cell.c || 'rgba(0, 0, 255, 0.5)';
        context.fillRect(
            cell.x * scaledCellSizeX,
            cell.y * scaledCellSizeY,
            scaledCellSizeX * cell.w,
            scaledCellSizeY * cell.h
        );

        context.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        context.lineWidth = 1;
        context.strokeRect(
            cell.x * scaledCellSizeX,
            cell.y * scaledCellSizeY,
            scaledCellSizeX * cell.w,
            scaledCellSizeY * cell.h
        );
    });

    if (dragX === null && dragY === null) {
        if (hoverX !== null && hoverY !== null) {
            context.fillStyle = 'rgba(255, 0, 0, 0.5)';
            context.fillRect(
                hoverX * scaledCellSizeX,
                hoverY * scaledCellSizeY,
                scaledCellSizeX,
                scaledCellSizeY
            );
        }

    } else {
        const x = Math.min(dragX, hoverX);
        const y = Math.min(dragY, hoverY);

        const w = Math.max(dragX, hoverX) - x + 1;
        const h = Math.max(dragY, hoverY) - y + 1;

        context.fillStyle = 'rgba(0, 255, 0, 0.5)';
        context.fillRect(
            x * scaledCellSizeX,
            y * scaledCellSizeY,
            scaledCellSizeX * w,
            scaledCellSizeY * h
        );
    }

    context.translate(0.5, 0.5);
}

function readPartialImageData (image, sx, sy, sw, sh) {
    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    return imageData.data;
}

function mergeCells(cells) {
  if (cells.length === 0) return null;

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const { x, y, w, h } of cells) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY
  };
}

function renderFinalPreview(image, cells) {
    let finalWidth = 0;
    let finalHeight = 0;

    const widthContribute = {};
    const heightContribute = {};

    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];

        widthContribute[cell.x] = Math.max(((cell.w * cellSizeX) + 2) * 5, widthContribute[cell.x] || 0);
        heightContribute[cell.y] = Math.max(((cell.h * cellSizeY) + 2) * 5, heightContribute[cell.y] || 0);
    }

    Object.keys(widthContribute).forEach((key) => finalWidth += widthContribute[key]);
    Object.keys(heightContribute).forEach((key) => finalHeight += heightContribute[key]);
    
    previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    const aespectRatio = finalHeight / finalWidth;
    const canvasHeight = aespectRatio * finalWidth;

    previewCanvas.width = finalWidth;
    previewCanvas.height = canvasHeight;

    previewContext.imageSmoothingEnabled = false;

    const cellGroups = Object.groupBy(cells, ({ id }) => id || 0);

    const mergedCells = [
        ...(cellGroups[0] || [])
    ];
    delete cellGroups[0];

    Object.keys(cellGroups).forEach((id) => {
        const cells = cellGroups[id];
        const merged = mergeCells(cells);

        mergedCells.push(merged);
    });

    for (let i = 0; i < mergedCells.length; i++) {
        const cell = mergedCells[i];
        
        const sx = cell.x * cellSizeX;
        const sy = cell.y * cellSizeY;
        
        const sw = cell.w * cellSizeX;
        const sh = cell.h * cellSizeY;
        
        const pixelData = readPartialImageData(image, sx, sy, sw, sh);
        const rotmgified = RotMGSprite.RotMGify(pixelData, sw, sh);
        
        const imageData = new ImageData(rotmgified, (sw + 2) * 5, (sh + 2) * 5);
        
        let yOffset = 0;
        let xOffset = 0;

        for (let x = 0; x < cell.x; x++) {
            xOffset += widthContribute[x] || 0;
        }
        
        for (let y = 0; y < cell.y; y++) {
            yOffset += heightContribute[y] || 0;
        }

        const tempCanvas = document.createElement('canvas');
        const tempContext = tempCanvas.getContext('2d');

        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;

        tempContext.putImageData(imageData, 0, 0);

        previewContext.shadowColor = '#000000';
        previewContext.shadowBlur = 2.5;
        previewContext.drawImage(tempCanvas,
            0, 0,
            tempCanvas.width, tempCanvas.height,
            xOffset, yOffset,
            tempCanvas.width, tempCanvas.height
        );
        previewContext.shadowBlur = 0;
    }
}

function resetCells () {
    const scaling = canvas.height / imageHeight;

    scaledCellSizeX = cellSizeX * scaling;
    scaledCellSizeY = cellSizeY * scaling;

    selectedCells = [];

    for (let y = 0; y < Math.floor(imageHeight / cellSizeY); y++) {
        for (let x = 0; x < Math.floor(imageWidth / cellSizeX); x++) {
            selectedCells.push({
                x, y,
                w: 1, h: 1,
            });
        }
    }
}

spriteInput.addEventListener("change", async () => {
    if (spriteInput.files.length === 1) {
        const texture = document.createElement("img");
        texture.src = URL.createObjectURL(spriteInput.files[0]);

        const [width, height] = await new Promise((resolve) => {
            texture.onload = () => {
                resolve([texture.width, texture.height]);
            };
        });

        const aespectRatio = height / width;
        const canvasHeight = aespectRatio * CANVAS_WIDTH;

        canvas.height = canvasHeight;
        context.imageSmoothingEnabled = false;

        const [infX, infY] = inferCellSize(width, height);

        cellWidth.value = infX;
        cellHeight.value = infY;

        loadedImage = texture
        imageWidth = width, imageHeight = height;

        
        resetCells()
        renderFinalPreview(loadedImage, selectedCells);
    }
});

function generateUniqueColor(index) {
    const hue = (index * 137.508) % 360;
    const saturation = 65 + (index % 3) * 10;
    const lightness = 50 + (index % 2) * 15;
    return `hsla(${hue}, ${saturation}%, ${lightness}%, 0.6)`;
}

canvas.addEventListener('mousedown', (e) => {
    if (loadedImage === null) {
        return;
    }

    const [mouseX, mouseY] = normalizePosition(e.clientX, e.clientY, canvas);

    dragX = Math.floor(mouseX / scaledCellSizeX);
    dragY = Math.floor(mouseY / scaledCellSizeY);
});

canvas.addEventListener('mousemove', (e) => {
    if (loadedImage === null) {
        return;
    }

    const [mouseX, mouseY] = normalizePosition(e.clientX, e.clientY, canvas);

    hoverX = Math.floor(mouseX / scaledCellSizeX);
    hoverY = Math.floor(mouseY / scaledCellSizeY);
});

canvas.addEventListener('mouseup', (e) => {
    if (loadedImage === null) {
        return;
    }

    const [mouseX, mouseY] = normalizePosition(e.clientX, e.clientY, canvas);

    const hitX = Math.floor(mouseX / scaledCellSizeX);
    const hitY = Math.floor(mouseY / scaledCellSizeY);

    if (dragX === hitX && dragY === hitY) {
        const cellIndex = selectedCells.findIndex((cell) => cell.x === hitX && cell.y === hitY);

        if (cellIndex !== -1) {
            selectedCells.splice(cellIndex, 1);
        } else {
            selectedCells.push({ x: hitX, y: hitY, w: 1, h: 1 });
        }
    } else {
        let x = Math.min(dragX, hoverX);
        let y = Math.min(dragY, hoverY);

        const w = Math.max(dragX, hoverX) - x + 1;
        const h = Math.max(dragY, hoverY) - y + 1;

        const toRemove = [];

        selectedCells.forEach((cell, index) => {
            if (
                cell.x >= x && cell.x < x + w &&
                cell.y >= y && cell.y < y + h
            ) {
                toRemove.push(index);
            }
        });

        toRemove.sort((a, b) => b - a);
        toRemove.forEach((index) => selectedCells.splice(index, 1));

        const groupColor = generateUniqueColor(groupColorIndex);
        const currentGroupId = groupColorIndex++;

        for (let yPos = y; yPos < y + h; yPos++) {
            for (let xPos = x; xPos < x + w; xPos++) {
                const cell = {
                    x: xPos,
                    y: yPos,
                    w: 1,
                    h: 1,
                };

                if (e.button === 0) {
                    cell.c = groupColor,
                        cell.id = currentGroupId
                }

                selectedCells.push(cell);
            }
        }

    }

    dragX = null;
    dragY = null;

    renderFinalPreview(loadedImage, selectedCells);
});

canvas.addEventListener('mouseleave', () => {
    hoverX = null, hoverY = null;
});

download.addEventListener('click', ()=> {
    const link = document.createElement('a');
    link.download = 'image.png';
    link.href = previewCanvas.toDataURL('image/png');
    link.click();
});

cellWidth.addEventListener("change", (event) => {
    cellSizeX = event.target.value
    resetCells()
});

cellHeight.addEventListener("change", (event) => {
    cellSizeY = event.target.value
    resetCells()
});

renderDraw();