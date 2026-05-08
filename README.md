# Piper Reader

Obsidian plugin that reads selected text aloud through a local Piper TTS bridge.

## Development

```bash
cd ~/Documents/repo/obsidian-piper-reader
npm install
npm run dev
```

## Build

```bash
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` into:

```text
YOUR_VAULT/.obsidian/plugins/obsidian-piper-reader/
```

## Current MVP

- Command: `Read selected text with Piper`
- Command: `Stop Piper reading`
- Setting: `Bridge URL`

The plugin expects the bridge at `http://127.0.0.1:5050` by default.
