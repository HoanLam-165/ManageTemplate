use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub password_hash: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Template {
    pub id: i64,
    pub user_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub category_id: Option<i64>,
    pub thumbnail_asset_id: Option<i64>,
    pub metadata: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Document {
    pub id: i64,
    pub user_id: i64,
    pub source_template_id: Option<i64>,
    pub name: String,
    pub metadata: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Asset {
    pub id: i64,
    pub user_id: i64,
    pub asset_type: String,
    pub path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppSetting {
    pub key: String,
    pub value: String,
}

// --- JSON Content Models ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DocumentContent {
    pub schema_version: String,
    pub page: PageConfiguration,
    pub elements: Vec<Element>,
}

impl DocumentContent {
    pub fn default_content() -> Self {
        DocumentContent {
            schema_version: "1.0".to_string(),
            page: PageConfiguration {
                width_mm: 210.0,
                height_mm: 297.0,
                margin_left_mm: 20.0,
                margin_right_mm: 20.0,
                margin_top_mm: 20.0,
                margin_bottom_mm: 20.0,
            },
            elements: Vec::new(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PageConfiguration {
    pub width_mm: f64,
    pub height_mm: f64,
    pub margin_left_mm: f64,
    pub margin_right_mm: f64,
    pub margin_top_mm: f64,
    pub margin_bottom_mm: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Element {
    pub id: String,
    pub element_type: ElementType,
    pub position_x_mm: f64,
    pub position_y_mm: f64,
    pub width_mm: f64,
    pub height_mm: f64,
    pub properties: ElementProperties,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum ElementType {
    Text,
    Number,
    Date,
    Select,
    Checkbox,
    Image,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum ElementProperties {
    Text { 
        content: String,
        font_family: String,
        font_size: f64,
        is_bold: bool,
        is_italic: bool,
        is_underline: bool,
        alignment: String 
    },
    Number { value: f64 },
    Date { value: String, format: String },
    Select { options: Vec<String>, selected: Option<String> },
    Checkbox { checked: bool },
    Image { asset_id: i64 },
}
