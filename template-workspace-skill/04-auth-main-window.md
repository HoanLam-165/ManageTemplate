# Phase 04 — Local Authentication and Main Window

## Objective

Implement local identity and the application library window.

## Authentication

Provide:
- account creation;
- login;
- logout.

Password storage must use secure password hashing.

Do not implement cloud authentication.

## Main Window

Show:
- Templates;
- Documents;
- Blank Template;
- search;
- create;
- use template;
- basic metadata.

## Seed templates

Create:
- Test Case;
- Bug Report;
- Meeting Notes;
- Blank Template.

## Template metadata

- name;
- description;
- category;
- thumbnail.

## Template slot rule

Free user:
- maximum 3 stored user-created templates.

Blank Template is not counted as a user template slot.

Implement slot validation centrally.

## Required tests

- User A cannot access User B's templates/documents.
- Login persists identity correctly.
- Logout works.
- Seed templates exist.
- Slot limit is enforced.
- Search by name works.
- Main window can open a selected item.

## Forbidden

Do not implement:
- full editor;
- document editing;
- DOCX export;
- payments;
- premium system.

## Gate

PASS only when identity isolation and library flows work.

Then STOP.
