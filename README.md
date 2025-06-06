# MIE Clock

A desktop time tracking app that automatically sends clock in/out notifications to MIE iMessage chats.

## Features

- **Time Tracking**

  - Clock in/out with sound effects
  - Real-time duration tracking
  - Persistent state (localStorage)
  - EST timezone display

- **iMessage Integration**

  - Automatic notifications to MIE chats
  - Chat selection interface
  - Message format:
    ```
    Clock in
    Clock out 10:24 - 7:14pm - 8h50m - 06/04
    ```

- **UI/UX**
  - Clean, modern interface
  - Dark mode support
  - Sound effects
  - Responsive design

## Implementation

- **Frontend (React + TypeScript)**

  - State management with React hooks
  - Local storage for persistence
  - CSS animations and transitions
  - Responsive layout

- **Backend (Tauri + Rust)**
  - AppleScript for iMessage integration
  - Native system integration
  - Secure message handling

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run development:

   ```bash
   npm run tauri dev
   ```

3. Build:
   ```bash
   npm run tauri build
   ```

## Requirements

- macOS (for iMessage)
- Node.js
- Rust
- Xcode Command Line Tools

## License

MIT
