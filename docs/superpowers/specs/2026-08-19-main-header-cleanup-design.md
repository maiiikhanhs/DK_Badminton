# Main Header Cleanup Design

## Goal

Remove the “Offline” status badge from the authenticated application header so the mobile interface is visually quieter.

## Design

- The authenticated header contains only the compact DK Badminton brand mark.
- Remove the badge markup and its dedicated CSS rules.
- Keep the bottom navigation, routes, offline storage behavior, and all application logic unchanged.

## Verification

- The badge is absent on Home, Create Session, History, Session Detail, and Edit Session.
- The header remains correctly aligned on mobile widths.
- Lint, automated tests, and the production build pass.
