#[cfg(test)]
mod tests {
    use crate::db;
    use crate::models::*;
    use crate::repo::{TemplateRepo, DocumentRepo, UserRepo};
    use std::path::Path;

    #[test]
    fn test_comprehensive_independence() {
        let conn = db::init_db_in_memory().expect("Failed to init in-memory db");
        let user_id = UserRepo::create(&conn, "testuser", "password").unwrap();

        // Test A: Template -> Document snapshot
        let template_json = r#"{
            "schema_version": "1",
            "page": {"width_mm": 210.0, "height_mm": 297.0, "margin_left_mm": 20.0, "margin_right_mm": 20.0, "margin_top_mm": 20.0, "margin_bottom_mm": 20.0},
            "elements": [
                {"id": "1", "element_type": "Text", "position_x_mm": 10.0, "position_y_mm": 10.0, "width_mm": 50.0, "height_mm": 10.0, "properties": {"type": "Text", "content": "Original Template", "font_family": "Arial", "font_size": 12.0, "is_bold": false, "is_italic": false, "is_underline": false, "alignment": "left"}}
            ]
        }"#;
        let template_id = TemplateRepo::create(&conn, user_id, "Template A", template_json).unwrap();
        let doc_id = DocumentRepo::create(&conn, user_id, "Document A", Some(template_id), None).unwrap();

        let doc = DocumentRepo::get_by_user(&conn, user_id).unwrap().into_iter().find(|d| d.id == doc_id).unwrap();
        
        let doc_json: serde_json::Value = serde_json::from_str(&doc.metadata).unwrap();
        let template_json_val: serde_json::Value = serde_json::from_str(template_json).unwrap();
        assert_eq!(doc_json, template_json_val, "Document metadata should match template snapshot initially");

        // Test B: Template modification isolation
        let updated_template_json = r#"{
            "schema_version": "1",
            "page": {"width_mm": 210, "height_mm": 297, "margin_left_mm": 20, "margin_right_mm": 20, "margin_top_mm": 20, "margin_bottom_mm": 20},
            "elements": [
                {"id": "1", "element_type": "Text", "position_x_mm": 10, "position_y_mm": 10, "width_mm": 50, "height_mm": 10, "properties": {"type": "Text", "content": "MODIFIED Template", "font_family": "Arial", "font_size": 12, "is_bold": false, "is_italic": false, "is_underline": false, "alignment": "left"}}
            ]
        }"#;
        TemplateRepo::update(&conn, template_id, "Template A Updated", None, updated_template_json).unwrap();
        
        let doc_after_template_update = DocumentRepo::get_by_user(&conn, user_id).unwrap().into_iter().find(|d| d.id == doc_id).unwrap();
        
        let doc_json_val: serde_json::Value = serde_json::from_str(&doc_after_template_update.metadata).unwrap();
        let template_json_val: serde_json::Value = serde_json::from_str(template_json).unwrap();
        
        assert_eq!(doc_json_val, template_json_val, "Document metadata must NOT change when template is updated");

        // Test C: Document modification isolation
        let updated_doc_json = r#"{
            "schema_version": "1",
            "page": {"width_mm": 210, "height_mm": 297, "margin_left_mm": 20, "margin_right_mm": 20, "margin_top_mm": 20, "margin_bottom_mm": 20},
            "elements": [
                {"id": "1", "element_type": "Text", "position_x_mm": 10, "position_y_mm": 10, "width_mm": 50, "height_mm": 10, "properties": {"type": "Text", "content": "MODIFIED Document", "font_family": "Arial", "font_size": 12, "is_bold": false, "is_italic": false, "is_underline": false, "alignment": "left"}}
            ]
        }"#;
        conn.execute("UPDATE documents SET metadata = ?1 WHERE id = ?2", (updated_doc_json, doc_id)).unwrap();
        
        let template_after_doc_update = TemplateRepo::get_by_user(&conn, user_id).unwrap().into_iter().find(|t| t.id == template_id).unwrap();
        assert_eq!(template_after_doc_update.metadata, updated_template_json, "Template metadata must NOT change when document is updated");

        // Test D: Template deletion isolation
        conn.execute("DELETE FROM templates WHERE id = ?1", [template_id]).unwrap();
        let doc_after_template_deletion = DocumentRepo::get_by_user(&conn, user_id).unwrap().into_iter().find(|d| d.id == doc_id).unwrap();
        assert_eq!(doc_after_template_deletion.metadata, updated_doc_json, "Document content must remain intact after template deletion");
        assert_eq!(doc_after_template_deletion.source_template_id, None, "source_template_id should be NULL (SET NULL) after template deletion");

        // Test F: Nested JSON independence (Implicit in Test A-C, but verified by property change)
        assert!(doc_after_template_deletion.metadata.contains("MODIFIED Document"));
    }

    #[test]
    fn test_persistence_reload() {
        use std::fs;
        let db_file = "test_persistence.db";
        if Path::new(db_file).exists() { fs::remove_file(db_file).unwrap(); }

        {
            let conn = db::init_db_connection(db_file).expect("Failed to init file db");
            let user_id = UserRepo::create(&conn, "persisted_user", "password").unwrap();
            let template_id = TemplateRepo::create(&conn, user_id, "Template", "{\"key\":\"original\"}").unwrap();
            DocumentRepo::create(&conn, user_id, "Doc", Some(template_id), None).unwrap();
            // Close connection by dropping
        }

        {
            let conn = db::init_db_connection(db_file).expect("Failed to reopen file db");
            let user = UserRepo::find_by_username(&conn, "persisted_user").unwrap().unwrap();
            let templates = TemplateRepo::get_by_user(&conn, user.id).unwrap();
            let docs = DocumentRepo::get_by_user(&conn, user.id).unwrap();
            
            assert_eq!(templates.len(), 1);
            assert_eq!(docs.len(), 1);
            assert_eq!(docs[0].metadata, "{\"key\":\"original\"}");
            
            // Further prove independence after reload
            TemplateRepo::update(&conn, templates[0].id, "Updated", None, "{\"key\":\"modified\"}").unwrap();
            let doc_after_reload_and_update = DocumentRepo::get_by_user(&conn, user.id).unwrap();
            assert_eq!(doc_after_reload_and_update[0].metadata, "{\"key\":\"original\"}");
        }

        fs::remove_file(db_file).unwrap();
    }

    #[test]
    fn test_template_to_document_copy_and_independence() {
        let conn = db::init_db_in_memory().expect("Failed to init in-memory db");
        let user_id = UserRepo::create(&conn, "testuser", "password").unwrap();

        // 1. Create a template with elements
        let populated_content = crate::repo::get_populated_content("Bug Report");
        let metadata = serde_json::to_string(&populated_content).unwrap();
        let template_id = TemplateRepo::create(&conn, user_id, "Bug Report Template", &metadata).unwrap();

        // 2. Use Template to create a Document
        let doc_id = DocumentRepo::create(&conn, user_id, "New Document", Some(template_id), None).unwrap();

        // 3. Verify Document has the same elements
        let docs = DocumentRepo::get_by_user(&conn, user_id).unwrap();
        let doc = docs.iter().find(|d| d.id == doc_id).unwrap();
        let doc_content: DocumentContent = serde_json::from_str(&doc.metadata).unwrap();
        
        assert_eq!(doc_content.elements.len(), populated_content.elements.len(), "Document should have the same number of elements as Template");

        // 4. Modify Document and verify Template is unchanged
        let mut modified_content = doc_content;
        modified_content.elements[0].properties = ElementProperties::Text {
            content: "Modified".into(),
            font_family: "Arial".into(),
            font_size: 12.0,
            is_bold: true,
            is_italic: false,
            is_underline: false,
            alignment: "left".into(),
        };
        DocumentRepo::update(&conn, doc_id, &serde_json::to_string(&modified_content).unwrap()).unwrap();

        let templates = TemplateRepo::get_by_user(&conn, user_id).unwrap();
        let template = templates.iter().find(|t| t.id == template_id).unwrap();
        let template_content: DocumentContent = serde_json::from_str(&template.metadata).unwrap();

        let template_first_el_content = if let ElementProperties::Text { content, .. } = &template_content.elements[0].properties {
            content
        } else {
            ""
        };
        
        assert_ne!(template_first_el_content, "Modified", "Template should not be modified by Document changes");
    }

    #[test]
    fn test_seeded_template_repair() {
        let conn = db::init_db_in_memory().expect("Failed to init in-memory db");
        let user_id = UserRepo::create(&conn, "repairuser", "password").unwrap();
        
        // 1. Manually create a "Bug Report" template that is empty and has created_at == updated_at
        // This simulates a broken state that should be repaired.
        let empty_content = serde_json::to_string(&DocumentContent::default_content()).unwrap();
        conn.execute(
            "INSERT INTO templates (user_id, name, metadata, created_at, updated_at) VALUES (?1, ?2, ?3, '2026-08-01 00:00:00', '2026-08-01 00:00:00')",
            (user_id, "Bug Report", &empty_content),
        ).unwrap();
        
        // 2. Run the repair
        TemplateRepo::seed_for_user(&conn, user_id).unwrap();
        
        // 3. Verify it's now populated
        let templates = TemplateRepo::get_by_user(&conn, user_id).unwrap();
        let bug_report = templates.iter().find(|t| t.name == "Bug Report").unwrap();
        let content: DocumentContent = serde_json::from_str(&bug_report.metadata).unwrap();
        assert!(!content.elements.is_empty(), "Bug Report should be repaired and populated");

        // 4. Manually create a "Test Case" template, but modify it
        // This simulates a user-modified template that SHOULD NOT be repaired.
        // We populate it with content, so even if the repair logic ran, it would skip it because content is NOT empty.
        // But to be even more sure, we set updated_at != created_at.
        let populated_content = serde_json::to_string(&crate::repo::get_populated_content("Test Case")).unwrap();
        conn.execute(
            "INSERT INTO templates (user_id, name, metadata, created_at, updated_at) VALUES (?1, ?2, ?3, '2026-08-01 00:00:00', '2026-08-01 01:00:00')",
            (user_id, "Test Case", &populated_content),
        ).unwrap();
        
        TemplateRepo::seed_for_user(&conn, user_id).unwrap();
        
        let templates = TemplateRepo::get_by_user(&conn, user_id).unwrap();
        let test_case = templates.iter().find(|t| t.name == "Test Case").unwrap();
        assert_eq!(test_case.metadata, populated_content, "Modified Test Case should NOT be repaired and content should remain unchanged");
    }

    #[test]
    fn test_template_slot_limit() {
        let conn = db::init_db_in_memory().expect("Failed to init in-memory db");
        let user_id = UserRepo::create(&conn, "testuser", "password").expect("Failed to create user");
        TemplateRepo::seed_for_user(&conn, user_id).unwrap();

        assert_eq!(TemplateRepo::count_for_user(&conn, user_id).unwrap(), 3);

        let default_content = serde_json::to_string(&DocumentContent::default_content()).unwrap();
        let result = TemplateRepo::create(&conn, user_id, "New Template", &default_content);
        assert!(result.is_err());
    }

    #[test]
    fn test_user_isolation() {
        let conn = db::init_db_in_memory().expect("Failed to init in-memory db");
        let user_a = UserRepo::create(&conn, "userA", "password").unwrap();
        let user_b = UserRepo::create(&conn, "userB", "password").unwrap();

        let default_content = serde_json::to_string(&DocumentContent::default_content()).unwrap();
        TemplateRepo::create(&conn, user_a, "Template A", &default_content).unwrap();

        let templates_b = TemplateRepo::get_by_user(&conn, user_b).unwrap();
        assert!(templates_b.is_empty());
    }

    #[test]
    fn test_element_system_roundtrip() {
        let conn = db::init_db_in_memory().expect("Failed to init in-memory db");
        let user_id = UserRepo::create(&conn, "testuser", "password").unwrap();

        let content = DocumentContent {
            schema_version: "1".to_string(),
            page: PageConfiguration {
                width_mm: 210.0, height_mm: 297.0,
                margin_left_mm: 20.0, margin_right_mm: 20.0,
                margin_top_mm: 20.0, margin_bottom_mm: 20.0,
            },
            elements: vec![
                Element {
                    id: "el1".to_string(),
                    element_type: ElementType::Text,
                    position_x_mm: 10.0, position_y_mm: 10.0,
                    width_mm: 50.0, height_mm: 10.0,
                    properties: ElementProperties::Text {
                        content: "Hello".to_string(),
                        font_family: "Arial".to_string(),
                        font_size: 12.0,
                        is_bold: true,
                        is_italic: false,
                        is_underline: false,
                        alignment: "left".to_string(),
                    },
                }
            ],
        };

        let serialized = serde_json::to_string(&content).unwrap();
        let doc_id = DocumentRepo::create(&conn, user_id, "Test Doc", None, Some(&serialized)).unwrap();
        
        let docs = DocumentRepo::get_by_user(&conn, user_id).unwrap();
        let doc = docs.iter().find(|d| d.id == doc_id).unwrap();
        
        let deserialized: DocumentContent = serde_json::from_str(&doc.metadata).unwrap();
        assert_eq!(deserialized.elements.len(), 1);
        
        if let ElementProperties::Text { content, is_bold, .. } = &deserialized.elements[0].properties {
            assert_eq!(content, "Hello");
            assert!(is_bold);
        } else {
            panic!("Wrong element type");
        }
    }

    #[test]
    fn test_timestamp_behavior() {
        use std::thread::sleep;
        use std::time::Duration;
        use std::fs;

        let conn = db::init_db_in_memory().expect("Failed to init in-memory db");
        let user_id = UserRepo::create(&conn, "timestamp_user", "password").unwrap();

        // Test A: Creation timestamp
        let default_content = serde_json::to_string(&DocumentContent::default_content()).unwrap();
        let template_id = TemplateRepo::create(&conn, user_id, "Template", &default_content).unwrap();
        let doc_id = DocumentRepo::create(&conn, user_id, "Doc", Some(template_id), None).unwrap();

        let templates = TemplateRepo::get_by_user(&conn, user_id).unwrap();
        let template = templates.iter().find(|t| t.id == template_id).unwrap();
        let docs = DocumentRepo::get_by_user(&conn, user_id).unwrap();
        let doc = docs.iter().find(|d| d.id == doc_id).unwrap();

        assert!(!template.created_at.is_empty(), "Template created_at must be populated");
        assert!(!template.updated_at.is_empty(), "Template updated_at must be populated");
        assert!(!doc.created_at.is_empty(), "Document created_at must be populated");
        assert!(!doc.updated_at.is_empty(), "Document updated_at must be populated");

        // Test B: Creation ordering
        assert!(template.created_at <= template.updated_at, "Template created_at <= updated_at");
        assert!(doc.created_at <= doc.updated_at, "Document created_at <= updated_at");

        let doc_created_at_init = doc.created_at.clone();
        let doc_updated_at_init = doc.updated_at.clone();
        let template_created_at_init = template.created_at.clone();
        let template_updated_at_init = template.updated_at.clone();

        // Test C: Update timestamp (Sleep 1s for SQLite CURRENT_TIMESTAMP resolution)
        sleep(Duration::from_secs(1));

        DocumentRepo::update(&conn, doc_id, "{\"updated\": true}").unwrap();
        
        let docs_after_update = DocumentRepo::get_by_user(&conn, user_id).unwrap();
        let doc_after_update = docs_after_update.iter().find(|d| d.id == doc_id).unwrap();

        assert_eq!(doc_after_update.created_at, doc_created_at_init, "Document created_at must not change on update");
        assert!(doc_after_update.updated_at > doc_updated_at_init, "Document updated_at must advance on update");

        // Test E: Template-document isolation
        let templates_after_doc_update = TemplateRepo::get_by_user(&conn, user_id).unwrap();
        let template_after_doc_update = templates_after_doc_update.iter().find(|t| t.id == template_id).unwrap();
        assert_eq!(template_after_doc_update.created_at, template_created_at_init, "Template created_at unchanged");
        assert_eq!(template_after_doc_update.updated_at, template_updated_at_init, "Template updated_at unchanged after doc update");

        // Update Template
        TemplateRepo::update(&conn, template_id, "Template Updated", None, "{\"updated\": true}").unwrap();
        let templates_after_template_update = TemplateRepo::get_by_user(&conn, user_id).unwrap();
        let template_after_template_update = templates_after_template_update.iter().find(|t| t.id == template_id).unwrap();
        assert_eq!(template_after_template_update.created_at, template_created_at_init, "Template created_at remains unchanged");
        assert!(template_after_template_update.updated_at > template_updated_at_init, "Template updated_at must advance on update");

        let docs_after_template_update = DocumentRepo::get_by_user(&conn, user_id).unwrap();
        let doc_after_template_update = docs_after_template_update.iter().find(|d| d.id == doc_id).unwrap();
        assert_eq!(doc_after_template_update.updated_at, doc_after_update.updated_at, "Document updated_at unchanged after template update");

        // Test D: Persistence/reload
        let db_file = "test_persistence_timestamps.db";
        if Path::new(db_file).exists() { fs::remove_file(db_file).unwrap(); }

        let saved_created_at: String;
        let saved_updated_at: String;

        {
            let conn_file = db::init_db_connection(db_file).expect("Failed to init file db");
            let f_user_id = UserRepo::create(&conn_file, "f_user", "password").unwrap();
            let f_doc_id = DocumentRepo::create(&conn_file, f_user_id, "PersistedDoc", None, None).unwrap();
            let f_docs = DocumentRepo::get_by_user(&conn_file, f_user_id).unwrap();
            let f_doc = f_docs.iter().find(|d| d.id == f_doc_id).unwrap();
            saved_created_at = f_doc.created_at.clone();
            saved_updated_at = f_doc.updated_at.clone();
        }

        {
            let conn_file = db::init_db_connection(db_file).expect("Failed to reopen file db");
            let f_user = UserRepo::find_by_username(&conn_file, "f_user").unwrap().unwrap();
            let f_docs = DocumentRepo::get_by_user(&conn_file, f_user.id).unwrap();
            assert_eq!(f_docs.len(), 1);
            assert_eq!(f_docs[0].created_at, saved_created_at, "Persisted created_at matches");
            assert_eq!(f_docs[0].updated_at, saved_updated_at, "Persisted updated_at matches");
        }

        fs::remove_file(db_file).unwrap();
    }
}
