# Phase 08 — Document System

## Objective

Implement Use Template → independent Document.

## Core operation

Use Template must perform a deep copy of the template content.

Document receives its own content JSON.

## Document metadata

At minimum:
- id;
- owner;
- name;
- source template ID;
- created timestamp;
- updated timestamp.

## Rules

After creation:
- document is independent;
- document may be freely edited;
- template does not synchronize into document.

## Required tests

1. Use template creates document.
2. Edit document.
3. Template remains unchanged.
4. Edit template.
5. Existing document remains unchanged.
6. Delete template.
7. Existing document remains readable.
8. Save document.
9. Close.
10. Reopen.
11. Save As creates an independent document if implemented in this phase.

## Forbidden

Do not implement:
- version history;
- Git-like history;
- cloud sync;
- collaborative editing.

## Gate

PASS only when independence invariants pass.

Then STOP.
