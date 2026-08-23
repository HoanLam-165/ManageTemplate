# Phase Gate Checklist

For every phase:

- [ ] Preconditions satisfied
- [ ] Only approved scope implemented
- [ ] No future feature implemented
- [ ] No unapproved dependency
- [ ] Tests executed
- [ ] Acceptance criteria checked
- [ ] Known limitations recorded
- [ ] Architecture unchanged unless approved
- [ ] Evidence reported
- [ ] Final status marked PASS/FAIL/BLOCKED
- [ ] Agent stopped after gate

## Critical gates

### DOCX Spike
- [ ] DOCX opens
- [ ] A4 works
- [ ] positioning acceptable
- [ ] text wrapping acceptable
- [ ] images acceptable
- [ ] formatting acceptable

### Data
- [ ] persistence survives restart
- [ ] JSON round-trip works
- [ ] ownership works
- [ ] template/document independence works

### Editor
- [ ] coordinate stability
- [ ] move/resize
- [ ] undo/redo
- [ ] snap/alignment
- [ ] save/reload

### Multi-window
- [ ] 3 documents simultaneously
- [ ] no cross-document state leak
- [ ] no duplicate window for same document

### Export
- [ ] valid DOCX
- [ ] visually acceptable
- [ ] long text preserved
- [ ] images preserved
- [ ] benchmark passes
