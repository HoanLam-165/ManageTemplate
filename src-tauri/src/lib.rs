pub mod models;
pub mod db;
pub mod assets;
pub mod error;
pub mod repo;
#[cfg(test)]
mod tests;

use tauri::Manager;
use repo::{DbState};
use std::sync::Mutex;
use models::User;

pub struct AuthState(pub Mutex<Option<User>>);

// --- Auth Commands ---

#[tauri::command]
fn register(db: tauri::State<DbState>, username: &str, password: &str) -> Result<i64, error::AppError> {
    let conn = db.0.lock().unwrap();
    let user_id = repo::UserRepo::create(&conn, username, password)?;
    repo::TemplateRepo::seed_for_user(&conn, user_id)?;
    Ok(user_id)
}

#[tauri::command]
fn login(
    db: tauri::State<DbState>, 
    auth: tauri::State<AuthState>, 
    username: &str, 
    password: &str
) -> Result<User, error::AppError> {
    let conn = db.0.lock().unwrap();
    let user = repo::UserRepo::find_by_username(&conn, username)?
        .ok_or(error::AppError::AuthError("User not found".into()))?;

    bcrypt::verify(password, &user.password_hash)
        .map_err(|_| error::AppError::AuthError("Verification failed".into()))?
        .then_some(())
        .ok_or(error::AppError::AuthError("Invalid password".into()))?;

    let mut auth_state = auth.0.lock().unwrap();
    *auth_state = Some(user.clone());

    // Ensure seeded templates are populated/repaired
    repo::TemplateRepo::seed_for_user(&conn, user.id)?;

    Ok(user)
}

#[tauri::command]
fn get_current_user(auth: tauri::State<AuthState>) -> Option<User> {
    let auth_state = auth.0.lock().unwrap();
    auth_state.clone()
}

#[tauri::command]
fn logout(auth: tauri::State<AuthState>) {
    let mut auth_state = auth.0.lock().unwrap();
    *auth_state = None;
}

#[tauri::command]
fn get_templates(db: tauri::State<DbState>, auth: tauri::State<AuthState>) -> Result<Vec<models::Template>, error::AppError> {
    let user = auth.0.lock().unwrap().clone()
        .ok_or(error::AppError::AuthError("Not logged in".into()))?;
    let conn = db.0.lock().unwrap();
    repo::TemplateRepo::get_by_user(&conn, user.id)
}

#[tauri::command]
fn create_template(db: tauri::State<DbState>, auth: tauri::State<AuthState>, name: &str, description: Option<String>, metadata: &str) -> Result<i64, error::AppError> {
    let user = auth.0.lock().unwrap().clone()
        .ok_or(error::AppError::AuthError("Not logged in".into()))?;
    let conn = db.0.lock().unwrap();

    repo::TemplateRepo::create(&conn, user.id, name, description.as_deref(), metadata)
}

#[tauri::command]
fn update_template(
    db: tauri::State<DbState>, 
    auth: tauri::State<AuthState>, 
    id: i64, 
    name: &str, 
    description: Option<&str>, 
    metadata: &str
) -> Result<(), error::AppError> {
    let user = auth.0.lock().unwrap().clone()
        .ok_or(error::AppError::AuthError("Not logged in".into()))?;
    let conn = db.0.lock().unwrap();

    // Verify ownership
    let template: models::Template = conn.query_row(
        "SELECT id, user_id, name, description, category_id, thumbnail_asset_id, metadata, created_at, updated_at FROM templates WHERE id = ?1",
        [id],
        |row| Ok(models::Template {
            id: row.get(0)?,
            user_id: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            category_id: row.get(4)?,
            thumbnail_asset_id: row.get(5)?,
            metadata: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    )?;

    if template.user_id != user.id {
        return Err(error::AppError::AuthError("Access denied".into()));
    }

    repo::TemplateRepo::update(&conn, id, name, description, metadata)
}

#[tauri::command]
fn search_templates(db: tauri::State<DbState>, auth: tauri::State<AuthState>, query: &str) -> Result<Vec<models::Template>, error::AppError> {
    let user = auth.0.lock().unwrap().clone()
        .ok_or(error::AppError::AuthError("Not logged in".into()))?;
    let conn = db.0.lock().unwrap();
    repo::TemplateRepo::search_by_user(&conn, user.id, query)
}

#[tauri::command]
fn get_documents(db: tauri::State<DbState>, auth: tauri::State<AuthState>) -> Result<Vec<models::Document>, error::AppError> {
    let user = auth.0.lock().unwrap().clone()
        .ok_or(error::AppError::AuthError("Not logged in".into()))?;
    let conn = db.0.lock().unwrap();
    repo::DocumentRepo::get_by_user(&conn, user.id)
}

#[tauri::command]
fn create_document(db: tauri::State<DbState>, auth: tauri::State<AuthState>, name: &str, template_id: Option<i64>) -> Result<i64, error::AppError> {
    let user = auth.0.lock().unwrap().clone()
        .ok_or(error::AppError::AuthError("Not logged in".into()))?;
    let conn = db.0.lock().unwrap();
    repo::DocumentRepo::create(&conn, user.id, name, template_id, None)
}

#[tauri::command]
fn update_document(
    db: tauri::State<DbState>, 
    auth: tauri::State<AuthState>, 
    id: i64, 
    name: Option<&str>, 
    metadata: &str
) -> Result<(), error::AppError> {
    let user = auth.0.lock().unwrap().clone()
        .ok_or(error::AppError::AuthError("Not logged in".into()))?;
    let conn = db.0.lock().unwrap();

    // Verify ownership
    let doc_user_id: i64 = conn.query_row(
        "SELECT user_id FROM documents WHERE id = ?1",
        [id],
        |row| row.get(0),
    ).map_err(|_| error::AppError::DatabaseError("Document not found".into()))?;

    if doc_user_id != user.id {
        return Err(error::AppError::AuthError("Access denied".into()));
    }

    if let Some(new_name) = name {
        conn.execute(
            "UPDATE documents SET name = ?1, metadata = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
            (new_name, metadata, id),
        )?;
    } else {
        conn.execute(
            "UPDATE documents SET metadata = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            (metadata, id),
        )?;
    }
    Ok(())
}

#[tauri::command]
fn delete_template(db: tauri::State<DbState>, auth: tauri::State<AuthState>, id: i64) -> Result<(), error::AppError> {
    let user = auth.0.lock().unwrap().clone()
        .ok_or(error::AppError::AuthError("Not logged in".into()))?;
    let conn = db.0.lock().unwrap();
    repo::TemplateRepo::delete(&conn, id, user.id)
}

#[tauri::command]
fn delete_document(db: tauri::State<DbState>, auth: tauri::State<AuthState>, id: i64) -> Result<(), error::AppError> {
    let user = auth.0.lock().unwrap().clone()
        .ok_or(error::AppError::AuthError("Not logged in".into()))?;
    let conn = db.0.lock().unwrap();
    repo::DocumentRepo::delete(&conn, id, user.id)
}

#[tauri::command]
fn upload_asset_base64(
    db: tauri::State<DbState>,
    auth: tauri::State<AuthState>,
    app_handle: tauri::AppHandle,
    data_url: String,
    file_name: String,
) -> Result<i64, error::AppError> {
    let user = auth.0.lock().unwrap().clone()
        .ok_or(error::AppError::AuthError("Not logged in".into()))?;

    let base64_str = if let Some(idx) = data_url.find(',') {
        &data_url[idx + 1..]
    } else {
        &data_url
    };

    use base64::Engine;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_str)
        .map_err(|e| error::AppError::ValidationError(format!("Invalid base64 payload: {}", e)))?;

    let saved_path = assets::save_asset(&app_handle, &file_name, &bytes)
        .map_err(|e| error::AppError::IoError(e.to_string()))?;

    let path_str = saved_path.to_str().unwrap_or(&file_name);
    let conn = db.0.lock().unwrap();
    let asset_id = repo::AssetRepo::create(&conn, user.id, "Image", path_str)?;

    Ok(asset_id)
}

#[tauri::command]
fn get_asset_base64(
    db: tauri::State<DbState>,
    auth: tauri::State<AuthState>,
    id: i64,
) -> Result<String, error::AppError> {
    let user = auth.0.lock().unwrap().clone()
        .ok_or(error::AppError::AuthError("Not logged in".into()))?;
    let conn = db.0.lock().unwrap();
    
    let path: String = conn.query_row(
        "SELECT path FROM assets WHERE id = ?1 AND user_id = ?2",
        [id, user.id],
        |row| row.get(0),
    ).map_err(|_| error::AppError::DatabaseError("Asset not found".into()))?;

    let bytes = std::fs::read(&path)
        .map_err(|e| error::AppError::IoError(format!("Không đọc được file: {}", e)))?;

    let ext = std::path::Path::new(&path)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("png")
        .to_lowercase();

    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        _ => "image/png",
    };

    use base64::Engine;
    let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, encoded))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_handle = app.handle();
            let conn = db::init_db(Some(app_handle)).expect("Failed to initialize database");
            
            // Manage the DB connection and Auth state in Tauri
            app.manage(DbState(Mutex::new(conn)));
            app.manage(AuthState(Mutex::new(None)));
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            register, login, logout, get_current_user, get_templates, create_template, 
            update_template, search_templates, get_documents, create_document, 
            update_document, delete_template, delete_document, 
            upload_asset_base64, get_asset_base64
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
