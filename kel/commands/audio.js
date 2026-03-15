import axios from 'axios';
import yts from 'yt-search';
import ffmpeg from 'fluent-ffmpeg';
import { PassThrough } from 'stream';

export const command = {
    name: "audio",
    alias: ["yta", "song", "mp3"],
    async execute(sock, m, args) {
        const from = m.key.remoteJid;
        const query = args.join(" ").trim();

        if (!query) return sock.sendMessage(from, { text: "*Usage:* .audio <song name/link>" }, { quoted: m });

        try {
            // 1. YouTube Search
            const search = await yts(query);
            const video = search.videos[0];
            if (!video) throw new Error("Audio not found on YouTube!");

            // 2. Initial Info with Thumbnail & Downloading Status
            const initialCaption = `🎬 *KEL Audio Downloader*\n\n` +
                                 `📌 *Title:* ${video.title}\n` +
                                 `📺 *Channel:* ${video.author.name}\n` +
                                 `⏳ *Duration:* ${video.timestamp}\n` +
                                 `👁️ *Views:* ${video.views.toLocaleString()}\n` +
                                 `📅 *Date:* ${video.ago}\n\n` +
                                 `⏳ *Status:* Downloading Audio...`;

            const mainMsg = await sock.sendMessage(from, { 
                image: { url: video.thumbnail }, 
                caption: initialCaption 
            }, { quoted: m });

            // 3. Get API Link & File Info
            const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(video.url)}&format=mp3`;
            const { data } = await axios.get(apiUrl);

            if (!data.success || !data.downloadURL) throw new Error("API failed to generate link.");

            // Get File Size
            let fileSizeMB = "Unknown";
            try {
                const head = await axios.head(data.downloadURL, { timeout: 5000 });
                const sizeInBytes = head.headers['content-length'];
                if (sizeInBytes) fileSizeMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
            } catch (e) { console.log("Size fetch failed"); }

            // 4. Update Status to Uploading (Editing the previous message text)
            const uploadingCaption = initialCaption.replace("Downloading Audio...", "Uploading to WhatsApp...");
            await sock.sendMessage(from, { text: uploadingCaption, edit: mainMsg.key });
            
            // 5. FFMPEG Streaming (Fix for 4XX Error)
            const audioStream = new PassThrough();
            ffmpeg(data.downloadURL)
                .inputOptions([
                    '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
                    '-reconnect', '1',
                    '-reconnect_streamed', '1',
                    '-reconnect_delay_max', '5'
                ]) // Yeh line 4XX Error khatam karegi
                .toFormat('mp3')
                .audioBitrate(128)
                .on('error', (err) => console.error('FFMPEG Error:', err.message))
                .pipe(audioStream);


            // 6. Final File Send
            const finalCaption = `🎬 *KEL Audio Downloader*\n\n` +
                               `📌 *Title:* ${video.title}\n` +
                               `📦 *Size:* ${fileSizeMB} MB\n\n` +
                               `✅ *Status:* Successfully Sent ⚡️`;

            await sock.sendMessage(from, {
                document: { stream: audioStream },
                mimetype: "audio/mpeg",
                fileName: `${video.title}.mp3`,
                caption: finalCaption
            }, { quoted: m });

            // 7. Final Success Status on Main Message
            await sock.sendMessage(from, { 
                text: uploadingCaption.replace("Uploading to WhatsApp...", "Sent Successfully! ✅"), 
                edit: mainMsg.key 
            });

        } catch (e) {
            console.error(e);
            sock.sendMessage(from, { text: `❌ *Error:* ${e.message}` }, { quoted: m });
        }
    }
};