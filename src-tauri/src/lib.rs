use std::process::Command;
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_mie_chats() -> String {
    let script = r#"
        tell application "Messages"
            set output to ""
            set theChats to chats
            repeat with c in theChats
                try
                    set chatName to name of c
                    if chatName is missing value then set chatName to "[No Name]"
                    
                    -- Match only chats with "MIE" in their name
                    if chatName contains "MIE" then
                        set chatID to id of c
                        if chatID is missing value then set chatID to "[No ID]"
                        
                        set output to output & "Chat Name: " & chatName & " | GUID: " & chatID & return
                    end if
                end try
            end repeat
        end tell
        
        return output
    "#;

    match Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output() {
            Ok(output) => {
                if output.status.success() {
                    String::from_utf8_lossy(&output.stdout).to_string()
                } else {
                    String::new()
                }
            },
            Err(_) => String::new()
        }
}

#[tauri::command]
fn send_imessage_to_chat(guid: String, message: String) {
    let script = format!(r#"
        tell application "Messages"
            set targetService to 1st service whose service type = iMessage
            try
                set targetChat to chat id "{}"
                send "{}" to targetChat
            on error
                try
                    set targetBuddy to buddy "{}" of targetService
                    send "{}" to targetBuddy
                on error
                    set theChats to chats
                    repeat with c in theChats
                        if id of c is "{}" then
                            send "{}" to c
                            exit repeat
                        end if
                    end repeat
                end try
            end try
        end tell
    "#, guid, message, guid, message, guid, message);

    let _ = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, send_imessage_to_chat, get_mie_chats])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
