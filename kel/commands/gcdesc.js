export const command = {
    name: 'setdesc',
    adminOnly: true,
    async execute(sock, m, args, { isGroup }) {
        if (!isGroup) return;
        const from = m.key.remoteJid;

        try {
            // 1. Bot Admin Check
            const metadata = await sock.groupMetadata(from);
            const botId = sock.user.id.split(':') + '@s.whatsapp.net';
            const isBotAdmin = metadata.participants.find(p => p.id === botId)?.admin;

            if (!isBotAdmin) {
                return sock.sendMessage(from, { 
                    text: "🚫 *SYSTEM ERROR*\n\nI need *Admin Permissions* to modify the group description. Please promote me! 📖🖋️" 
                }, { quoted: m });
            }

            // 2. Input Check
            if (!args || args.length === 0) {
                return sock.sendMessage(from, { text: "📝 *Please provide the new description text!*" });
            }

            // 3. Update Description
            await sock.groupUpdateDescription(from, args.join(" "));
            await sock.sendMessage(from, { text: "✅ *Group description updated successfully!* 📜🔥" });

        } catch (e) {
            console.error("SetDesc Error:", e);
            sock.sendMessage(from, { text: "❌ *Failed to update description. Please try again later!*" });
        }
    }
};
