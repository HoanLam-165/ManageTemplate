# Phase 01 — Environment and Project Bootstrap

## Objective

Create a runnable Tauri + React + TypeScript project.

## Preconditions

No existing implementation is assumed.

## Tasks

1. Verify:
   - Node.js
   - npm
   - Rust
   - Cargo
   - Tauri prerequisites

2. Create Tauri application using:
   - React
   - TypeScript
   - Vite

3. Install dependencies.

4. Start development application.

5. Confirm production build works.

## Commands

Use the official current Tauri project-generation command appropriate for the installed Tauri version.

Then run the generated project's install, development, and build commands.

Do not introduce unrelated dependencies.

## Required evidence

Report:
- versions;
- generated project structure;
- development run result;
- production build result.

## Acceptance criteria

- Desktop window opens.
- React UI renders.
- Tauri backend starts.
- Development build succeeds.
- Production build succeeds.

## Forbidden

Do not implement:
- database;
- authentication;
- editor;
- DOCX;
- multi-window;
- templates.

## Gate

PASS only when all acceptance criteria pass.

Then STOP.
