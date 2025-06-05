use std::process::Command;
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn send_imessage_to_chat(guid: String, message: String) {
    let script = format!(r#"
        tell application "Messages"
            set theChat to a reference to text chat id "{}"
            send "{}" to theChat
        end tell
    "#, guid, message);

    let _ = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .expect("Failed to run AppleScript");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet , send_imessage_to_chat])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
