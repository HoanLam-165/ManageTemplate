# Phase 11 — Save and Close Reliability

## Objective

Make manual persistence predictable and safe.

## Save methods

- Ctrl+S;
- File → Save.

## Dirty state

Track whether editor state differs from the last saved state.

Dirty state must be associated with the current editor instance/document.

## Close prompt

When dirty:
- Save;
- Don't Save;
- Cancel.

## Required tests

### Save
Edit → Ctrl+S → close → reopen.

### Don't Save
Edit → close → Don't Save → reopen.

### Cancel
Edit → close → Cancel → editor remains open and changes remain.

### Save failure
Simulate persistence failure if practical.

Expected:
- user is informed;
- in-memory editor state is not silently destroyed.

### Multi-window
Modify A and B.
Save A.
Confirm B remains dirty.

## Forbidden

Do not add autosave.

Do not silently save on close.

## Gate

PASS only when manual save semantics are deterministic.

Then STOP.
