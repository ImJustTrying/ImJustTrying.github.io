extern crate web_sys;
extern crate console_error_panic_hook;


use wasm_bindgen::prelude::*;
use image::imageops::blur;
use image::ImageFormat::Png;
use image::{ ImageBuffer, Rgba };
use image::load_from_memory_with_format;


#[wasm_bindgen]
pub fn decode_png(raw_img: &[u8]) -> Result<Vec<u8>, String> {
    match load_from_memory_with_format(raw_img, Png) {
        Ok(img) => Ok(img.into_bytes()),
        Err(e) => Err(format!("Error loading image data from memory: {}", e))
    }
}


#[wasm_bindgen]
pub fn gaussian_blur(width: u32, height: u32, raw_img: Vec<u8>, sigma: f32) 
    -> Result<Vec<u8>, String> {
    console_error_panic_hook::set_once();
    web_sys::console::log_1(&format!("Sigma: {}", sigma).into());
    match image::ImageBuffer::from_vec(width, height, raw_img) {
        Some(img) => {
            let blurred: ImageBuffer<Rgba<u8>, Vec<u8>> =
                blur(&img, sigma);
            //web_sys::console::log_1(
            //    &format!("Resolution: {:?}", blurred.dimensions()).into());
            Ok(blurred.into_vec())
        },
        None => Err(format!("Error converting color data to image!")) 
    }
}
