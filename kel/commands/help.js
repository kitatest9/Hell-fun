import fs from 'fs';
import { getTheme } from '../themeloader.js';
import { createRequire } from 'module';
import os from 'os'; 
const require = createRequire(import.meta.url)
import { generateWAMessageFromContent, proto, prepareWAMessageMedia } from '@kelvdra/baileys';

const combo3Style = (text) => {
    const caps = {
        'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ꜰ', 'g': 'ɢ', 'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 's': 'ꜱ', 't': 'ᴛ', 'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ'
    };
    return text.toLowerCase().split('').map(char => caps[char] || char).join('');
};

const runtime = (seconds) => {
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor(seconds % (3600 * 24) / 3600);
    var m = Math.floor(seconds % 3600 / 60);
    var s = Math.floor(seconds % 60);
    return `${d}ᴅ ${h}ʜ ${m}ᴍ ${s}s`;
};

export const command = {
    name: 'menu',
    alias: ['help'], // Isse .help bhi kaam karega
    async execute(sock, m, args, { config, isOwner, isGroup }) {
        const from = m.key.remoteJid;
        const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
        const mainPrefix = Array.isArray(config.prefix) ? config.prefix[0] : config.prefix;

        let ownerCmds = [], adminCmds = [], userCmds = [];
        for (const file of commandFiles) {
            try {
                const { command: cmd } = await import(`./${file}?update=${Date.now()}`);
                const styledName = combo3Style(cmd.name);
                if (cmd.ownerOnly) ownerCmds.push(styledName);
                else if (cmd.adminOnly) adminCmds.push(styledName);
                else userCmds.push(styledName);
            } catch (e) {}
        }

        const thumbUrl = await getTheme();
        const media = await prepareWAMessageMedia({ image: { url: thumbUrl.image } }, { upload: sock.waUploadToServer });

        // --- CAROUSEL CARDS SETUP ---
        const cards = [
            {
                title: "👑 ᴏᴡɴᴇʀ & sʏsᴛᴇᴍ",
                body: `» ʙᴏᴛ ɴᴀᴍᴇ: ${config.botName || 'ᴋᴇʟ-ᴍᴅ'}\n\n» ᴏᴡɴᴇʀ: ${config.ownerName || 'sʜᴀʜᴢᴀᴅ'}\n\n» ʙᴏᴛ ᴜᴘᴛɪᴍᴇ: ${runtime(process.uptime())}\n\n» ᴘʀɪꜰᴇx: ${mainPrefix}\n\n» sʏs ᴜᴘᴛɪᴍᴇ: ${runtime(os.uptime())}\n\n» ʜᴏsᴛɪɴɢ: ᴛᴇʀᴍᴜx ʟɪɴᴜx\n\n» ʀᴀᴍ: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}ᴍʙ\n\n» sᴛᴀᴛᴜs: ᴏɴʟɪɴᴇ (ᴀᴄᴛɪᴠᴇ)\n\n» ᴄᴏᴍᴍᴀɴᴅs: ${ownerCmds.length + adminCmds.length + userCmds.length} ᴛᴏᴛᴀʟ\n\n\n`,
                footer: "sᴡɪᴘᴇ ʟᴇғᴛ ᴛᴏ ᴇxᴘʟᴏʀᴇ ➔",
                buttonName: "cta_url",
                buttonParams: { display_text: "👑 Contact Owner", url: `https://wa.me/${config.ownerNumber.replace(/[^0-9]/g, '')}?text=Hey👋` }
            },
            {
                title: "👤 ᴜsᴇʀ ᴄᴏᴍᴍᴀɴᴅs",
                body: `ᴛᴏᴛᴀʟ [${userCmds.length}] ᴄᴏᴍᴍᴀɴᴅs:\n\n` + userCmds.map(c => `» ${c}`).join('\n\n'),
                footer: "sᴡɪᴘᴇ ʟᴇғᴛ ғᴏʀ ᴀᴅᴍɪɴ ➔",
                buttonName: "quick_reply",
                buttonParams: { display_text: "👑 Owner Details", id: `${mainPrefix}owner` }
            },
            {
                title: "👮 ᴀᴅᴍɪɴ ᴄᴏᴍᴍᴀɴᴅs",
                body: `ᴛᴏᴛᴀʟ [${adminCmds.length}] ᴄᴏᴍᴍᴀɴᴅs:\n\n` + adminCmds.map(c => `» ${c}`).join('\n\n'),
                footer: "sᴡɪᴘᴇ ʟᴇғᴛ ғᴏʀ ᴍᴏʀᴇ ➔",
                buttonName: "quick_reply",
                buttonParams: { display_text: "👑 Owner Details", id: `${mainPrefix}owner` }
            }
        ];

        // Owner Card only for Owner
        if (isOwner) {
            cards.push({
                title: "💎 ᴏᴡɴᴇʀ ᴄᴏᴍᴍᴀɴᴅs",
                body: `ᴛᴏᴛᴀʟ [${ownerCmds.length}] ᴄᴏᴍᴍᴀɴᴅs:\n\n` + ownerCmds.map(c => `» ${c}`).join('\n'),
                footer: "ᴋᴇʟ-ᴍᴅ ᴘʀᴇᴍɪᴜᴍ ᴘᴀɴᴇʟ",
                buttonName: "quick_reply",
                buttonParams: { display_text: "⚙️ Bot Settings", id: `${mainPrefix}settings` }
            });
        }

        const msg = generateWAMessageFromContent(from, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: proto.Message.InteractiveMessage.Body.create({ 
                            text: `Hey 👋 *${m.pushName || 'User'}*,\nPlease swipe left or right to explore categories!` 
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: "ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍ𝟶sʜᴀʜᴢᴀᴅ ⚡️" }),
                        header: proto.Message.InteractiveMessage.Header.create({ title: `✨ *${config.botName || 'ᴋᴇʟ-ᴍᴅ'}* ✨`, hasMediaAttachment: false }),
                        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.create({
                            cards: cards.map(card => ({
                                header: proto.Message.InteractiveMessage.Header.create({ title: card.title, hasMediaAttachment: true, imageMessage: media.imageMessage }),
                                body: proto.Message.InteractiveMessage.Body.create({ text: card.body }),
                                footer: proto.Message.InteractiveMessage.Footer.create({ text: card.footer }),
                                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                    buttons: [{ name: card.buttonName, buttonParamsJson: JSON.stringify(card.buttonParams) }]
                                })
                            }))
                        })
                    })
                }
            }
        }, { quoted: m });

        await sock.relayMessage(from, msg.message, { messageId: msg.key.id });
    }
};
