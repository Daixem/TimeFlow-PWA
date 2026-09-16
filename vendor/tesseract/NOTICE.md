# TimeFlow OCR vendor files

This directory contains the fixed, locally served OCR runtime used only by the
private schedule image import.

- `tesseract.js` 5.1.1 — Apache-2.0
- `tesseract.js-core` 5.1.1 — Apache-2.0; full license in `core/LICENSE`
- German traineddata 4.0.0 — provided by the Tesseract.js language-data package

The runtime is intentionally served from the TimeFlow origin so the feature does
not depend on a dynamic third-party module import at use time.
