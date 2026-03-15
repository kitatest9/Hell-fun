import axios from 'axios';

export const command = {
    name: 'owner',
    async execute(sock, m, args, { config }) {
        const from = m.key.remoteJid;
        
        // 1. Owner Details
        const ownerNumber = config.ownerNumber; // 923xxxxxxxx
        const ownerJid = `${ownerNumber}@s.whatsapp.net`;
        const ownerName = "Light Yagami"; 
        
        // 2. LIVE PROFILE PICTURE FETCHING
        let thumb;
        try {
            const ppUrl = await sock.profilePictureUrl(ownerJid, 'image');
            const res = await axios.get(ppUrl, { responseType: 'arraybuffer' });
            thumb = Buffer.from(res.data);
        } catch (e) {
            // Default image agar DP na milay
            thumb = { url: 'https://i.ibb.co' };
        }

        // 3. SEND OWNER INFO MESSAGE (Instant)
        const ownerTxt = `👤 *OWNER INFORMATION* 👤\n\n` +
                         `✨ *Name:* ${ownerName}\n` +
                         `🤖 *Bot:* ${config.botName}\n` +
                         `📱 *WhatsApp:* wa.me/${ownerNumber}\n\n` +
                         `🛡️ _Feel free to contact for any queries!_`;

        await sock.sendMessage(from, { 
            image: thumb, 
            caption: ownerTxt 
        }, { quoted: m });

        // 4. SEND CONTACT CARD (Instant - No Delay)
        const vcard = 'BEGIN:VCARD\n' + 'VERSION:3.0\n' + 
                      `FN:${ownerName}\n` + 
                      `ORG:${config.botName} Developer;\n` + 
                      `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}\n` + 
                      'END:VCARD';

        await sock.sendMessage(from, {
            contacts: {
                displayName: ownerName,
                contacts: [{ vcard }]
            }
        }, { quoted: m });
    }
};
