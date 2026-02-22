const ytdl = require("@distube/ytdl-core"); // Updated to Distube version
const yts = require("youtube-yts");
const ffmpeg = require("fluent-ffmpeg");
const NodeID3 = require("node-id3");
const fs = require("fs");
const { fetchBuffer } = require("./Function");
const { randomBytes } = require("crypto");

const ytIdRegex = /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\?(?:\S*?&?v\=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/;

class YT {
  constructor() {}

  static isYTUrl = (url) => ytIdRegex.test(url);

  static getVideoID = (url) => {
    if (!this.isYTUrl(url)) throw new Error("is not YouTube URL");
    return ytIdRegex.exec(url)[1];
  };

  static WriteTags = async (filePath, Metadata) => {
    try {
        const img = await fetchBuffer(Metadata.Image);
        NodeID3.write({
            title: Metadata.Title,
            artist: Metadata.Artist,
            image: {
                mime: "jpeg",
                type: { id: 3, name: "front cover" },
                imageBuffer: img.buffer,
                description: `Cover of ${Metadata.Title}`,
            },
            album: Metadata.Album,
            year: Metadata.Year || "",
        }, filePath);
    } catch (e) { console.error("Metadata Error:", e); }
  };

  static mp4 = async (query, quality = "highest") => {
    try {
      const videoId = this.isYTUrl(query) ? this.getVideoID(query) : query;
      const videoInfo = await ytdl.getInfo("https://www.youtube.com/watch?v=" + videoId);
      const format = ytdl.chooseFormat(videoInfo.formats, { quality: quality, filter: "videoandaudio" });
      return {
        title: videoInfo.videoDetails.title,
        videoUrl: format.url,
        channel: videoInfo.videoDetails.ownerChannelName,
      };
    } catch (error) { throw error; }
  };

  static mp3 = async (url) => {
    try {
      const videoId = this.isYTUrl(url) ? this.getVideoID(url) : url;
      const fullUrl = "https://www.youtube.com/watch?v=" + videoId;
      
      // Added highWaterMark to prevent stream freezing
      let stream = ytdl(fullUrl, { 
        filter: "audioonly", 
        quality: "highestaudio",
        highWaterMark: 1 << 25 
      });

      let songPath = `./System/Cache/${randomBytes(3).toString("hex")}.mp3`;

      return new Promise((resolve, reject) => {
        ffmpeg(stream)
          .audioBitrate(128)
          .toFormat("mp3")
          .save(songPath)
          .on("end", () => resolve({ path: songPath }))
          .on("error", (err) => reject(err));
      });
    } catch (error) { throw error; }
  };
}

module.exports = YT;
