# AGENT.md

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

## Priority Tasks
- Add Memory Manager modal UI (view/edit/delete memory items)
- Inject relevant memory into AI prompt on every message
- Link "Remember this" buttons to save chat entries as memory
- Replace Vivica label in orb mode with profile dropdown
- Ensure voice and text mode use same profile and conversation context

## Expected AI Help
- Generate memory modal UI logic
- Inject memory into prompt flow in `main.js`
- Enhance profile switching logic
- Suggest UI improvements for accessibility and mobile
- Refactor or simplify older JS as needed

## Notes
This is a mostly vanilla JS app (not React). File structure is modular but flat. App state is shared via top-level `window` variables and `localStorage`.

Do **not** use server-side code — everything should run offline in the browser or via Android WebView.

---

