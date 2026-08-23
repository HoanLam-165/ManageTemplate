# Phase 06 — Element System

## Objective

Add the approved MVP element types.

## Types

### Text
Properties:
- content;
- editable/fixed state;
- font family;
- font size;
- bold;
- italic;
- underline;
- alignment.

### Number
Properties:
- value;
- basic formatting if already supported without architectural expansion.

### Date
Properties:
- value;
- format.

### Select
Properties:
- options;
- selected value.

### Checkbox
Properties:
- checked.

### Image
Properties:
- asset ID;
- width;
- height.

## Rules

Do not create a separate static/dynamic architecture.

All elements are represented by the common element model.

## Required tests

Every element type must:
- create;
- edit;
- move;
- resize;
- delete;
- save;
- reload.

Additional:
- Select preserves options.
- Image asset reference survives reload.
- Text formatting survives reload.

## Forbidden

Do not add:
- tables;
- rich text editor;
- URLs as a special system;
- formulas;
- custom scripting;
- new element types without approval.

## Gate

PASS only when all approved element types round-trip correctly.

Then STOP.
