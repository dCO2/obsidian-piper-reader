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

  async onload(): Promise<void> {
    await this.loadSettings();

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

      this.currentAudio = audio;
      this.currentObjectUrl = objectUrl;

      audio.onended = () => {
        this.clearAudio();
      };

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
