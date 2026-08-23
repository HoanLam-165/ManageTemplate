# Phase 05 — Editor Foundation

## Objective

Build the reusable coordinate-based A4 editor foundation.

## Model

Page:
- width;
- height;
- orientation;
- margins.

Element:
- id;
- type;
- x;
- y;
- width;
- height;
- zIndex;
- style;
- content/properties.

Coordinates are millimetres.

## Required interactions

- select;
- move;
- resize;
- delete;
- duplicate;
- copy;
- paste;
- zoom;
- grid snap;
- element snap;
- align;
- undo;
- redo.

## First element

Implement Text first.

Do not implement all field types in this phase.

## Save boundary

Editor state is in memory.

Do not write to SQLite continuously while dragging.

Persistence occurs on explicit Save.

## Required tests

- add text;
- move;
- resize;
- delete;
- duplicate;
- copy/paste;
- undo;
- redo;
- zoom;
- snap;
- alignment;
- save;
- reload.

## Important invariant

Changing zoom must never change stored document coordinates.

## Performance smoke test

Create a reasonable stress document with many elements and verify interactions remain usable.

Do not invent a strict maximum unless required by an observed technical limitation.

## Forbidden

Do not implement:
- other element types;
- DOCX production renderer;
- authentication;
- template slot logic.

## Gate

PASS only when coordinates remain stable through save/reload and editor interactions are reliable.

Then STOP.
