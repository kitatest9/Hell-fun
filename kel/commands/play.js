import yts from 'yt-search';

export const command = {
    name: "play",
    alias: ["p"],
    category: "search",
    desc: "Premium YouTube Play-Hub",
    async execute(sock, m, args, { proto, generateWAMessageFromContent, prepareWAMessageMedia, config }) {
        const from = m.key.remoteJid;
        const prefix = Array.isArray(config.prefix) ? config.prefix[0] : config.prefix;
        const query = args.join(" ");

        if (!query) return sock.sendMessage(from, { 
            text: `❌ *Usage:* ${mainPrefix}play <song name>\n\n💡 *Example:* _${mainPrefix}play closer chainsmokers_` 
        }, { quoted: m });

        try {
            const search = await yts(query);
            const video = search.videos[0]; 

            if (!video) return sock.sendMessage(from, { text: "🚫 No results found." });

            // Image ko high quality aur large display ke liye prepare karna
            const media = await prepareWAMessageMedia({ 
                image: { url: video.image || video.thumbnail } 
            }, { upload: sock.waUploadToServer });

            // Clean & Professional Body Layout
            let playBody = `📌 *TITLE:* ${video.title.toUpperCase()}\n`;
            playBody += `👤 *CHANNEL:* ${video.author.name}\n`;
            playBody += `🕒 *DURATION:* ${video.timestamp}\n`;
            playBody += `👁️ *VIEWS:* ${video.views.toLocaleString()}\n`;
            playBody += `📅 *UPLOADED:* ${video.ago}\n`;
            playBody += `🔗 *LINK:* ${video.url}\n\n`;
            playBody += `📝 *DESCRIPTION:* _${video.description.slice(0, 80)}..._\n\n`;
            playBody += `✨ *Select your format below:*`;

            const msg = generateWAMessageFromContent(from, {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: proto.Message.InteractiveMessage.create({
                            body: { text: playBody },
                            footer: { text: "ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍ𝟶sʜᴀʜᴢᴀᴅ ⚡️" },
                            header: { 
                                title: "🎧 YOUTUBE PLAY-HUB🎧", 
                                hasMediaAttachment: true,
                                imageMessage: media.imageMessage
                            },
                            nativeFlowMessage: {
                                buttons: [
                                    {
                                        name: "quick_reply",
                                        buttonParamsJson: JSON.stringify({ display_text: "🎵 Audio (MP3)", id: `${prefix}audio ${video.url}` })
                                    },
                                    {
                                        name: "quick_reply",
                                        buttonParamsJson: JSON.stringify({ display_text: "🎥 Video (MP4)", id: `${prefix}video ${video.url}` })
                                    }
                                ]
                            }
                        })
                    }
                }
            }, { quoted: m });

            await sock.relayMessage(from, msg.message, { messageId: msg.key.id });

        } catch (e) {
            console.error("Play Command Error:", e);
            sock.sendMessage(from, { text: "❌ Search failed. Try again later." });
        }
    }
};
