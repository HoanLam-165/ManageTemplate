use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use tauri::Manager;

pub fn get_assets_dir(app_handle: &AppHandle) -> PathBuf {
    let mut path = app_handle.path().app_data_dir().expect("Failed to get app data dir");
    path.push("assets");
    if !path.exists() {
        let _ = fs::create_dir_all(&path);
    }
    path
}

pub fn save_asset(app_handle: &AppHandle, filename: &str, data: &[u8]) -> Result<PathBuf, std::io::Error> {
    let assets_dir = get_assets_dir(app_handle);
    let file_path = assets_dir.join(filename);
    fs::write(&file_path, data)?;
    Ok(file_path)
}
