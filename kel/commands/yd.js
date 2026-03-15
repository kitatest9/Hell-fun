import { Innertube } from 'youtubei.js';
import fs from 'fs';
import path from 'path';

export const command = {
    name: 'yd',
    alias: ['video', 'dl'],
    async execute(sock, m, args, { from, pushName }) {
        const query = args.join(' ');
        if (!query) return sock.sendMessage(from, { text: '📌 *Naam ya link dein!*' }, { quoted: m });

        try {
            // 1. Initialize InnerTube (YouTube's internal API)
            const yt = await Innertube.create();
            
            // 2. Search Video
            const search = await yt.search(query);
            const video = search.videos[0];

            if (!video) return sock.sendMessage(from, { text: '❌ *Nahi mila!*' }, { quoted: m });

            await sock.sendMessage(from, { 
                image: { url: video.thumbnails[0].url }, 
                caption: `🎬 *YOUTUBE DOWNLOADER*\n\n📌 *Title:* ${video.title}\n🕒 *Duration:* ${video.duration.text}\n\n🚀 _Downloading for ${pushName}..._` 
            }, { quoted: m });

            // 3. Download Stream (Best Quality MP4)
            const stream = await yt.download(video.id, {
                type: 'video+audio', // Dono merge hokar ayenge
                quality: 'best',
                format: 'mp4'
            });

            const fileName = path.join(process.cwd(), `ytdl_${Date.now()}.mp4`);
            const fileWriter = fs.createWriteStream(fileName);

            // Stream ko file mein save karein
            for await (const chunk of stream) {
                fileWriter.write(chunk);
            }
            fileWriter.end();

            fileWriter.on('finish', async () => {
                // 4. Send Video to WhatsApp
                if (fs.existsSync(fileName)) {
                    await sock.sendMessage(from, { 
                        video: { url: fileName }, 
                        caption: `✅ *Success:* ${video.title}\n\n✨ _Powered by M0SHAHZAD_`,
                        mimetype: 'video/mp4'
                    }, { quoted: m });

                    // Cleanup
                    setTimeout(() => { if (fs.existsSync(fileName)) fs.unlinkSync(fileName); }, 10000);
                }
            });

        } catch (e) {
            console.error("Youtubei Error:", e.message);
            sock.sendMessage(from, { text: `❌ *Error:* ${e.message}\nYouTube ne server IP block kiya hua hai.` }, { quoted: m });
        }
    }
};
