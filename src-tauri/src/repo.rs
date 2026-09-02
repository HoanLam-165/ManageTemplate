use rusqlite::Connection;
use crate::models::{User, Template, Document, DocumentContent, Element, ElementType, ElementProperties};
use crate::error::AppError;
use bcrypt::{hash, DEFAULT_COST};

pub struct DbState(pub std::sync::Mutex<Connection>);

pub struct UserRepo;

impl UserRepo {
    pub fn create(conn: &Connection, username: &str, password: &str) -> Result<i64, AppError> {
        let hashed = hash(password, DEFAULT_COST)?;
        conn.execute(
            "INSERT INTO users (username, password_hash) VALUES (?1, ?2)",
            (username, hashed),
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn find_by_username(conn: &Connection, username: &str) -> Result<Option<User>, AppError> {
        let mut stmt = conn.prepare("SELECT id, username, password_hash FROM users WHERE username = ?1")?;
        let mut user_iter = stmt.query_map([username], |row| {
            Ok(User {
                id: row.get(0)?,
                username: row.get(1)?,
                password_hash: row.get(2)?,
            })
        })?;
        
        Ok(user_iter.next().map(|r| r.unwrap()))
    }
}

pub struct TemplateRepo;

impl TemplateRepo {
    pub fn create(conn: &Connection, user_id: i64, name: &str, description: Option<&str>, metadata: &str) -> Result<i64, AppError> {
        if name != "Blank Template" {
            let count = Self::count_for_user(conn, user_id)?;
            if count >= 3 {
                return Err(AppError::ValidationError("Template slot limit reached".into()));
            }
        }
        conn.execute(
            "INSERT INTO templates (user_id, name, description, metadata) VALUES (?1, ?2, ?3, ?4)",
            (user_id, name, description, metadata),
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn get_by_user(conn: &Connection, user_id: i64) -> Result<Vec<Template>, AppError> {
        let mut stmt = conn.prepare("SELECT id, user_id, name, description, category_id, thumbnail_asset_id, metadata, created_at, updated_at FROM templates WHERE user_id = ?1")?;
        let template_iter = stmt.query_map([user_id], |row| {
            Ok(Template {
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
        })?;
        
        let mut templates = Vec::new();
        for template in template_iter {
            templates.push(template?);
        }
        Ok(templates)
    }

    pub fn search_by_user(conn: &Connection, user_id: i64, query: &str) -> Result<Vec<Template>, AppError> {
        let pattern = format!("%{}%", query);
        let mut stmt = conn.prepare("SELECT id, user_id, name, description, category_id, thumbnail_asset_id, metadata, created_at, updated_at FROM templates WHERE user_id = ?1 AND name LIKE ?2")?;
        let template_iter = stmt.query_map((user_id, pattern), |row| {
            Ok(Template {
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
        })?;
        
        let mut templates = Vec::new();
        for template in template_iter {
            templates.push(template?);
        }
        Ok(templates)
    }

    pub fn count_for_user(conn: &Connection, user_id: i64) -> Result<i64, AppError> {
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM templates WHERE user_id = ?1 AND name != 'Blank Template'",
            [user_id],
            |row| row.get(0),
        )?;
        Ok(count)
    }

    pub fn delete(conn: &Connection, id: i64, user_id: i64) -> Result<(), AppError> {
        conn.execute(
            "DELETE FROM templates WHERE id = ?1 AND user_id = ?2",
            (id, user_id),
        )?;
        Ok(())
    }

    pub fn update(conn: &Connection, template_id: i64, name: &str, description: Option<&str>, metadata: &str) -> Result<(), AppError> {
        conn.execute(
            "UPDATE templates SET name = ?1, description = ?2, metadata = ?3, updated_at = CURRENT_TIMESTAMP WHERE id = ?4",
            (name, description, metadata, template_id),
        )?;
        Ok(())
    }

    pub fn seed_for_user(conn: &Connection, user_id: i64) -> Result<(), AppError> {
        let templates = ["Test Case", "Bug Report", "Meeting Notes", "Blank Template"];
        let default_content = DocumentContent::default_content();

        for name in templates.iter() {
            let existing_template_res: Result<Template, rusqlite::Error> = conn.query_row(
                "SELECT id, user_id, name, description, category_id, thumbnail_asset_id, metadata, created_at, updated_at FROM templates WHERE user_id = ?1 AND name = ?2",
                (user_id, *name),
                |row| Ok(Template {
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
            );

            match existing_template_res {
                Ok(template) => {
                    if (*name == "Bug Report" || *name == "Test Case" || *name == "Meeting Notes")
                        && template.created_at == template.updated_at
                    {
                        if let Ok(content) = serde_json::from_str::<DocumentContent>(&template.metadata) {
                            if content.elements.is_empty() {
                                let populated = get_populated_content(name);
                                let json = serde_json::to_string(&populated)?;
                                Self::update(conn, template.id, &template.name, template.description.as_deref(), &json)?;
                            }
                        }
                    }
                },
                Err(rusqlite::Error::QueryReturnedNoRows) => {
                    let content = if *name == "Blank Template" {
                        default_content.clone()
                    } else {
                        get_populated_content(name)
                    };
                    Self::create(conn, user_id, name, None, &serde_json::to_string(&content)?)?;
                },
                Err(e) => return Err(AppError::from(e)),
            }
        }
        Ok(())
    }
}

pub fn get_populated_content(name: &str) -> DocumentContent {
    let mut content = DocumentContent::default_content();
    match name {
        "Bug Report" => {
            content.elements = vec![
                create_text_el("Tiêu đề lỗi", 10.0, 10.0),
                create_text_el("Mô tả", 10.0, 25.0),
                create_text_el("Các bước tái hiện", 10.0, 40.0),
                create_text_el("Kết quả mong đợi", 10.0, 55.0),
                create_text_el("Kết quả thực tế", 10.0, 70.0),
                create_number_el("Độ nghiêm trọng (1-5)", 10.0, 85.0),
            ];
        },
        "Test Case" => {
            content.elements = vec![
                create_text_el("Tên Test Case", 10.0, 10.0),
                create_text_el("Điều kiện tiên quyết", 10.0, 25.0),
                create_text_el("Các bước", 10.0, 40.0),
                create_text_el("Kết quả mong đợi", 10.0, 55.0),
                create_text_el("Kết quả thực tế", 10.0, 70.0),
                create_text_el("Trạng thái", 10.0, 85.0),
            ];
        },
        "Meeting Notes" => {
            content.elements = vec![
                create_text_el("Tiêu đề cuộc họp", 10.0, 10.0),
                create_date_el("Ngày", 10.0, 25.0),
                create_text_el("Người tham gia", 10.0, 40.0),
                create_text_el("Nội dung", 10.0, 55.0),
                create_text_el("Kết luận", 10.0, 70.0),
            ];
        },
        _ => {},
    }
    content
}

fn create_text_el(content: &str, x: f64, y: f64) -> Element {
    Element {
        id: format!("el-seed-{}", content),
        element_type: ElementType::Text,
        position_x_mm: x,
        position_y_mm: y,
        width_mm: 100.0,
        height_mm: 10.0,
        properties: ElementProperties::Text {
            content: content.into(),
            font_family: "Arial".into(),
            font_size: 12.0,
            is_bold: true,
            is_italic: false,
            is_underline: false,
            alignment: "left".into(),
        }
    }
}

fn create_number_el(label: &str, x: f64, y: f64) -> Element {
    Element {
        id: format!("el-seed-{}", label),
        element_type: ElementType::Number,
        position_x_mm: x,
        position_y_mm: y,
        width_mm: 100.0,
        height_mm: 10.0,
        properties: ElementProperties::Number { value: 0.0 }
    }
}

fn create_date_el(label: &str, x: f64, y: f64) -> Element {
    Element {
        id: format!("el-seed-{}", label),
        element_type: ElementType::Date,
        position_x_mm: x,
        position_y_mm: y,
        width_mm: 100.0,
        height_mm: 10.0,
        properties: ElementProperties::Date { value: "".into(), format: "YYYY-MM-DD".into() }
    }
}

pub struct DocumentRepo;

impl DocumentRepo {
    pub fn create(conn: &Connection, user_id: i64, name: &str, source_template_id: Option<i64>, metadata: Option<&str>) -> Result<i64, AppError> {
        let content_to_store = if let Some(template_id) = source_template_id {
            let template_metadata: String = conn.query_row(
                "SELECT metadata FROM templates WHERE id = ?1",
                [template_id],
                |row| row.get(0),
            )?;
            
            if let Ok(doc_content) = serde_json::from_str::<DocumentContent>(&template_metadata) {
                serde_json::to_string(&doc_content)
                    .map_err(|e| AppError::ValidationError(format!("Failed to serialize document content: {}", e)))?
            } else {
                template_metadata
            }
        } else {
            metadata.map(|s| s.to_string()).unwrap_or_else(|| serde_json::to_string(&DocumentContent::default_content()).unwrap())
        };

        conn.execute(
            "INSERT INTO documents (user_id, source_template_id, name, metadata) VALUES (?1, ?2, ?3, ?4)",
            (user_id, source_template_id, name, content_to_store),
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn get_by_user(conn: &Connection, user_id: i64) -> Result<Vec<Document>, AppError> {
        let mut stmt = conn.prepare("SELECT id, user_id, source_template_id, name, metadata, created_at, updated_at FROM documents WHERE user_id = ?1")?;
        let doc_iter = stmt.query_map([user_id], |row| {
            Ok(Document {
                id: row.get(0)?,
                user_id: row.get(1)?,
                source_template_id: row.get(2)?,
                name: row.get(3)?,
                metadata: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?;
        
        let mut docs = Vec::new();
        for doc in doc_iter {
            docs.push(doc?);
        }
        Ok(docs)
    }

    pub fn delete(conn: &Connection, id: i64, user_id: i64) -> Result<(), AppError> {
        conn.execute(
            "DELETE FROM documents WHERE id = ?1 AND user_id = ?2",
            (id, user_id),
        )?;
        Ok(())
    }

    pub fn update(conn: &Connection, id: i64, metadata: &str) -> Result<(), AppError> {
        conn.execute(
            "UPDATE documents SET metadata = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            (metadata, id),
        )?;
        Ok(())
    }
}

pub struct AssetRepo;

impl AssetRepo {
    pub fn create(conn: &Connection, user_id: i64, asset_type: &str, path: &str) -> Result<i64, AppError> {
        conn.execute(
            "INSERT INTO assets (user_id, type, path) VALUES (?1, ?2, ?3)",
            (user_id, asset_type, path),
        )?;
        Ok(conn.last_insert_rowid())
    }
}
