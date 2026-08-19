# DK Badminton Scaffold Design

## Goal

Create a clean, buildable Android project scaffold in `D:\TT_VF\DK_Badminton` without implementing badminton expense-splitting features yet.

## Chosen stack

- React with TypeScript for the future user interface and application logic.
- Vite for local development and production web builds.
- Capacitor 8 for packaging the web application as an Android application.
- Android Studio and Gradle for native Android builds and device deployment.

This stack keeps the project simple while leaving room for the planned expense-splitting functionality.

## Project identity

- Display name: `DK Badminton`
- Android application ID: `com.dk.badminton`
- Android minimum version: API 24, inherited from Capacitor 8.
- Android target version: API 36, inherited from the installed Capacitor Android template.

## Initial structure

The project will contain Vite and TypeScript configuration, a minimal React entry point, Capacitor configuration, generated Android sources, `.gitignore`, and a concise `README.md`. The initial screen will contain no product functionality or designed interface; it exists only so the application can start successfully.

Generated dependency folders and build outputs such as `node_modules`, `dist`, Android Gradle caches, and APK outputs will not be committed.

## Development workflow

1. Install dependencies with `npm install`.
2. Run the web shell with `npm run dev`.
3. Build web assets with `npm run build`.
4. Copy and synchronize them with `npx cap sync android`.
5. Open the native project with `npx cap open android` or build it with Gradle.

## Error handling

The scaffold has no application data or business operations, so runtime error handling is out of scope. Tooling failures must stop setup and be reported rather than leaving the project presented as complete.

## Verification

- TypeScript and Vite production build succeeds.
- Capacitor Android synchronization succeeds.
- `gradlew assembleDebug` succeeds with JDK 21 and the configured Android SDK.
- The generated APK has application ID `com.dk.badminton` and targets API 36.

Installing the scaffold APK on the connected phone is intentionally excluded from this setup step.

## Version control

Initialize a Git repository, commit this approved design, then commit the generated scaffold after verification.
