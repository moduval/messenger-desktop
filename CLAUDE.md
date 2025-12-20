# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron-based desktop wrapper for Messenger.com. It provides a native desktop experience with features like unread message count badges (macOS), automatic UI cleanup (hiding banners and scrollbars), and proper external link handling.

## Development Commands

**Package Manager**: This project uses Bun as its package manager, not npm or yarn.

- Install dependencies: `bun install`
- Run development: `bun start` (compiles TypeScript and launches Electron)
- Build for current OS: `bun run build`
- Build for Windows: `bun run build:win`

**Note**: The `bun start` command runs `tsc && electron .`, which compiles TypeScript to the `out/` directory before launching.

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

**Preload script** (preload.ts): Runs in the renderer context with node access. The BadgeManager class uses MutationObserver to watch the DOM for unread count changes (pattern: "Chats · N unread") and sends updates to the main process via IPC.

### UI Customization (src/utils/css-injector.ts)
Injects CSS to hide "Install Desktop App" banners and scrollbars for a cleaner native experience.

### Configuration (src/config/constants.ts)
Centralized configuration for window dimensions, URLs (messenger.com and allowed origins for Facebook CDN), and file paths. All path references use `__dirname` relative paths to work correctly in the compiled output.

## Key Technical Details

- **Security**: Uses `nodeIntegration: false` and `contextIsolation: true` in webPreferences
- **Compilation**: TypeScript compiles from `src/` to `out/` directory
- **Assets**: Icon and other assets live in `assets/` directory
- **Allowed Origins**: The app permits requests to *.messenger.com, *.facebook.com, and *.fbcdn.net
- **Badge Detection**: The preload script searches all DOM elements for aria-labels matching the unread count pattern