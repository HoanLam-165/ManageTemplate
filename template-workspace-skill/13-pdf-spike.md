# Phase 03 — PDF Technical Spike

## Objective
Prove that the document model can produce a high-fidelity PDF render that perfectly matches the absolute positioning, overlap, and mm-based layout required by the MVP editor.

## Why this phase exists
DOCX spike failed because the format is flow-based, not canvas-based. PDF is a canvas-based format and is the natural target for absolute-positioning requirements.

## Coordinate Requirement
- The logical model MUST use millimetres.
- The renderer MUST map millimetres to PDF points (1mm ≈ 2.83465 pt).
- Absolute positioning and overlap MUST be native to the rendering approach.

## Acceptance Criteria
1. **Perfect Position:** Elements are positioned at their exact $(x, y)$ coordinates.
2. **Overlap:** Overlapping elements render correctly according to z-index.
3. **A4/Orientation:** Page size and orientation (Portrait/Landscape) are precise.
4. **Font/Image:** Basic font formatting and image placement are high-fidelity.
5. **No Corruption:** Generated PDF is standards-compliant and opens in standard viewers.

## Gate Decision
PASS: PDF rendering perfectly supports the absolute positioning and overlap required by the MVP editor model.

FAIL: Renderer cannot reliably support the absolute model.
If FAIL: STOP and report alternatives. Do not redesign silently.

## Required report
- Library/Approach chosen (e.g., `pdfkit`, `jspdf`, `react-pdf`, headless canvas rendering);
- Why;
- Sample PDF;
- Coordinate conversion behavior (mm to points);
- PASS/FAIL.
