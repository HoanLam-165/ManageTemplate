# Phase 02 — DOCX Technical Spike

## Objective

Prove that the chosen document model can produce a usable DOCX before building the full editor.

## Why this phase exists

DOCX layout is the highest-risk technical part of the MVP.

Do not spend weeks building an editor around an export architecture that has not been validated.

## Scope

Build only a small experimental pipeline:

JSON document
→ renderer
→ DOCX
→ Microsoft Word inspection

## Test document

Create an A4 test document containing:
- short text;
- long text;
- bold;
- italic;
- different font sizes;
- left/center/right alignment;
- image;
- multiple positioned elements;
- nearby elements;
- overlapping elements;
- portrait;
- landscape.

## Coordinate requirement

The logical model must use millimetres.

Screen pixels must not become persistent document coordinates.

## Required investigation

Determine how the selected DOCX library represents:
- positioned text;
- images;
- font size;
- alignment;
- wrapping;
- page size;
- margins.

## Do not

Do not build:
- full editor;
- database;
- authentication;
- template system;
- document windows.

## Acceptance criteria

1. Generated DOCX opens without corruption.
2. A4 size is correct.
3. Portrait and landscape are supported.
4. Text positions are reasonably close to the source coordinates.
5. Long text does not silently disappear.
6. Basic font formatting works.
7. Image appears with acceptable size and position.
8. Multiple elements can coexist.
9. Renderer limitations are documented.

## Gate decision

PASS:
DOCX can support the approved MVP editor model with acceptable limitations.

FAIL:
Renderer cannot reliably support the required model.

If FAIL:
STOP and report alternatives. Do not redesign silently.

## Required report

Include:
- library chosen;
- why;
- sample DOCX;
- known limitations;
- coordinate conversion behavior;
- recommendation;
- PASS/FAIL.
