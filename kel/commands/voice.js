import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadContentFromMessage } from '@kelvdra/baileys'; // Aapka specific baileys version
import ffmpeg from 'fluent-ffmpeg';
import { getTheme } from '../themeloader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const voiceDir = path.resolve(__dirname, '../voices');
if (!fs.existsSync(voiceDir)) fs.mkdirSync(voiceDir, { recursive: true });

export const command = {
    name: "voice",
    alias: ["v"],
    ownerOnly: false,
    async execute(sock, m, args, { isOwner, autoSend = false } = {}) {
        const from = m.key.remoteJid;

        // --- 1. AUTO SEND LOGIC (Exact Match Only) ---
        if (autoSend) {
            const name = Array.isArray(args) ? args.join(' ') : args; 
            const filePath = path.join('./voices', `${name}.ogg`);
            
            if (fs.existsSync(filePath)) {
                const waveform = Buffer.from([
                    0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255,
                    0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255,
                    0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255,
                    0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255
                ]);

                await sock.sendMessage(from, { 
                    audio: { url: filePath }, 
                    mimetype: 'audio/ogg; codecs=opus', 
                    ptt: true,
                    waveform: waveform 
                }, { quoted: m });
                return true; // Indicate success to main.js
            }
            return false; // No match found, don't show menu
        }

        // --- 2. COMMAND LOGIC (Prefix Used) ---
        const action = Array.isArray(args) ? args[0]?.toLowerCase() : "";
        const input = Array.isArray(args) ? args.slice(1).join(' ') : "";

        // SHOW MENU: Agar sirf !voice likha ho
        if (!action) {
            const theme = await getTheme();
            const menuText = `🔊 *VOICE MENU*\n\n` +
                `1️⃣ *!voice add [name]*\n` +
                `_Reply to audio to save it._\n\n` +
                `2️⃣ *!voice list*\n` +
                `_View all saved voices._\n\n` +
                `3️⃣ *!voice remove [name]*\n` +
                `_Delete a voice._\n\n` +
                `💡 *TIP:* Type the exact name without prefix to send a voice note.\n\n` +
                `✨ _Powered by M0SHAHZAD_`;
            
            return sock.sendMessage(from, { 
                image: { url: theme.image }, 
                caption: menuText 
            }, { quoted: m });
        }

        // ADD VOICE
        if (action === 'add') {
            const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage || m.message;
            const type = Object.keys(quoted || {}).find(t => t.includes('Message'));
            
            if (!['audioMessage', 'videoMessage'].includes(type)) 
                return sock.sendMessage(from, { text: "⚠️ Please reply to an Audio or Video!" });
            if (!input) 
                return sock.sendMessage(from, { text: "⚠️ Please provide a name! Example: !voice add hello" });

            try {
                const stream = await downloadContentFromMessage(quoted[type], type.replace('Message', ''));
                let buffer = Buffer.from([]);
                for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                
                const tempIn = path.join(voiceDir, `temp_${Date.now()}`);
                const finalOut = path.join('./voices', `${input}.ogg`);
                fs.writeFileSync(tempIn, buffer);

                ffmpeg(tempIn)
                    .outputOptions(['-vn', '-acodec libopus', '-ar 48000', '-ac 1', '-f ogg'])
                    .on('end', () => {
                        if (fs.existsSync(tempIn)) fs.unlinkSync(tempIn);
                        sock.sendMessage(from, { text: `✅ Successfully Saved: *${input}*` });
                    })
                    .on('error', (err) => {
                        if (fs.existsSync(tempIn)) fs.unlinkSync(tempIn);
                        console.error(err);
                        sock.sendMessage(from, { text: "❌ Encoding Failed! Make sure FFmpeg is installed." });
                    })
                    .save(finalOut);
            } catch (e) { 
                console.error(e);
                sock.sendMessage(from, { text: "❌ Processing Error!" }); 
            }
        } 

        // LIST VOICES
        else if (action === 'list') {
            const files = fs.readdirSync('./voices').filter(f => f.endsWith('.ogg')).map(f => f.replace('.ogg', ''));
            if (files.length === 0) return sock.sendMessage(from, { text: "📂 The voice list is empty." });
            const listText = files.map((f, i) => `*${i + 1}.* ${f}`).join('\n');
            await sock.sendMessage(from, { text: `🔊 *SAVED VOICES:*\n\n${listText}` });
        }

        // REMOVE VOICE
        else if (action === 'remove' || action === 'del') {
            const files = fs.readdirSync('./voices').filter(f => f.endsWith('.ogg'));
            let fileToDelete = "";

            if (!isNaN(input) && input.trim() !== "") { 
                const index = parseInt(input) - 1;
                if (files[index]) fileToDelete = files[index];
            } else {
                fileToDelete = `${input}.ogg`;
            }

            const filePath = path.join('./voices', fileToDelete);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                sock.sendMessage(from, { text: `🗑️ Removed: ${fileToDelete.replace('.ogg', '')}` });
            } else {
                sock.sendMessage(from, { text: "❌ Voice not found." });
            }
        }
    }
};
