import fetch from 'node-fetch';
import yts from 'yt-search';

const YT_REGEX = /^(https?:\/\/)?((www|m|music)\.)?(youtube(-nocookie)?\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]+(\S+)?$/i;

const extractUrl = (text) => {
    if (!text) return null;
    const match = text.match(YT_REGEX);
    return match ? match[0] : null;
};

export const command = {
    name: "video",
    alias: ["ytv", "mp4"],
    async execute(sock, m, args) {
        const from = m.key.remoteJid;
        let raw = args.join(" ").trim();

        if (!raw && m.message.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quoted = m.message.extendedTextMessage.contextInfo.quotedMessage;
            raw = quoted.conversation || quoted.extendedTextMessage?.text || "";
        }

        if (!raw) return sock.sendMessage(from, { text: "*Usage:* .video <name/link>" }, { quoted: m });

        try {
            let ytUrl = extractUrl(raw);
            let videoInfo = null;

            // 1. Search Logic
            if (!ytUrl) {
                const search = await yts(raw);
                if (search.videos && search.videos.length > 0) {
                    videoInfo = search.videos[0];
                    ytUrl = videoInfo.url;
                }
            } else {
                const search = await yts(ytUrl);
                videoInfo = search.videos[0] || { title: "Video", timestamp: "N/A", views: 0, author: { name: "Unknown" }, ago: "N/A" };
            }

            if (!ytUrl) throw new Error("Video not found!");

            // 2. Initial Info with Thumbnail & Downloading Status
            const initialCaption = `🎬 *KEL Video Downloader*\n\n` +
                                 `📌 *Title:* ${videoInfo.title}\n` +
                                 `📺 *Channel:* ${videoInfo.author.name}\n` +
                                 `⏳ *Duration:* ${videoInfo.timestamp}\n` +
                                 `👁️ *Views:* ${videoInfo.views.toLocaleString()}\n` +
                                 `📅 *Date:* ${videoInfo.ago}\n\n` +
                                 `⏳ *Status:* Downloading Video...`;

            const mainMsg = await sock.sendMessage(from, { 
                image: { url: videoInfo.thumbnail }, 
                caption: initialCaption 
            }, { quoted: m });

            // 3. API Call
            const apiUrl = `https://api-faa.my.id/faa/ytmp4?url=${encodeURIComponent(ytUrl)}`;
            const res = await fetch(apiUrl);
            const data = await res.json();
            
            if (!data.status || !data.result) throw new Error(data.message || 'API error');

            // 4. Update Status to Uploading
            const uploadingCaption = initialCaption.replace("Downloading Video...", "Uploading to WhatsApp...");
            await sock.sendMessage(from, { text: uploadingCaption, edit: mainMsg.key });

            // 5. Send as Document (Stable URL Stream)
            await sock.sendMessage(from, {
                document: { url: data.result.download_url },
                mimetype: "video/mp4",
                fileName: `${videoInfo.title}.mp4`,
                caption: `🎬 *KEL Video Downloader*\n\n📌 *Title:* ${videoInfo.title}\n✅ *Status:* Successfully Sent ⚡️`
            }, { quoted: m });

            // 6. Final Status Update
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
