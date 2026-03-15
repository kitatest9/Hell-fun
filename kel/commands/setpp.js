export const command = {
    name: 'setpp',
    ownerOnly: true,
    async execute(sock, m, args) {
        const from = m.key.remoteJid;
        const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;

        if (quoted?.imageMessage) {
            const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
            
            await sock.updateProfilePicture(sock.user.id, buffer);
            await sock.sendMessage(from, { text: "✅ Profile Picture Updated!" });
        } else {
            await sock.sendMessage(from, { text: "❌ Kisi image ko reply karke .setpp likhein." });
        }
    }
};
