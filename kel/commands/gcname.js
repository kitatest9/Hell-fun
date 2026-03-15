export const command = {
    name: 'setname',
    adminOnly: true,
    async execute(sock, m, args, { isGroup }) {
        if (!isGroup || !args[0]) return;
        await sock.groupUpdateSubject(m.key.remoteJid, args.join(" "));
        await sock.sendMessage(m.key.remoteJid, { text: "✅ Name Updated!" });
    }
};
