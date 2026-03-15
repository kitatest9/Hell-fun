import yts from 'yt-search';

export const command = {
    name: "ytmenu",
    alias: ["yt", "youtube", "yts"],
    category: "search",
    desc: "Premium YouTube Hub with Search & Download Buttons",
    async execute(sock, m, args, { proto, generateWAMessageFromContent, prepareWAMessageMedia, config }) {
        const from = m.key.remoteJid;
        const prefix = Array.isArray(config.prefix) ? config.prefix[0] : config.prefix;
        const input = args.join(" ");

        if (!input) return sock.sendMessage(from, { text: `❌ *Usage:* ${prefix}ytmenu <search query>` }, { quoted: m });

        // --- PHASE 2: FORMAT SELECTION (Jab user dropdown se click kare) ---
        if (input.startsWith('https://')) {
            try {
                // Extracting Video ID more reliably
                const vId = input.split('v=')[1]?.split('&')[0] || input.split('/').pop();
                const vInfo = await yts({ videoId: vId });
                
                // Preparing Media for Header
                const mediaChoice = await prepareWAMessageMedia({ image: { url: vInfo.thumbnail } }, { upload: sock.waUploadToServer });

                // Constructing Professional Body for Second Phase
                let downloadBody = `📥 *READY TO DOWNLOAD*\n\n`;
                downloadBody += `📌 *TITLE:* ${vInfo.title.toUpperCase()}\n`;
                downloadBody += `👤 *CHANNEL:* ${vInfo.author.name}\n`;
                downloadBody += `🕒 *DURATION:* ${vInfo.timestamp}\n`;
                downloadBody += `👁️ *VIEWS:* ${vInfo.views.toLocaleString()}\n`;
                downloadBody += `📅 *UPLOADED:* ${vInfo.ago}\n`;
                downloadBody += `🔗 *LINK:* ${input}\n\n`;
                downloadBody += `*Select your preferred format below:*`;

                const msg = generateWAMessageFromContent(from, {
                    viewOnceMessage: {
                        message: {
                            interactiveMessage: proto.Message.InteractiveMessage.create({
                                body: { text: downloadBody },
                                footer: { text: "ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍ𝟶sʜᴀʜᴢᴀᴅ ⚡️" },
                                header: { 
                                    title: "📥 DOWNLOAD OPTIONS", 
                                    hasMediaAttachment: true,
                                    imageMessage: mediaChoice.imageMessage
                                },
                                nativeFlowMessage: {
                                    buttons: [
                                        {
                                            name: "quick_reply",
                                            buttonParamsJson: JSON.stringify({ display_text: "🎵 Audio (MP3)", id: `${prefix}audio ${input}` })
                                        },
                                        {
                                            name: "quick_reply",
                                            buttonParamsJson: JSON.stringify({ display_text: "🎥 Video (MP4)", id: `${prefix}video ${input}` })
                                        }
                                    ]
                                }
                            })
                        }
                    }
                }, { quoted: m });
                return await sock.relayMessage(from, msg.message, { messageId: msg.key.id });
            } catch (e) { 
                console.error(e);
                return sock.sendMessage(from, { text: "❌ Error loading video details for buttons." }); 
            }
        }

        // --- PHASE 1: SEARCH & MAIN IMAGE MENU ---
        try {
            const search = await yts(input);
            const videos = search.videos.slice(0, 10);
            if (videos.length === 0) return sock.sendMessage(from, { text: "🚫 No results found." });

            const firstVideo = videos[0];
            const mediaHeader = await prepareWAMessageMedia({ image: { url: firstVideo.thumbnail } }, { upload: sock.waUploadToServer });

            let resultText = `✨ *YOUTUBE SEARCH RESULTS* ✨\n\n🔍 *Query:* ${input}\n\n`;
            let rows = [];

            videos.forEach((v, i) => {
                resultText += `*${i + 1}. ${v.title.toUpperCase()}*\n`;
                resultText += `🔗 ${v.url}\n`;
                resultText += `👤 *Channel:* ${v.author.name}\n`;
                resultText += `🕒 *Time:* ${v.timestamp} | 👀 *Views:* ${v.views}\n`;
                resultText += `──────────────────\n`;
                
                rows.push({
                    header: `Result ${i + 1}`,
                    title: v.title,
                    description: `Channel: ${v.author.name} | Time: ${v.timestamp}`,
                    id: `${prefix}ytmenu ${v.url}`
                });
            });

            const msg = generateWAMessageFromContent(from, {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: proto.Message.InteractiveMessage.create({
                            body: { text: resultText },
                            footer: { text: "ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍ𝟶sʜᴀʜᴢᴀᴅ ⚡️" },
                            header: { 
                                title: `🎬 Top Result: ${firstVideo.title}`,
                                hasMediaAttachment: true,
                                imageMessage: mediaHeader.imageMessage
                            },
                            nativeFlowMessage: {
                                buttons: [
                                    {
                                        name: "single_select",
                                        buttonParamsJson: JSON.stringify({
                                            title: "📥 Select Video to Download",
                                            sections: [{
                                                title: "🎥 Top YouTube Results",
                                                rows: rows
                                            }]
                                        })
                                    }
                                ]
                            }
                        })
                    }
                }
            }, { quoted: m });

            await sock.relayMessage(from, msg.message, { messageId: msg.key.id });

        } catch (e) {
            console.error(e);
            sock.sendMessage(from, { text: "❌ Search failed. Please try again." });
        }
    }
};
