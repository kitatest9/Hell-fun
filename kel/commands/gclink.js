import axios from 'axios';

export const command = {
    name: 'gclink',
    adminOnly: false, 
    async execute(sock, m, args, { isGroup }) {
        if (!isGroup) return;
        const from = m.key.remoteJid;

        try {
            // 1. Bot ka Admin Status Check Karna
            const metadata = await sock.groupMetadata(from);
            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const isBotAdmin = metadata.participants.find(p => p.id === botId)?.admin !== null;

            if (!isBotAdmin) {
                return sock.sendMessage(from, { text: "❌ *ERROR:* Main is group ka *Admin* nahi hoon. Link nikalne ke liye mujhe Admin banayein!" }, { quoted: m });
            }

            // 2. Data Fetching
            const code = await sock.groupInviteCode(from);
            const groupLink = `https://chat.whatsapp.com/${code}`;
            
            let ppUrl;
            try {
                ppUrl = await sock.profilePictureUrl(from, 'image');
            } catch {
                ppUrl = 'https://i.ibb.co';
            }

            const response = await axios.get(ppUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data, 'binary');

            const captionText = `🔗 *GROUP INVITE LINK*\n\n` +
                                `🏢 *Group:* ${metadata.subject}\n` +
                                `📝 *Description:* \n${metadata.desc || 'No description set.'}\n\n` +
                                `📌 *Link:* ${groupLink}`;

            await sock.sendMessage(from, { 
                image: buffer, 
                caption: captionText 
            }, { quoted: m });

        } catch (e) {
            console.error("Link Error:", e);
            sock.sendMessage(from, { text: "⚠️ Link generate nahi ho saka. Shayad koi technical masla hai." });
        }
    }
};
