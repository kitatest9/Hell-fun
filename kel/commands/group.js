export const command = {
    name: "group",
    adminOnly: true,
    async execute(sock, m, args, { isGroup }) {
        if (!isGroup) return;
        const from = m.key.remoteJid;

        const metadata = await sock.groupMetadata(from);
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = metadata.participants.find(p => p.id === botId)?.admin;

        if (!isBotAdmin) {
            return sock.sendMessage(from, { 
                text: "❌ *COMMAND FAILED*\n\nI cannot modify group settings because I am not an *Admin*. Please fix this! ⚙️🔧" 
            }, { quoted: m });
        }

        if (args[0] === 'open') {
            await sock.groupSettingUpdate(from, 'not_announcement');
            await sock.sendMessage(from, { text: "🔓 *Group Settings Updated:* All members can now send messages! ✅" });
        } else if (args[0] === 'close') {
            await sock.groupSettingUpdate(from, 'announcement');
            await sock.sendMessage(from, { text: "🔒 *Group Settings Updated:* Only Admins can send messages! 🚫" });
        }
    }
};
