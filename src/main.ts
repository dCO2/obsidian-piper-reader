import {
  App,
  Editor,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
} from "obsidian";

import { prepareTextForSpeech } from "./text/prepareTextForSpeech";

interface PiperReaderSettings {
  bridgeUrl: string;
}

const DEFAULT_SETTINGS: PiperReaderSettings = {
  bridgeUrl: "http://127.0.0.1:5050",
};

export default class PiperReaderPlugin extends Plugin {
  settings: PiperReaderSettings = DEFAULT_SETTINGS;
  currentAudio: HTMLAudioElement | null = null;
  currentObjectUrl: string | null = null;
  statusBarEl: HTMLElement | null = null;
  playbackRate = 1;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.statusBarEl = this.addStatusBarItem();
    this.renderPlaybackControls();

    this.addCommand({
      id: "read-selection-with-piper",
      name: "Read selected text with Piper",
      editorCallback: async (editor: Editor) => {
        const text = editor.getSelection().trim();

        if (!text) {
          new Notice("Select text first.");
          return;
        }

        await this.readText(text);
      },
    });

    this.addCommand({
      id: "stop-piper-reading",
      name: "Stop Piper reading",
      callback: () => {
        this.stopReading();
      },
    });

    this.addCommand({
      id: "pause-or-resume-piper-reading",
      name: "Pause or resume Piper reading",
      callback: async () => {
        await this.togglePause();
      },
    });

    this.addSettingTab(new PiperReaderSettingTab(this.app, this));
  }

  async readText(text: string): Promise<void> {
    try {
      this.stopReading();
      const preparedText = prepareTextForSpeech(text);

      const response = await fetch(`${this.settings.bridgeUrl}/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: preparedText }),
      });

      if (!response.ok) {
        const message = await response.text();
        new Notice(`Piper bridge failed: ${message}`);
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      audio.playbackRate = this.playbackRate;

      this.currentAudio = audio;
      this.currentObjectUrl = objectUrl;

      audio.onended = () => {
        this.clearAudio();
      };

      audio.onplay = () => {
        this.renderPlaybackControls();
      };

      audio.onpause = () => {
        this.renderPlaybackControls();
      };

      this.renderPlaybackControls();
      await audio.play();
    } catch (error) {
      console.error(error);
      new Notice("Could not read text with Piper.");
      this.clearAudio();
    }
  }

  stopReading(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }

    this.clearAudio();
  }

  clearAudio(): void {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
    }

    this.currentAudio = null;
    this.currentObjectUrl = null;
    this.renderPlaybackControls();
  }

  async togglePause(): Promise<void> {
    if (!this.currentAudio) {
      return;
    }

    if (this.currentAudio.paused) {
      await this.currentAudio.play();
    } else {
      this.currentAudio.pause();
    }
  }

  seekBy(seconds: number): void {
    if (!this.currentAudio) {
      return;
    }

    const duration = Number.isFinite(this.currentAudio.duration)
      ? this.currentAudio.duration
      : Number.POSITIVE_INFINITY;
    const nextTime = Math.min(
      Math.max(this.currentAudio.currentTime + seconds, 0),
      duration,
    );

    this.currentAudio.currentTime = nextTime;
    this.renderPlaybackControls();
  }

  setPlaybackRate(rate: number): void {
    this.playbackRate = rate;

    if (this.currentAudio) {
      this.currentAudio.playbackRate = rate;
    }

    this.renderPlaybackControls();
  }

  renderPlaybackControls(): void {
    if (!this.statusBarEl) {
      return;
    }

    this.statusBarEl.empty();
    this.statusBarEl.addClass("piper-reader-status");

    if (!this.currentAudio) {
      this.statusBarEl.setText("Piper idle");
      return;
    }

    const label = this.statusBarEl.createSpan({
      cls: "piper-reader-status-label",
      text: "Piper",
    });
    label.setAttr("aria-label", "Piper Reader playback controls");

    this.createControlButton(
      this.currentAudio.paused ? "Resume" : "Pause",
      () => {
        void this.togglePause();
      },
    );
    this.createControlButton("Back 10s", () => {
      this.seekBy(-10);
    });
    this.createControlButton("Forward 10s", () => {
      this.seekBy(10);
    });
    this.createControlButton("Stop", () => {
      this.stopReading();
    });

    const speedSelect = this.statusBarEl.createEl("select", {
      cls: "piper-reader-speed",
      attr: {
        "aria-label": "Playback speed",
      },
    });

    for (const rate of [1, 1.5, 2]) {
      const option = speedSelect.createEl("option", {
        text: `${rate}x`,
        value: String(rate),
      });
      option.selected = rate === this.playbackRate;
    }

    speedSelect.onchange = () => {
      this.setPlaybackRate(Number(speedSelect.value));
    };
  }

  createControlButton(label: string, onClick: () => void): void {
    if (!this.statusBarEl) {
      return;
    }

    const button = this.statusBarEl.createEl("button", {
      cls: "piper-reader-control",
      text: label,
      attr: {
        type: "button",
      },
    });

    button.onclick = onClick;
  }

  onunload(): void {
    this.stopReading();
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

class PiperReaderSettingTab extends PluginSettingTab {
  plugin: PiperReaderPlugin;

  constructor(app: App, plugin: PiperReaderPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Bridge URL")
      .setDesc("The local Python bridge URL.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.bridgeUrl)
          .setValue(this.plugin.settings.bridgeUrl)
          .onChange(async (value) => {
            this.plugin.settings.bridgeUrl =
              value.trim() || DEFAULT_SETTINGS.bridgeUrl;
            await this.plugin.saveSettings();
          }),
      );
  }
}
