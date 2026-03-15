export const command = {
    name: 'hidetag',
    adminOnly: true,
    async execute(sock, m, args, { isGroup }) {
        if (!isGroup) return;
        const metadata = await sock.groupMetadata(m.key.remoteJid);
        await sock.sendMessage(m.key.remoteJid, { text: args.join(" "), mentions: metadata.participants.map(p => p.id) });
    }
};
