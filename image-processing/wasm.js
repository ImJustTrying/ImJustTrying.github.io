import init, { gaussian_blur } from "./rust-wasm/pkg/rust_wasm.js"

// Code is sourced from:
// https://developer.mozilla.org/en-US/docs/Glossary/Base64
function b64ToUint6(nChr) {
    return nChr > 64 && nChr < 91
        ? nChr - 65
        : nChr > 96 && nChr < 123
        ? nChr - 71
        : nChr > 47 && nChr < 58
        ? nChr + 4
        : nChr === 43
        ? 62
        : nChr === 47
        ? 63
        : 0;
}

function base64DecToArr(sBase64, nBlocksSize) {
    // Remove any non-base64 characters, such as trailing "=",
    // whitespace, and more.
    const sB64Enc = sBase64.replace(/[^A-Za-z0-9+/]/g, "");
    const nInLen = sB64Enc.length;
    const nOutLen = nBlocksSize
    ? Math.ceil(((nInLen * 3 + 1) >> 2) / nBlocksSize) * nBlocksSize
    : (nInLen * 3 + 1) >> 2;
    const taBytes = new Uint8ClampedArray(nOutLen);

    let nMod3;
    let nMod4;
    let nUint24 = 0;
    let nOutIdx = 0;
    for (let nInIdx = 0; nInIdx < nInLen; nInIdx++) {
        nMod4 = nInIdx & 3;
        nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << (6 * (3 - nMod4));
        if (nMod4 === 3 || nInLen - nInIdx === 1) {
            nMod3 = 0;
            while (nMod3 < 3 && nOutIdx < nOutLen) {
                taBytes[nOutIdx] = (nUint24 >>> ((16 >>> nMod3) & 24)) & 255;
                nMod3++;
                nOutIdx++;
            }
            nUint24 = 0;
        }
    }

    return taBytes;
}
// End of sourced code

function handleFile(context) {
    const files = context.finput.files;
    if (files.length !== 1) {
        console.warn("No files to handle!");
        return;
    }
    console.debug(`${files[0].name}: ${files[0].size} bytes`);
    // Set the img element's source to be a URL pointing to the uploaded file.
    context.imgin.src = URL.createObjectURL(files[0]);

    context.imgin.onload = () => {
        const img = context.imgin;
        URL.revokeObjectURL(img.src);
        console.debug(`Image is ${img.naturalWidth}x${img.naturalHeight}`);
        context.hiddenCanvas.width  = img.naturalWidth;
        context.hiddenCanvas.height = img.naturalHeight;
        context.viewerCanvas.width  = img.naturalWidth;
        context.viewerCanvas.height = img.naturalHeight;
        // Draw the contents to the hidden canvas to extract the image data.
        context.hiddenCanvas.getContext("2d").drawImage(img, 0, 0);

        // Remove header from data URL, convert from base64 to u8's
        const dataURL = context.hiddenCanvas.toDataURL("image/png");
        const noHeader = dataURL.replace(/^data:image\/png;base64,/, "");
        const rawBytes = base64DecToArr(noHeader);
        console.debug(rawBytes);
        context.hiddenRawBytes = rawBytes;
        draw(context, img);
    };
}

// Derived from source:
// https://stackoverflow.com/questions/68621712/canvas-fill-viewport-and-keep-image-ratio
function draw(context, imageData) {
    const window_w = window.innerWidth;
    const window_h = window.innerHeight;
    const image_w = context.imgin.naturalWidth;
    const image_h = context.imgin.naturalHeight;
    let can = context.viewerCanvas;

    can.width = window_w;
    can.height = window_h;
    const factor = image_h / image_w * can.width > window_h ?
        can.height / image_h :
        can.width / image_w;
    const offset_w = image_w * factor;
    const offset_h = image_h * factor;
    can.getContext("2d").drawImage(imageData, 0, 0, offset_w, offset_h);
}
// End of sourced code

function wasmBlur(context) {
    init().then(() => {
        const bytes = context.viewerRawBytes == null ?
            context.hiddenRawBytes :
            context.viewerRawBytes;
        console.debug(bytes);
        // TODO: On first go we pass PNG binary, but on  the second we pass 
        // the raw color data. Maybe handle them seperately?
        context.viewerRawBytes = new Uint8ClampedArray(gaussian_blur(bytes));
        const newImgData = new ImageData(
            context.viewerRawBytes,
            context.hiddenCanvas.width,
            context.hiddenCanvas.height);
        createImageBitmap(newImgData).then((result) => {
            draw(context, result);
        });
    });
}

function resetCanvas(context) {
    draw(context, context.hiddenCanvas);
    context.viewerRawBytes = null;
}

window.onload = () => {
    let context = {
        finput:         document.querySelector("#finput"),
        viewerCanvas:   document.querySelector("#viewerCanvas"),
        hiddenCanvas:   document.querySelector("#hiddenCanvas"),
        imgin:          document.querySelector("#source"),
        btnBlur:        document.querySelector("#btnBlur"),
        btnReset:       document.querySelector("#btnReset"),
        hiddenRawBytes: null,
        viewerRawBytes: null
    };

    context.finput.addEventListener("change", () => {
        handleFile(context);
    });
    context.btnBlur.addEventListener("click", () => {
        wasmBlur(context);
    });
    context.btnReset.addEventListener("click", () => {
        resetCanvas(context);
    });
    window.addEventListener("resize", () => {
        draw(context, context.imgin);
    });
};

