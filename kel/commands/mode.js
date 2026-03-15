export const command = {
    name: 'mode',
    ownerOnly: true,
    async execute(sock, m, args, { config }) {
        const from = m.key.remoteJid;
        const newMode = args[0]?.toLowerCase();
        const validModes = ['public', 'private', 'groups', 'selected'];

        if (validModes.includes(newMode)) {
            config.mode = newMode;
            return sock.sendMessage(from, { text: `✅ *Bot Mode:* ${newMode.toUpperCase()}` });
        }

        let txt = `⚙️ *MODE CONTROL PANEL*\n\n`;
        txt += `➥ *.mode public* (Sab ke liye)\n`;
        txt += `➥ *.mode private* (Sirf Owner DM)\n`;
        txt += `➥ *.mode groups* (Sirf Groups)\n`;
        txt += `➥ *.mode selected* (Authorized Groups Only)\n\n`;
        txt += `👉 *Current Mode:* ${config.mode.toUpperCase()}`;

        await sock.sendMessage(from, { text: txt });
    }
};
