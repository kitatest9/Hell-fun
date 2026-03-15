import axios from 'axios';

export const command = {
    name: 'tagall',
    async execute(sock, m, args, { isGroup }) {
        if (!isGroup) return;
        const metadata = await sock.groupMetadata(m.key.remoteJid);
        const mentions = metadata.participants.map(p => p.id);
        let txt = `📢 *TAG ALL*\n🔖 _*From:* ${m.pushName}_\n📝 _*Message:* ${args.join(" ") || 'No Message'}_\n\n`;
        for (let mem of metadata.participants) txt += ` @${mem.id.split('@')[0]}\n`;
        let thumb;
        try {
            const ppUrl = await sock.profilePictureUrl(m.key.participant || m.key.remoteJid, 'image');
            const res = await axios.get(ppUrl, { responseType: 'arraybuffer' });
            thumb = Buffer.from(res.data);
        } catch (e) {
            // Default image agar DP na milay
            thumb = { url: 'https://i.ibb.co' };
        };
        await sock.sendMessage(m.key.remoteJid, { image: thumb, caption: txt, mentions }, { quoted: m });
    }
};
