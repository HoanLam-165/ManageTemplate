# Phase 09 — Multi-window Architecture

## Objective

Allow simultaneous editing of multiple documents using separate windows.

## Window model

Main Window:
- library.

Template Editor Window:
- template editing.

Document Window:
- one document.

## Invariant

One document ID may have at most one open editor window.

Opening an already-open document focuses that window.

## Window identity

Every editor window must know exactly which:
- mode;
- template ID or document ID

it represents.

Do not rely on a global "current document".

## Save

Ctrl+S must save the document associated with the current window.

## Close

If dirty:
- Save;
- Don't Save;
- Cancel.

## Main window synchronization

After save/close, library metadata must refresh appropriately.

## Required tests

Open:
- Document A;
- Document B;
- Document C.

Edit all three.

Save all three.

Close all three.

Reopen all three.

Then attempt to open A again.

Expected:
- existing A window is focused;
- no duplicate editor is created.

## Forbidden

Do not implement:
- tabs;
- artificial maximum open windows;
- multi-user collaboration.

## Gate

PASS only when at least three concurrent documents remain isolated.

Then STOP.
