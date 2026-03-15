export const command = {
    name: 'gc',
    ownerOnly: true,
    async execute(sock, m, args, { db, saveDB, config }) {
        const from = m.key.remoteJid;
        const action = args[0]?.toLowerCase();

        if (action === 'add') {
            if (db.authorizedGroups.includes(from)) return sock.sendMessage(from, { text: "✅ Already Authorized." });
            db.authorizedGroups.push(from);
            saveDB();
            return sock.sendMessage(from, { text: "🚀 Group Added to Selected List!" });
        }

        if (action === 'remove') {
            const index = db.authorizedGroups.indexOf(from);
            if (index > -1) {
                db.authorizedGroups.splice(index, 1);
                saveDB();
                return sock.sendMessage(from, { text: "🚫 Group Removed!" });
            }
        }

        if (action === 'list') {
            if (db.authorizedGroups.length === 0) return sock.sendMessage(from, { text: "📝 List Khali Hai." });
            
            let txt = "📋 *AUTHORIZED GROUPS:*\n\n";
            console.log("\n--- [AUTHORIZED JIDs] ---"); 

            for (let [i, jid] of db.authorizedGroups.entries()) {
                try {
                    const metadata = await sock.groupMetadata(jid);
                    txt += `${i + 1}. 📛 ${metadata.subject}\n`;
                } catch {
                    txt += `${i + 1}. 🆔 ${jid} (Left/Unknown)\n`;
                }
                console.log(`[${i + 1}] ${jid}`); // Terminal print
            }
            return sock.sendMessage(from, { text: txt });
        }

        if (action === 'status') {
            const isAuth = db.authorizedGroups.includes(from);
            return sock.sendMessage(from, { text: `📊 *Status:* ${isAuth ? "✅ Authorized" : "❌ Unauthorized"}\n⚙️ *Mode:* ${config.mode.toUpperCase()}` });
        }

        // Default Panel
        let menu = `🎮 *GROUP CONTROL PANEL*\n\n`;
        menu += `➥ *.gc add* (Is group ko allow karein)\n`;
        menu += `➥ *.gc remove* (Is group ko block karein)\n`;
        menu += `➥ *.gc list* (Authorized groups dekhein)\n`;
        menu += `➥ *.gc status* (Current group check)`;
        
        await sock.sendMessage(from, { text: menu });
    }
};
