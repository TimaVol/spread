import ffmpeg from "fluent-ffmpeg"; // You'd need to install fluent-ffmpeg and FFmpeg executable

/**
 * Validates a video URL against Instagram Reels specifications using FFmpeg.
 * FFmpeg will stream directly from the URL for analysis.
 * @param {string} videoUrl - The URL of the video file.
 * @returns {Promise<object>} An object indicating validity and any issues.
*/

export default async function validateVideoFile(videoUrl) {
  console.log(`Validating video from URL: ${videoUrl}`);
  return new Promise((resolve) => {
    ffmpeg.ffprobe(videoUrl, (err, metadata) => {
      if (err) {
        console.error(
          "FFmpeg probe error (could not read video metadata):",
          err.message
        );
        return resolve({
          isValid: false,
          message: "Could not probe video file or URL is inaccessible.",
        });
      }

      const videoStream = metadata.streams.find(
        (s) => s.codec_type === "video"
      );
      const audioStream = metadata.streams.find(
        (s) => s.codec_type === "audio"
      );
      const format = metadata.format;

      const issues = [];

      // --- Comprehensive Video Specification Checks ---
      // Based on Instagram Reels API documentation and common best practices.

      // 1. Check Container Format
      // FFmpeg format_name might be 'mov' for .mp4 if it's a QuickTime MOV container structure.
      // Be flexible for common formats.
      if (
        !format.format_name ||
        (!format.format_name.includes("mp4") &&
          !format.format_name.includes("mov"))
      ) {
        issues.push(
          `Invalid container format: ${format.format_name}. Expected MP4 or MOV.`
        );
      }

      // 2. Check Video Stream
      if (!videoStream) {
        issues.push("No video stream found.");
      } else {
        const width = videoStream.width;
        const height = videoStream.height;
        const duration = parseFloat(videoStream.duration); // in seconds
        const avgFrameRate = parseFloat(eval(videoStream.avg_frame_rate)); // Evaluate "30/1" to 30.0
        const codecName = videoStream.codec_name;
        const bitRate = parseInt(videoStream.bit_rate); // in bits per second

        // Aspect Ratio (9:16 recommended, allow some tolerance for common variations)
        const aspectRatio = width / height;
        const minAllowedAspectRatio = 0.01; // 0.01:1 (very thin)
        const maxAllowedAspectRatio = 10; // 10:1 (very wide)
        const recommendedAspectRatio = 9 / 16; // 0.5625

        if (
          aspectRatio < minAllowedAspectRatio ||
          aspectRatio > maxAllowedAspectRatio
        ) {
          issues.push(
            `Aspect ratio ${aspectRatio.toFixed(
              2
            )} (${width}x${height}) is outside allowed range (0.01:1 to 10:1).`
          );
        }
        // Strongly recommend 9:16 vertical
        if (
          Math.abs(aspectRatio - recommendedAspectRatio) > 0.05 &&
          aspectRatio > 0.6 &&
          aspectRatio < 1.0
        ) {
          issues.push(
            `Aspect ratio ${aspectRatio.toFixed(
              2
            )} (${width}x${height}) is not close to recommended 9:16 (vertical).`
          );
        } else if (width > height) {
          issues.push(
            `Video is horizontal (${width}x${height}). Instagram Reels strongly recommends vertical (9:16).`
          );
        }

        // Resolution Check (min 720p vertical, recommended 1080x1920)
        if (width < 720 || height < 1280) {
          // Assuming 720p for vertical
          issues.push(
            `Resolution (${width}x${height}) is below recommended 1080x1920 (min 720x1280 for vertical).`
          );
        }
        if (width > 1080 || height > 1920) {
          // Instagram will compress, but good to know if source is too large
          console.warn(
            `Video resolution (${width}x${height}) exceeds recommended 1080x1920. Instagram may compress it.`
          );
        }

        // Duration Check (API limit 90 seconds)
        const maxDurationSeconds = 90;
        if (duration === undefined || duration > maxDurationSeconds) {
          issues.push(
            `Video duration (${
              duration ? duration.toFixed(2) + "s" : "unknown"
            }) exceeds max ${maxDurationSeconds}s for Reels API.`
          );
        } else if (duration < 3) {
          // Minimum duration is often 3 seconds
          issues.push(
            `Video duration (${duration.toFixed(2)}s) is too short (min 3s).`
          );
        }

        // Frame Rate Check (25-60 FPS) actually 30-60 FPS is recommended for Reels
        if (avgFrameRate < 25 || avgFrameRate > 60) {
          issues.push(
            `Frame rate (${avgFrameRate}) is outside recommended 30-60 FPS.`
          );
        }

        // Codec Check
        if (
          !codecName ||
          (!codecName.includes("h264") && !codecName.includes("hevc"))
        ) {
          issues.push(
            `Video codec (${codecName}) is not recommended (H264 or HEVC).`
          );
        }

        // Bitrate Check (5Mbps = 5,000,000 bps)
        const maxVideoBitrate = 5 * 1000 * 1000;
        if (bitRate > maxVideoBitrate) {
          issues.push(
            `Video bitrate (${(bitRate / 1000000).toFixed(
              2
            )} Mbps) exceeds recommended 5 Mbps.`
          );
        }
      }

      // 3. Check Audio Stream
      if (!audioStream) {
        issues.push("No audio stream found.");
      } else {
        const audioCodecName = audioStream.codec_name;
        const sampleRate = parseInt(audioStream.sample_rate);
        const audioChannels = audioStream.channels;
        const audioBitRate = parseInt(audioStream.bit_rate);

        if (!audioCodecName || audioCodecName !== "aac") {
          issues.push(
            `Audio codec (${audioCodecName}) is not recommended (AAC).`
          );
        }
        if (sampleRate > 48000) {
          issues.push(
            `Audio sample rate (${sampleRate}Hz) exceeds recommended 48kHz.`
          );
        }
        if (audioChannels > 2) {
          // 1 or 2 channels (mono or stereo)
          issues.push(
            `Audio channels (${audioChannels}) exceed recommended 1 or 2.`
          );
        }
        // Audio bitrate (128kbps = 128,000 bps)
        const maxAudioBitrate = 128 * 1000;
        if (audioBitRate > maxAudioBitrate) {
          issues.push(
            `Audio bitrate (${(audioBitRate / 1000).toFixed(
              2
            )} kbps) exceeds recommended 128 kbps.`
          );
        }
      }

      // 4. File Size Check (via format.size or format.duration * format.bit_rate / 8 for an estimate if size is not exact)
      // This relies on FFmpeg being able to get the total file size from the remote stream headers or metadata.
      // If the format.size is not reliable from URL, this check might be less accurate here.
      const fileSize = format.size; // in bytes
      const maxFileSize = 100 * 1024 * 1024; // 100 MB for API uploads
      if (fileSize && fileSize > maxFileSize) {
        issues.push(
          `Estimated file size (${(fileSize / (1024 * 1024)).toFixed(
            2
          )}MB) exceeds max 100MB for API.`
        );
      } else if (!fileSize) {
        console.warn(
          "Could not determine file size from video metadata. Cannot check against 100MB limit."
        );
      }

      if (issues.length > 0) {
        if (issues.length === 1) {
          if (new RegExp("No audio stream found.", "i").test(issues[0])) {
            resolve({
              isValid: true,
              message: "No audio stream found, but its ok!",
            });
          }
        }

        resolve({
          isValid: false,
          message: "Video validation failed.",
          issues: issues,
        });
      } else {
        resolve({
          isValid: true,
          message: "Video seems to meet Instagram Reel requirements.",
        });
      }
    });
  });
}
