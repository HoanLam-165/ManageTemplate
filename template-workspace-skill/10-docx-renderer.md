# Phase 10 — Production DOCX Renderer

## Objective

Turn the validated DOCX spike into the MVP export system.

## Input

Document content JSON.

## Output

DOCX file.

## Supported MVP mapping

- Text → positioned text.
- Number → text.
- Date → formatted text.
- Select → selected text.
- Checkbox → visual/text representation.
- Image → positioned image.

## Layout

- A4;
- portrait;
- landscape;
- margins;
- millimetre coordinates.

## Rendering principles

Editor coordinates are the source of truth.

Do not modify document coordinates just for export.

If Word has a limitation:
- document the limitation;
- implement the least surprising fallback;
- do not silently change the editor model.

If the limitation requires architectural change:
STOP and request approval.

## Required benchmark

Create one canonical export test document containing:
- short text;
- long text;
- formatting;
- all element types;
- images;
- alignment;
- close elements;
- multiple pages if supported.

## Acceptance criteria

- DOCX opens without corruption.
- A4 is correct.
- Positioning is reasonably close.
- Long text is not silently lost.
- Basic formatting works.
- Images render.
- Export is repeatable.
- Editor and DOCX are visually comparable for supported content.

## Regression

Re-run the Phase 02 spike tests.

## Gate

FAIL if export is merely "technically valid" but visually unusable.

Then STOP.
