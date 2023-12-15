const path = require("path");
const fs = require("fs");

class LocalWhisper {
  constructor() {
    // Model Card: https://huggingface.co/Xenova/whisper-small
    this.model = "Xenova/whisper-small";
    this.cacheDir = path.resolve(
      process.env.STORAGE_DIR
        ? path.resolve(process.env.STORAGE_DIR, `models`)
        : path.resolve(__dirname, `../../../server/storage/models`)
    );

    this.modelPath = path.resolve(this.cacheDir, "Xenova", "whisper-small");

    // Make directory when it does not exist in existing installations
    if (!fs.existsSync(this.cacheDir))
      fs.mkdirSync(this.cacheDir, { recursive: true });
  }

  async client() {
    if (!fs.existsSync(this.modelPath)) {
      console.log(
        "\x1b[34m[INFO]\x1b[0m The native whisper model has never been run and will be downloaded right now. Subsequent runs will be faster. (~250MB)\n\n"
      );
    }

    try {
      // Convert ESM to CommonJS via import so we can load this library.
      const pipeline = (...args) =>
        import("@xenova/transformers").then(({ pipeline }) =>
          pipeline(...args)
        );
      return await pipeline("automatic-speech-recognition", this.model, {
        cache_dir: this.cacheDir,
        ...(!fs.existsSync(this.modelPath)
          ? {
              // Show download progress if we need to download any files
              progress_callback: (data) => {
                if (!data.hasOwnProperty("progress")) return;
                console.log(
                  `\x1b[34m[Embedding - Downloading Model Files]\x1b[0m ${
                    data.file
                  } ${~~data?.progress}%`
                );
              },
            }
          : {}),
      });
    } catch (error) {
      console.error("Failed to load the native whisper model:", error);
      throw error;
    }
  }
}

module.exports = {
  LocalWhisper,
};
