use image::{load_from_memory, ImageOutputFormat};
use std::io::Cursor;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command

#[tauri::command]
async fn convert_webp_to_png(webp_data: Vec<u8>) -> Result<Vec<u8>, String> {
    // Load the WebP image from the input data
    let img = load_from_memory(&webp_data).map_err(|e| e.to_string())?;

    // Prepare a buffer to hold the PNG data
    let mut png_data = Vec::new();
    let mut cursor = Cursor::new(&mut png_data);

    // Write the image as PNG to the buffer
    img.write_to(&mut cursor, ImageOutputFormat::Png)
        .map_err(|e| e.to_string())?;

    // Return the PNG data
    Ok(png_data)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![convert_webp_to_png])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
