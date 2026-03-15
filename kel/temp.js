// 1. Pehle pushName check karega
// 2. Agar wo nahi hai, toh number (JID) se ID nikalega
// 3. Agar wo bhi nahi, toh "User" likh dega
const senderName = m.pushName || m.key.participant?.split('@')[0] || m.key.remoteJid?.split('@')[0] || "User";

console.log(`Bhejne wale ka naam: ${senderName}`);


        // --- 1.5 AUTO VOICE SEND (Calling Voice.js Logic) ---
        const voiceCmd = commands.get('voice');
        if (voiceCmd && !prefix) {
            const sent = await voiceCmd.execute(sock, m, [body.trim()], { isOwner, autoSend: true });
            if (sent) return; 
        }

        // --- 2. MESSAGE BODY & PREFIX ---
        const prefix = config.prefix.find(p => body.startsWith(p));




            const cmd = commands.get(commandName);
            if (cmd) {
                // ... (Aapka purana execution logic yahan rahega) ...
            } else {
                // --- UNKNOWN COMMAND CARD ---
                const msg = generateWAMessageFromContent(from, {
                    viewOnceMessage: {
                        message: {
                            interactiveMessage: proto.Message.InteractiveMessage.create({
                                body: proto.Message.InteractiveMessage.Body.create({ 
                                    text: `*Unknown Command* ❌\n\nSorry, the command *${commandName.toUpperCase()}* does not exist in my system.\n\nPlease check the spelling or browse the menu below.` 
                                }),
                                footer: proto.Message.InteractiveMessage.Footer.create({ text: "ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍ𝟶sʜᴀʜᴢᴀᴅ ⚡️" }),
                                header: proto.Message.InteractiveMessage.Header.create({ title: "❗ *INVALID COMMAND*", hasMediaAttachment: false }),
                                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                    buttons: [{
                                        name: "quick_reply",
                                        buttonParamsJson: JSON.stringify({ 
                                            display_text: "✨ View All Commands", 
                                            id: `${mainPrefix}menu` 
                                        })
                                    }]
                                })
                            })
                        }
                    }
                }, { quoted: m });

                await sock.relayMessage(from, msg.message, { messageId: msg.key.id });
            }
