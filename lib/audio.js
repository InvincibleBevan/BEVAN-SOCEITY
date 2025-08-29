const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');

/**
 * Cuts the first N seconds of the input media file and returns a buffer.
 * @param {string} inputPath - Path to the input media file
 * @param {number} start - Start time in seconds (usually 0)
 * @param {number} duration - Duration in seconds to cut (e.g., 15)
 * @returns {Promise<Buffer>}
 */
function audioCut(inputPath, start = 0, duration = 15) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(tmpdir(), `cut_${Date.now()}.mp3`);

    ffmpeg(inputPath)
      .setStartTime(start)
      .setDuration(duration)
      .output(outputPath)
      .audioCodec('libmp3lame')
      .on('end', () => {
        fs.readFile(outputPath, (err, data) => {
          if (err) return reject(err);
          fs.unlinkSync(outputPath); // delete temp file
          resolve(data);
        });
      })
      .on('error', reject)
      .run();
  });
}

module.exports = { audioCut };