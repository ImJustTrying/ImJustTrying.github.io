extern crate web_sys;
extern crate console_error_panic_hook;


use wasm_bindgen::prelude::*;
use image::GenericImageView;


#[wasm_bindgen]
pub fn gaussian_blur(raw_img: &[u8]) -> Result<Vec<u8>, String> {
    console_error_panic_hook::set_once();
    let reader = image::load_from_memory(raw_img);

    match reader {
        Ok(img) => {
            let blurred = img.blur(2.0);
            web_sys::console::log_1(
                &format!("Color format: {:?}", blurred.color()).into());
            web_sys::console::log_1(
                &format!("Resolution: {:?}", blurred.dimensions()).into());
            Ok(blurred.into_bytes())
        },
        Err(e) => {
            Err(format!("Error loading image data from memory: {}", e))
        }
    }
}
