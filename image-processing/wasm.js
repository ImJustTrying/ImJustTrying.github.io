import init, { gaussian_blur, decode_png } from "./rust-wasm/pkg/rust_wasm.js"

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
        context.viewerImageData = null;
        // Draw the contents to the hidden canvas to extract the image data.
        context.hiddenCanvas.getContext("2d").drawImage(img, 0, 0);

        // Remove header from data URL, convert from base64 to u8's
        const dataURL = context.hiddenCanvas.toDataURL("image/png");
        const noHeader = dataURL.replace(/^data:image\/png;base64,/, "");
        const rawBytes = base64DecToArr(noHeader);
        init().then(() => {
            context.hiddenRawBytes = decode_png(rawBytes);
        });
        draw(context, img);
    };
}

function draw(context, imageData) {
    const can = context.viewerCanvas;
    const windowW = can.clientWidth;
    const windowH = can.clientHeight;
    const imageW = context.imgin.naturalWidth;
    const imageH = context.imgin.naturalHeight;

    can.width = windowW;
    can.height = windowH;
    const factor = windowW > windowH ? 
        windowH / imageH :
        windowW / imageW;
    const canvasImgW = imageW * factor;
    const canvasImgH = imageH * factor;
    const horizontalOffset = windowW > canvasImgW ?
        (windowW - canvasImgW) / 2 :
        0;
    can.getContext("2d").drawImage(
        imageData, horizontalOffset, 0, canvasImgW, canvasImgH);
}

function wasmBlur(context) {
    if (context.hiddenRawBytes !== null) {
        // If the image is not already edited, use the hidden canvas' content
        const bytes = context.viewerImageData === null ?
            context.hiddenRawBytes :
            context.viewerImageData.data;
        const w = context.hiddenCanvas.width;
        const h = context.hiddenCanvas.height;
        const sigma = context.sigma.value / 4 + 1;
        context.viewerImageData = new ImageData(
            new Uint8ClampedArray(gaussian_blur(w, h, bytes, sigma)), w, h);
        createImageBitmap(context.viewerImageData).then((result) => {
            draw(context, result);
        });
    }
}


window.onload = () => {
    let context = {
        finput:          document.querySelector("#finput"),
        viewerCanvas:    document.querySelector("#viewerCanvas"),
        hiddenCanvas:    document.querySelector("#hiddenCanvas"),
        imgin:           document.querySelector("#source"),
        btnBlur:         document.querySelector("#btnBlur"),
        btnReset:        document.querySelector("#btnReset"),
        sigma:           document.querySelector("#sigma"),
        hiddenRawBytes:  null,
        viewerImageData: null
    };

    context.finput.addEventListener("change", () => {
        handleFile(context);
    });
    context.btnBlur.addEventListener("click", () => {
        wasmBlur(context);
    });
    context.btnReset.addEventListener("click", () => {
        draw(context, context.hiddenCanvas);
        context.viewerImageData = null;
    });
    context.sigma.addEventListener("input", () => {
        document.querySelector("#sigmaView").innerHTML = 
            "Sigma: " + (context.sigma.value / 4 + 1).toPrecision(3);
    });
    window.addEventListener("resize", () => {
        if (context.viewerImageData === null) {
            draw(context, context.imgin);
        } else {
            createImageBitmap(context.viewerImageData).then((result) => {
                draw(context, result);
            });
        }
    });
};

