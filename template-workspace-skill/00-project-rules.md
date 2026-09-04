# Project Rules and Locked Decisions

## Product

Template Workspace is a desktop application for creating, storing, reusing, completing, and exporting work templates.

Core flow:

Template → Document → Edit → Save → Export DOCX

## Product boundaries

MVP manages:
- Templates
- Documents
- Template metadata
- Document editing
- Local ownership
- PDF export

MVP does not manage:
- projects
- teams
- project management
- test management platforms
- AI workflows

## Locked architecture

- Desktop application.
- Tauri.
- React.
- TypeScript.
- Vite.
- Rust for native/backend operations.
- SQLite.
- Local-first storage.
- Hybrid relational metadata + JSON document content.
- Local assets stored separately from JSON.
- No Node.js backend for MVP.
- No Laravel.
- No MySQL.
- No Docker requirement.

## Template model

A template is a document blueprint containing:
- fixed text;
- editable fields/elements;
- page layout;
- formatting;
- element positions.

Template is not a finished document.

## Document model

Using a template creates an independent document by deep copy.

After creation:
- document can be freely edited;
- template changes do not affect existing documents;
- document changes do not affect template;
- deleting a template does not delete documents created from it.

`source_template_id` may be stored only as origin metadata.

## Template modification

When editing a template:
- Overwrite current template
OR
- Create a new template.

No template versioning in MVP.

## Editor

A4 page.

Coordinates are logical millimetres, not persistent screen pixels.

UI may convert mm ↔ screen pixels for rendering.

MVP element types:
- Text
- Number
- Date
- Select
- Checkbox
- Image

MVP editor supports:
- select
- move
- resize
- delete
- duplicate
- copy/paste
- undo/redo
- zoom
- snap
- alignment
- basic formatting

## Content behavior

Do not create separate static-content and dynamic-content systems.

The template contains elements. After cloning, the document editor allows editing according to the element properties.

No real user/business data is embedded into seed templates unless it is intentionally part of fixed template text.

## Window model

Main window:
- template/document library;
- navigation;
- application-level actions.

Template editor:
- separate window.

Document editor:
- separate window.

One document may have only one open editor window.

Opening an already-open document focuses its existing window.

No tab system in MVP.

No artificial maximum number of open document windows.

## Save

Manual save only.

Supported:
- Ctrl+S
- File → Save
- close-window dirty prompt

No autosave in MVP.

## Storage

SQLite stores:
- identity;
- metadata;
- relationships;
- settings.

JSON stores:
- page configuration;
- element structure;
- element properties.

Assets are separate files.

JSON contains asset IDs, not absolute original paths.

JSON must contain a schema version.

## Authentication

Local login is required for ownership/identity.

Passwords must be stored using a secure password hashing mechanism.

No cloud authentication.

## Template slots

MVP free limit:
- 3 user templates.

Blank Template is available separately.

The limit must be implemented as configurable entitlement/business logic, not scattered hard-coded checks.

Do not build payment/subscription in MVP.

## Search

MVP search:
- simple text/name search.

Advanced search is out of scope.

## Export

PDF is mandatory via jsPDF. DOCX rendering failed the technical spike and is permanently out of scope.

## Seed templates

Provide:
1. Test Case
2. Bug Report
3. Meeting Notes
4. Blank Template

## Explicitly out of scope

- AI
- community
- marketplace
- premium template marketplace
- cloud sync
- payments
- template versioning
- template import/export
- complex tables
- advanced search
- mandatory PDF
- autosave
- trash/recycle bin
- project management

These may be reconsidered after MVP validation.
