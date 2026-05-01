// Verko Tauri shim — stage 1 PoC.
//
// At this stage the Rust side only exposes a `ping` command so the renderer
// can verify the IPC bridge is alive. All real IO (fs / keychain / dialog)
// still flows through the Electron preload in `src/electron/`. The two
// runtimes are kept side-by-side until stage 2 ports the IO surface.

#[tauri::command]
fn ping() -> &'static str {
    "pong"
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![ping])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
