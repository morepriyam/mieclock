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
                    format!("Error: {}", String::from_utf8_lossy(&output.stderr))
                }
            },
            Err(e) => format!("Error executing AppleScript: {}", e)
        }
}

#[tauri::command]
fn send_imessage_to_chat(guid: String, message: String) {
    println!("📱 Attempting to send iMessage to GUID: {}", guid);
    println!("📝 Message content: {}", message);

    let script = format!(r#"
        tell application "Messages"
            set targetService to 1st service whose service type = iMessage
            set targetBuddy to buddy "{}" of targetService
            send "{}" to targetBuddy
        end tell
    "#, guid, message);

    match Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output() {
            Ok(output) => {
                if output.status.success() {
                    println!("✅ iMessage sent successfully!");
                } else {
                    println!("❌ Failed to send iMessage. Error: {}", String::from_utf8_lossy(&output.stderr));
                }
            },
            Err(e) => println!("❌ Error executing AppleScript: {}", e)
        }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, send_imessage_to_chat, get_mie_chats])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
