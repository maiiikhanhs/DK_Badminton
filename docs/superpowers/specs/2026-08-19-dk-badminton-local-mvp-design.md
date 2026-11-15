# DK Badminton Local MVP Design

## Goal

Deliver a Vietnamese, Android-first badminton expense calculator that works entirely offline. Users can create local accounts, keep their sessions isolated from other local accounts, calculate fees, and manage session history.

## Architecture

- React and Hash Router provide the screen flow inside Capacitor WebView.
- AuthService registers, authenticates, restores, and clears local sessions.
- SessionCalculator owns validation and integer-only VND calculations.
- SessionRepository owns session CRUD and enforces `ownerId` on reads and mutations.
- Dexie stores accounts, settings, and badminton sessions in a versioned IndexedDB database.
- UI pages and hooks own loading, form, error, confirmation, and result state.

## Calculation rules

Shuttle cost is shuttle count multiplied by unit price. Total cost is court cost plus shuttle cost. Rule v2 divides the full cost equally, rounded up to 1,000 VND, when only one gender participates. When both genders participate, the female base is total cost minus 15,000 VND per male, divided by all participants, then rounded up to 1,000 VND. Each male pays the rounded female fee plus 15,000 VND. The app stores the rule version, surcharge, calculation snapshot, total collected, and rounding surplus.

Calculation is rejected when there are no participants, inputs are negative or non-integer, or a mixed-gender session's total cost is below the total male surcharge. Rule v1 history retains its stored 20,000 VND surcharge and calculated amounts; editing and recalculating it creates a rule v2 snapshot.

## Local authentication and privacy

Emails are normalized for local uniqueness. Passwords are stored as PBKDF2-HMAC-SHA256 verifiers with a random per-account salt and 600,000 iterations. The active account ID is persisted locally. There is no cloud sync, email verification, password recovery, analytics, or backup.

## User experience

Unauthenticated users see login and registration. Authenticated users reach Home, Create Session, History, Session Detail, and Edit Session. Create and edit use a calculate-then-save flow; any input change invalidates the previous result. Delete requires confirmation.

The visual direction is an offline scorebook on a badminton court: deep court green, warm paper, lime accents, Vietnamese-capable bundled fonts, subtle court markings, and large one-handed controls.

## Verification

Calculator, auth, repository ownership, CRUD ordering, and the end-to-end UI flow are covered by automated tests. Delivery requires lint, tests, production web build, Capacitor sync, Gradle debug APK build, APK metadata verification, and an ADB smoke test on the connected Android 12 device.
