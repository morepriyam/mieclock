# MIEclock

A time tracking app with iMessage notifications built with Tauri and React.

## Features

- Clock in/out with simple UI
- Automatic iMessage notifications
- Time tracking with session history

## Technical Summary

### App.tsx

```tsx
// Send iMessage notification on clock action
await invoke("send_imessage_to_chat", {
  guid: chatId,
  message: isClockedIn ? `Clock Out - ${time}` : `Clock In - ${time}`,
});
```

### lib.rs

```rust
// Send iMessages via AppleScript
#[tauri::command]
fn send_imessage_to_chat(guid: String, message: String) {
    // AppleScript implementation to send iMessages
}
```

## Setup

Enable Messages permissions:

1. System Settings → Privacy → Automation
2. Allow MIEclock to control Messages

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
