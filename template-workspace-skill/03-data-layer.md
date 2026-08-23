# Phase 03 — Data Layer

## Objective

Implement persistence using SQLite + JSON + local assets.

## Approved model

SQLite:
- users
- templates
- documents
- categories
- assets
- app_settings

JSON:
- page
- elements
- element properties
- schema version

Assets:
- local files
- referenced by asset ID

## Rules

React must not directly manipulate SQLite.

Use:
React
→ service
→ Tauri command
→ Rust
→ SQLite/filesystem

## Tasks

1. Add SQLite.
2. Create migrations.
3. Create repositories/services.
4. Create JSON schema v1.
5. Implement serialization/deserialization.
6. Implement asset storage abstraction.
7. Implement basic migration handling.

## Required tests

- create record;
- read record;
- update record;
- delete record;
- save JSON;
- load JSON;
- JSON round-trip;
- database survives application restart;
- migration works;
- asset reference survives restart.

## Critical independence test

Create Template A.
Create Document A from Template A.
Delete Template A.
Document A must remain readable.

## Forbidden

Do not implement:
- UI;
- login screens;
- editor;
- DOCX renderer;
- cloud.

## Gate

PASS only when persistence and round-trip tests pass.

Then STOP.
