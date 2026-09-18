use rusqlite::Connection;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use crate::models::DocumentContent;

pub const MIGRATIONS_SQL: &str = include_str!("migrations/001_initial.sql");

pub fn normalize_metadata(conn: &Connection) -> Result<(), rusqlite::Error> {
    let default_json = serde_json::to_string(&DocumentContent::default_content()).unwrap();
    conn.execute("UPDATE templates SET metadata = ?1 WHERE metadata = '{}'", [&default_json])?;
    conn.execute("UPDATE documents SET metadata = ?1 WHERE metadata = '{}'", [&default_json])?;
    Ok(())
}

/// Get the platform-specific application database path.
pub fn get_db_path(app_handle: Option<&AppHandle>) -> PathBuf {
    if let Some(app) = app_handle {
        let mut path = app.path().app_data_dir().expect("Failed to get app data dir");
        // Ensure the directory exists
        let _ = fs::create_dir_all(&path);
        path.push("template_workspace.db");
        path
    } else {
        PathBuf::from("template_workspace.db")
    }
}

/// Initialize a database connection at a specific path and run migrations.
pub fn init_db_connection<P: AsRef<Path>>(path: P) -> Result<Connection, rusqlite::Error> {
    let conn = Connection::open(path)?;
    // Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON;", [])?;
    
    // Run migrations
    let migrations = vec![
        ("001_initial.sql", include_str!("migrations/001_initial.sql")),
        ("002_add_timestamps.sql", include_str!("migrations/002_add_timestamps.sql")),
        ("003_add_system_flag.sql", include_str!("migrations/003_add_system_flag.sql")),
    ];
    
    // Create migration table to track applied migrations
    conn.execute("CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY);", [])?;
    
    for (name, sql) in migrations {
        let applied: bool = conn.query_row(
            "SELECT COUNT(*) FROM migrations WHERE name = ?1",
            [name],
            |row| row.get::<_, i32>(0).map(|c| c > 0)
        )?;
        
        if !applied {
            conn.execute_batch(sql)?;
            conn.execute("INSERT INTO migrations (name) VALUES (?1);", [name])?;
        }
    }
    
    normalize_metadata(&conn)?;
    
    Ok(conn)
}

/// Initialize an in-memory database connection and run migrations. Useful for tests.
pub fn init_db_in_memory() -> Result<Connection, rusqlite::Error> {
    let conn = Connection::open_in_memory()?;
    // Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON;", [])?;
    
    // Run migrations
    let migrations = vec![
        ("001_initial.sql", include_str!("migrations/001_initial.sql")),
        ("002_add_timestamps.sql", include_str!("migrations/002_add_timestamps.sql")),
        ("003_add_system_flag.sql", include_str!("migrations/003_add_system_flag.sql")),
    ];
    
    // Create migration table to track applied migrations
    conn.execute("CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY);", [])?;
    
    for (name, sql) in migrations {
        conn.execute_batch(sql)?;
        conn.execute("INSERT INTO migrations (name) VALUES (?1);", [name])?;
    }
    
    normalize_metadata(&conn)?;
    
    Ok(conn)
}

/// Standard database initialization from Tauri runtime.
pub fn init_db(app_handle: Option<&AppHandle>) -> Result<Connection, rusqlite::Error> {
    let path = get_db_path(app_handle);
    init_db_connection(path)
}
