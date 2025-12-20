# Messenger Desktop

A lightweight, native-feeling desktop wrapper for [Messenger.com](https://www.messenger.com/), built with Electron.

## Features

- **Native Experience**: Runs as a standalone desktop application.
- **Clean UI**: Automatically hides "Install App" banners and scrollbars for a clutter-free experience.
- **Dock Badges**: Supports unread message count badges on the macOS Dock.


## Prerequisites

- [Bun](https://bun.sh/)

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/tiaaaa123/messenger-desktop.git
   cd messenger-desktop
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Run the application**

   ```bash
   bun start
   ```

## Building the Application

To build the application for production:

```bash
# Build for your current OS
bun run build

# Build specifically for Windows (x64)
bun run build:win
```

The build artifacts will be stored in the `out/` and `dist/` directories (depending on electron-builder configuration).

## Project Structure

- `src/index.ts`: Main process entry point.
- `src/config/`: Configuration constants.
- `src/services/`: Core services (Window management, IPC).
- `src/utils/`: Utility functions (CSS injection).
- `src/preload.ts`: Preload script for secure IPC communication.


## Disclaimer

This project is an unofficial wrapper and is not affiliated with, endorsed, or sponsored by Meta Platforms, Inc. or Facebook. Messenger is a trademark of Meta Platforms, Inc.
