# Phase 12 — Polish, Regression, Release Candidate

## Objective

Prepare a stable MVP without expanding scope.

## Polish

Allowed:
- empty states;
- loading states;
- error messages;
- keyboard shortcut hints;
- basic visual consistency;
- simple name search;
- seed template previews;
- onboarding text.

## Regression

Run:
- persistence tests;
- template tests;
- document independence tests;
- multi-window tests;
- DOCX tests;
- save/close tests.

## End-to-end test

New user:

Launch
→ Login
→ Select sample or Blank Template
→ Create/edit template
→ Save
→ Use Template
→ Edit document
→ Save
→ Close
→ Reopen
→ Export DOCX
→ Open DOCX in Word.

## Multi-document E2E

Open:
- Document A;
- Document B;
- Document C.

Edit and save independently.

## Release checks

- clean build;
- installer/package;
- app data location;
- asset storage;
- database initialization;
- migration from existing development database;
- DOCX export on a clean environment.

## Feature freeze

After this phase:
Do not add new MVP features.

## Explicitly do not add

- AI;
- community;
- cloud;
- payment;
- premium marketplace;
- versioning;
- project management.

## Final acceptance

MVP is DONE only if the core flow works reliably:

Template → Document → Edit → Save → DOCX

and the mandatory regression suite passes.

Then STOP.
