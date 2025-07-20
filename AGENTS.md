# AGENTS.md

## Project Name
Vivica: Local-First AI Assistant with Voice and Memory

## Purpose
Vivica is a local-first AI assistant web app with text and voice modes. It supports customizable AI profiles, memory management, offline PWA usage, and Android WebView integration.

Users can chat or talk to Vivica using multiple AI personas (e.g., snarky roaster, helpful assistant). Conversations, memory snippets, and settings are stored in IndexedDB for persistence. Profiles define LLM behavior (model, system prompt, temperature, etc.).

## Key Features
- Chat and voice modes using the same memory and profile
- Local-only memory system (editable, taggable, infinite)
- AI profile system with persistent config per persona
- IndexedDB for conversations, messages, memory, profiles
- Theme switching (dark/light + color themes)
- Voice support via Web Speech API and/or Google TTS
- Android bridge for native logs and toasts
- Fully installable PWA

## App Architecture
- `index.html`: root HTML shell, app entry
- `main.js`: orchestrates app logic, prompt sending, DOM updates
- `voice-mode.js`: handles speech recognition, synthesis, and visualizer
- `storage-wrapper.js`: IndexedDB CRUD for conversations, profiles, memory
- `db-utils.js`: low-level IndexedDB ops
- `theme-toggle.js`: manages theme state and switching
- `android-bridge.js`: interface for Android WebView events
- `service-worker.js` + `manifest.json`: enable PWA install and offline use

## Vivica App Polish TODOs

- [ ] Fix/clarify profile switching (no refresh required, always updates current chat)
- [ ] Investigate/tweak scroll-to-bottom button logic or just remove if not needed
- [ ] Always show sidebar conversation action buttons (desktop & mobile)
      - Or: Implement long-press (mobile) and right-click (desktop) for action menu
- [ ] Move "Summarize & Save" to a persistent, obvious location in chat UI
- [ ] Remove Quick Actions from welcome screen; replace with something useful:
      - Welcome home, stats, recent activity, Vivica’s sassy message, etc.
      - Make Vivica logo/name in sidebar always return to welcome
- [ ] (Optional) Enhance the welcome screen with per-profile stats/snark
- [ ] Keep orb, keep logo handling as-is—no change needed

## Stretch:
- [ ] Add full import/export for ALL data (not just memory)
- [ ] Optionally: Add a "Power Mode" toggle for advanced features

## Notes
This is a mostly vanilla JS app (not React). File structure is modular but flat. App state is shared via top-level `window` variables and `localStorage`.

Do **not** use server-side code — everything should run offline in the browser or via Android WebView.

---

