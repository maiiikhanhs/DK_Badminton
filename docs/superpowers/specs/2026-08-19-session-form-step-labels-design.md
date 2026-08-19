# Session Form Step Labels Cleanup

## Goal

Simplify the create and edit session form by removing the decorative “Bước 01”, “Bước 02”, and “Bước 03” labels.

## Design

- Keep the section icons and the headings “Thông tin buổi chơi”, “Chi phí”, and “Người chơi”.
- Remove only the three step-label elements and their dedicated CSS rule.
- Apply the same presentation to both create and edit routes because they share `SessionFormPage`.
- Keep all fields, validation, calculation, and persistence behavior unchanged.

## Verification

- No “Bước 01/02/03” label appears in create or edit mode.
- The three section headings remain visible and correctly aligned.
- Lint, automated tests, and production build pass.
