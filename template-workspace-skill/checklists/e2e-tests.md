# MVP End-to-End Tests

## E2E-01 Create Template

Blank Template
→ Add elements
→ Arrange
→ Metadata
→ Save
→ Close
→ Reopen

Expected: identical logical content/layout.

## E2E-02 Use Template

Template
→ Use Template
→ Document
→ Edit
→ Save
→ Reopen

Expected: changes persist.

## E2E-03 Independence

Template
→ Document

Edit Document.

Expected: Template unchanged.

Edit Template.

Expected: Document unchanged.

Delete Template.

Expected: Document remains usable.

## E2E-04 Multi-window

Open A/B/C.

Edit each.

Save each.

Close each.

Reopen each.

Expected: no state mixing.

## E2E-05 DOCX

Open document.
→ Export.
→ Open DOCX.

Expected: valid and visually acceptable.

## E2E-06 Save semantics

Edit → Save → reopen.

Edit → Don't Save → reopen.

Edit → Cancel close.

Expected behavior matches the selected action.
