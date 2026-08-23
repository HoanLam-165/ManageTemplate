# Phase 07 — Template Editor

## Objective

Allow users to create and edit templates using the shared editor engine.

## Flows

### Blank template

Blank Template
→ Template Editor
→ add elements
→ arrange
→ metadata
→ Save

### Existing template

Template
→ Edit
→ modify
→ Save

User chooses:
- overwrite;
- create new template.

## Metadata

- name;
- description;
- category;
- thumbnail.

## Preview

Show template preview in the library.

Do not build advanced preview generation if a simple deterministic thumbnail is sufficient.

## Critical rule

Template must not contain real task-specific data unless intentionally fixed text.

## Required tests

- create template;
- save;
- reopen;
- edit;
- overwrite;
- create new;
- preview;
- metadata persistence;
- slot enforcement.

## Independence test

Template A
→ create Template B from A
→ edit B

A must remain unchanged.

## Gate

PASS only when template lifecycle is stable.

Then STOP.
