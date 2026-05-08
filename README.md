# Piper Reader

Obsidian plugin that reads selected text aloud through a local Piper TTS bridge.

## Architecture

Piper Reader is the Obsidian-facing part of a local TTS pipeline:

```text
Obsidian selected text
-> Piper Reader plugin
-> POST /tts on the local Python bridge
-> Piper Docker over Wyoming TCP
-> WAV bytes
-> Obsidian audio playback
```

The plugin does not save generated audio files. It receives `audio/wav` bytes from
the bridge, creates a browser object URL, and plays it with `HTMLAudioElement`.

## Current Features

- Command: `Read selected text with Piper`
- Command: `Stop Piper reading`
- Command: `Pause or resume Piper reading`
- Status bar controls for pause/resume, back 10s, forward 10s, stop, and speed
- Setting: `Bridge URL`

The plugin expects the bridge at `http://127.0.0.1:5050` by default.

## Spoken Text Preparation

Before text is sent to the bridge, the plugin runs it through
`src/text/prepareTextForSpeech.ts`. This is not a simple sanitizer. Its job is to
translate Obsidian/Markdown structure into speech-friendly prose while preserving
meaning.

Pipeline:

```text
raw selected text
-> omit fenced code blocks
-> convert wiki links and embeds
-> convert Markdown links
-> convert inline code
-> convert line-level Markdown structure
-> normalize unsafe symbols
-> collapse whitespace
```

### Wiki Links

Wiki links are the most important rule set.

Aliases always win because the writer supplied a spoken phrase:

```text
[[Fiction is a flight simulator for social cognition|fiction as safe rehearsal]]
-> fiction as safe rehearsal
```

Noun-phrase links are read directly:

```text
[[Bordwell]]
-> Bordwell
```

Embeds are announced as embedded items:

```text
![[diagram.png]]
-> Embedded item: diagram dot png.
```

Proposition-like links are links whose title reads like a claim or clause. The
detector currently looks for verbs and auxiliaries such as `is`, `are`, `can`,
`proposes`, `presents`, `organizes`, `rehearses`, `shows`, and related forms.

When a proposition-like link is being used as a concept or placeholder, it is
framed as `the idea that ...`:

```text
[[threat dreams rehearse danger without physical consequence]] gives the sharp case
-> the idea that threat dreams rehearse danger without physical consequence gives the sharp case
```

```text
This is why [[dream consciousness presents experience as an immersive world-for-me]] matters.
-> This is why the idea that dream consciousness presents experience as an immersive world-for-me matters.
```

When a proposition-like link is the object of a preposition, it is also framed as
an idea:

```text
Dreaming sits near [[imagination and reality are equal and inseparable]]
-> Dreaming sits near the idea that imagination and reality are equal and inseparable
```

```text
This connects to [[Embodied simulation proposes we understand others by neurally rehearsing their states]]
-> This connects to the idea that embodied simulation proposes we understand others by neurally rehearsing their states
```

When a proposition-like link is the full clause after a clause opener and is
followed by a clause boundary, it stays direct:

```text
If [[emotions can be spatial atmospheres rather than private states]], then ...
-> If emotions can be spatial atmospheres rather than private states, then ...
```

When a proposition-like link introduces an explanation with a direct colon, it
stays direct unless it is also the object of a preposition:

```text
In Gernot Bohme's aesthetics, [[atmospheres are felt spaces between subject and object]]: they are ...
-> In Gernot Bohme's aesthetics, atmospheres are felt spaces between subject and object: they are ...
```

These are heuristics, not a full grammar parser. When a new sentence sounds
wrong, add it as a test case before changing the rule.

### Other Markdown Rules

Markdown links keep their visible label and drop the URL:

```text
[Stanford Encyclopedia](https://example.com)
-> Stanford Encyclopedia
```

Headings are only recognized at the start of a line:

```text
## Historical Background
-> Heading: Historical Background.
```

Inline hashes are not treated as tags:

```text
This mentions #film-theory inline.
-> This mentions #film-theory inline.
```

Blockquotes, tasks, and lists get spoken labels:

```text
> This is quoted.
-> Quote: This is quoted.

- [ ] Read Bordwell
-> Unchecked task: Read Bordwell.

- [x] Watch film
-> Completed task: Watch film.

- item
-> List item: item.
```

Inline code is introduced as a command:

```text
Run `npm run build`
-> Run command npm run build
```

Fenced code blocks are omitted:

```text
fenced code block containing const x = 1;
-> Code block omitted.
```

### Symbol Normalization

The plugin keeps normal sentence punctuation, including long dashes `—`.

Current replacements:

```text
word/word -> word or word
& -> and
% -> percent
+ -> plus
= -> equals
@ -> at
smart quotes -> plain quotes
leftover Markdown/control symbols -> spaces
```

The final step collapses repeated whitespace.

## Development

```bash
cd ~/Documents/repo/obsidian-piper-reader
npm install
npm run dev
```

Run tests:

```bash
npm test
```

## Build

```bash
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` into:

```text
YOUR_VAULT/.obsidian/plugins/obsidian-piper-reader/
```

For the current local vault:

```bash
cp main.js manifest.json styles.css /Users/dco2/Dropbox/PC/Documents/Vault/ROOT/.obsidian/plugins/obsidian-piper-reader/
```

Then reload plugins or restart Obsidian.

## Commit Style

Use conventional commit prefixes:

```text
feat: add a user-facing capability
fix: correct broken behavior
docs: update documentation
test: add or update tests
chore: dependency or tooling maintenance
```
