# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron-based desktop wrapper for Messenger.com. It provides a native desktop experience with features like unread message count badges (macOS), automatic UI cleanup (hiding banners and scrollbars), and proper external link handling.

## Development Commands

**Package Manager**: This project uses Bun as its package manager, not npm or yarn.

- Install dependencies: `bun install`
- Run development: `bun start` (bundles preload, compiles TypeScript, and launches Electron)
- Build for current OS: `bun run build` (cleans, bundles, compiles, and builds)
- Build for Windows: `bun run build:win`
- Clean output directories: `bun run clean` (removes `out/` and `dist/`)
- Bundle preload only: `bun run bundle:preload`

**Note**: The `bun start` command runs `bun run bundle:preload && tsc && electron .`. The preload script must be bundled first to work with sandbox mode enabled. Build commands automatically clean output directories to ensure fresh builds with the correct bundled preload script.

## Architecture

### Main Process (src/index.ts)

The entry point that initializes the Electron app. Uses `v8-compile-cache` for faster startup. On macOS, sets the dock icon explicitly. Creates the main window via WindowManager and registers IPC handlers.

### Window Management (src/services/window-manager.ts)

Singleton pattern for managing the main BrowserWindow. Key responsibilities:

- Creates window with contextIsolation and preload script
- Loads messenger.com
- Handles external links: opens messenger.com links in-app, other URLs in system browser
- Injects CSS after page loads via CssInjector

### IPC Communication (src/services/ipc-handlers.ts & src/preload.ts)

**Main process** (ipc-handlers.ts): Registers the `update-badge` handler to update macOS dock badge count.

**Preload script** (preload.ts): Runs in the renderer context with contextBridge API. The BadgeManager class uses MutationObserver to watch the DOM for unread count changes (pattern: "Chats · N unread") and sends updates to the main process via IPC.

**Important**: The preload script is bundled using esbuild (via `scripts/bundle-preload.js`) into a single file at `out/preload.js`. This bundling is required to work with sandbox mode enabled, as sandboxed preload scripts cannot use `require()` for local modules. Note that `src/preload.ts` is excluded from TypeScript compilation in `tsconfig.json` to prevent the bundled version from being overwritten.

### UI Customization (src/utils/css-injector.ts)

Injects CSS to hide "Install Desktop App" banners and scrollbars for a cleaner native experience.

### Configuration (src/config/constants.ts)

Centralized configuration for window dimensions, URLs (messenger.com and allowed origins for Facebook CDN), and file paths. All path references use `__dirname` relative paths to work correctly in the compiled output.

## Key Technical Details

- **Security**:
  - Sandbox mode enabled (`sandbox: true`) for OS-level process isolation
  - `nodeIntegration: false` and `contextIsolation: true` in webPreferences
  - HTTPS-only enforcement for all navigation (no HTTP allowed)
  - Additional hardening: `webSecurity: true`, `allowRunningInsecureContent: false`, `navigateOnDragDrop: false`, `disableBlinkFeatures: 'Auxclick'`
- **Build Process**:
  - Preload script bundled using esbuild (`scripts/bundle-preload.js`)
  - TypeScript compiles from `src/` to `out/` directory
  - All dependencies inlined in bundled preload to work with sandbox mode
- **Assets**: Icon and other assets live in `assets/` directory
  - `icon.icns`: macOS application bundle icon (used by electron-builder) with multiple resolutions for proper dock scaling
  - `icon.png`: Runtime window/dock icon and Windows application icon (512x512)
- **Allowed Origins**: The app permits requests to *.messenger.com, *.facebook.com, and *.fbcdn.net
- **Badge Detection**:
  - Uses MutationObserver with debouncing (500ms) for performance
  - Deduplication prevents redundant IPC messages
  - Supports English ("Chats · N unread") and French ("Chats · N non lus") patterns
