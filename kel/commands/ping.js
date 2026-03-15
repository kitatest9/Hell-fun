import { getTheme } from '../themeloader.js';

export const command = {
    name: "ping",
    ownerOnly: false,
    async execute(sock, m, args) {
        const from = m.key.remoteJid;
        const startTime = Date.now();

        // 1. Instant Response (Confirmation)
        await sock.sendMessage(from, { 
            text: "🏓 *PONG!*\n⏳ _Initializing Speed Test..._" 
        }, { quoted: m });

        // 2. Real Latency Calculation using [Baileys query](https://github.com)
        try {
            await sock.query({ tag: 'iq', attrs: { to: '@s.whatsapp.net', type: 'get', xmlns: 'w:p' }, content: [] });
        } catch (e) {}

        const actualPing = Date.now() - startTime;

        // 3. Fetching Theme Data (Character name and Random Image)
        const theme = await getTheme(); 

        // 4. Professional Caption
        const cleanTxt = `🚀 *SPEED TEST COMPLETE*\n\n` +
                         `👤 *Character:* ${theme.name}\n` +
                         `🛰️ *Latency:* ${actualPing} ms\n` +
                         `🤖 *Status:* Active\n` +
                         `📡 *Host:* Termux (Android)\n\n` +
                         `✨ _Powered by M0SHAHZAD_`;

        // 5. Sending Final Response with Random Character Image
        // { url: theme.image } format error se bachata hai
        await sock.sendMessage(from, { 
            image: { url: theme.image }, 
            caption: cleanTxt 
        }, { quoted: m });
    }
};