import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Baileys essential imports
import { 
    generateWAMessageFromContent, 
    proto, 
    prepareWAMessageMedia, 
    delay, 
    downloadContentFromMessage } from '@kelvdra/baileys';

// --- DATABASE SETUP ---
const dbPath = './database.json';
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ authorizedGroups: [], users: {} }, null, 2));
let db = JSON.parse(fs.readFileSync(dbPath));
const saveDB = () => fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

export const commands = new Map();

// --- SMART COMMANDS LOADER (With Hot-Reload Support) ---
const loadCommands = async () => {
    const commandFiles = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
        try {
            const { command } = await import(`./commands/${file}?update=${Date.now()}`);
            commands.set(command.name, command);
            if (command.alias) {
                command.alias.forEach(alias => commands.set(alias, command));
            }
        } catch (e) { console.error(`❌ Error loading ${file}:`, e.message); }
    }
    console.log(`✅ ${commands.size} Commands/Aliases Ready!`);
};
loadCommands();

export const handleMessages = async (sock, chatUpdate) => {
    try {
        if (chatUpdate.type !== 'notify') return;

        for (const m of chatUpdate.messages) {
            if (!m || !m.message) continue;

            // 1. --- SYSTEM FILTERS ---
            if (m.key && m.key.remoteJid === 'status@broadcast') continue; 
            const messageTimestamp = m.key.id.length < 20 ? m.messageTimestamp : m.messageTimestamp * 1000;
            if (Date.now() - messageTimestamp > 60000) continue; 

            // 2. --- BASIC CONSTANTS ---
            const from = m.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const sender = m.key.participant || m.key.remoteJid;
            const senderNumber = sender.replace(/[^0-9]/g, ''); 
            const isOwner = senderNumber.includes(config.ownerNumber) || m.key.fromMe === true;
            const pushName = m.pushName || 'User';
            const mainPrefix = Array.isArray(config.prefix) ? config.prefix[0] : config.prefix;

            // 3. --- INTERACTION & BODY EXTRACTION ---
            const interactiveMsg = m.message.interactiveResponseMessage;
            
            const btnId = m.message.buttonsResponseMessage?.selectedButtonId || 
                          m.message.templateButtonReplyMessage?.selectedId ||
                          m.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
                          (interactiveMsg?.nativeFlowResponseMessage?.paramsJson ? 
                          JSON.parse(interactiveMsg.nativeFlowResponseMessage.paramsJson).id : 
                          interactiveMsg?.body?.text);

            const pollVote = m.message.pollUpdateMessage?.vote?.selectedOptions?.[0]?.name;
            
            const body = m.message.conversation || 
                         m.message.extendedTextMessage?.text || 
                         btnId || 
                         pollVote || 
                         m.message.imageMessage?.caption || 
                         m.message.videoMessage?.caption || 
                         "";

            // 4. --- AUTO REACT & PRESENCE ---
            if (body && !m.key.fromMe) {
                await sock.readMessages([m.key]); // Auto-Read
                //const emojis = ['⚡', '✨', '🤖', '👑'];
                //await sock.sendMessage(from, { react: { text: emojis[Math.floor(Math.random() * emojis.length)], key: m.key } });
            }

            // 5. --- TERMINAL LOG ---
            console.log(`\n📩 [${pushName}] -> ${body.slice(0, 50)}`);

            // 6. --- COMMAND PARSING ---
            const prefix = config.prefix.find(p => body.startsWith(p));
         
            
            // 7. --- MEDIA HELPER ---
            const isMedia = (m.message.imageMessage || m.message.videoMessage || m.message.audioMessage || m.message.stickerMessage);
            const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;

            if (!prefix) {
                // --- A. VOICE AUTO-RESPONSE (Exact Match Only) ---
                const voiceCmd = commands.get('voice');
                if (voiceCmd) {
                    // Hum check kar rahe hain ke kya message kisi voice name se match karta hai?
                    const wasSent = await voiceCmd.execute(sock, m, body.trim(), { isOwner, isGroup, autoSend: true });
                    
                    // Agar voice file mil gayi aur bhej di gayi, toh agla message check karo (continue)
                    if (wasSent === true) continue;
                }

                // --- B. AI MODE (Optional) ---
                // Agar aap chahte hain ke voice na milne par AI reply kare:
                /*
                const aiCmd = commands.get('ai');
                if (aiCmd && body.length > 2) {
                    await aiCmd.execute(sock, m, [body], { config, isOwner, isGroup });
                    continue; 
                }
                */

                continue; // Non-prefix messages ke liye yahan loop end ho jayega (No Menu Spam)
            }

            const args = body.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
                        const cmd = commands.get(commandName);
                    
                    
            if (cmd) {
                const mainPrefix = Array.isArray(config.prefix) ? config.prefix[0] : config.prefix;

                // --- 1. OWNER ONLY CHECK ---
                if (cmd.ownerOnly && !isOwner) {
                    const msg = generateWAMessageFromContent(from, {
                        viewOnceMessage: {
                            message: {
                                interactiveMessage: proto.Message.InteractiveMessage.create({
                                    body: { text: `*Access Denied* 🔒\n\nThe command *${commandName.toUpperCase()}* is restricted to the *Bot Owner* only.` },
                                    footer: { text: "ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍ𝟶sʜᴀʜᴢᴀᴅ ⚡️" },
                                    header: { title: "❗ *RESTRICTED ACCESS*", hasMediaAttachment: false },
                                    nativeFlowMessage: {
                                        buttons: [{
                                            name: "quick_reply",
                                            buttonParamsJson: JSON.stringify({ display_text: "👑 Contact Owner", id: `${mainPrefix}owner` })
                                        }]
                                    }
                                })
                            }
                        }
                    }, { quoted: m });
                    await sock.relayMessage(from, msg.message, { messageId: msg.key.id });
                    continue;
                }

                // --- 2. ADMIN ONLY CHECK ---
                if (cmd.adminOnly) {
                    if (!isGroup) {
                        await sock.sendMessage(from, { text: "❌ *Group Only:* This command can only be used within groups." }, { quoted: m });
                        continue;
                    }
                    const metadata = await sock.groupMetadata(from);
                    const participant = metadata.participants.find(p => p.id === sender);
                    const isAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin';

                    if (!isAdmin && !isOwner) {
                        const msg = generateWAMessageFromContent(from, {
                            viewOnceMessage: {
                                message: {
                                    interactiveMessage: proto.Message.InteractiveMessage.create({
                                        body: { text: `*Admin Access Required* 👮\n\nYou must be a *Group Admin* to use the *${commandName.toUpperCase()}* command.` },
                                        footer: { text: "ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍ𝟶sʜᴀʜᴢᴀᴅ ⚡️" },
                                        header: { title: "❗ *PERMISSION DENIED*", hasMediaAttachment: false },
                                        nativeFlowMessage: {
                                            buttons: [{
                                                name: "quick_reply",
                                                buttonParamsJson: JSON.stringify({ display_text: "✨ Open Menu", id: `${mainPrefix}menu` })
                                            }]
                                        }
                                    })
                                }
                            }
                        }, { quoted: m });
                        await sock.relayMessage(from, msg.message, { messageId: msg.key.id });
                        continue;
                    }
                }

                // --- 3. EXECUTION ---
                try {
                    const botId = (sock.user.id.split(':') || sock.user.id) + '@s.whatsapp.net';
                    await cmd.execute(sock, m, args, { 
                        config, isOwner, isGroup, db, saveDB, 
                        pushName, sender, senderNumber, botId, 
                        proto, generateWAMessageFromContent, prepareWAMessageMedia 
                    });
                } catch (e) {
                    console.error(`❌ Error in ${commandName}:`, e);
                    const msg = generateWAMessageFromContent(from, {
                        viewOnceMessage: {
                            message: {
                                interactiveMessage: proto.Message.InteractiveMessage.create({
                                    body: { text: `*Oops! Something went sideways* 🧊\n\nAn error occurred while executing *${commandName.toUpperCase()}*.\n\nPlease try again or use the button below to return to the main menu.` },
                                    footer: { text: "ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍ𝟶sʜᴀʜᴢᴀᴅ ⚡️" },
                                    header: { title: "❗ *SYSTEM ERROR*", hasMediaAttachment: false },
                                    nativeFlowMessage: {
                                        buttons: [{
                                            name: "quick_reply",
                                            buttonParamsJson: JSON.stringify({ display_text: "✨ Open Menu", id: `${mainPrefix}menu` })
                                        }]
                                    }
                                })
                            }
                        }
                    }, { quoted: m });
                    await sock.relayMessage(from, msg.message, { messageId: msg.key.id });
                }
            } else {
                // --- 4. UNKNOWN COMMAND (THE ELSE BLOCK) ---
                const mainPrefix = Array.isArray(config.prefix) ? config.prefix[0] : config.prefix;
                const msg = generateWAMessageFromContent(from, {
                    viewOnceMessage: {
                        message: {
                            interactiveMessage: proto.Message.InteractiveMessage.create({
                                body: { text: `*Unknown Command* ❌\n\nSorry, the command *${commandName.toUpperCase()}* does not exist in my system.\n\nPlease check the spelling or browse the menu below.` },
                                footer: { text: "ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍ𝟶sʜᴀʜᴢᴀᴅ ⚡️" },
                                header: { title: "❗ *INVALID COMMAND*", hasMediaAttachment: false },
                                nativeFlowMessage: {
                                    buttons: [{
                                        name: "quick_reply",
                                        buttonParamsJson: JSON.stringify({ display_text: "✨ View All Commands", id: `${mainPrefix}menu` })
                                    }]
                                }
                            })
                        }
                    }
                }, { quoted: m });
                await sock.relayMessage(from, msg.message, { messageId: msg.key.id });
            }

            }
        
    } catch (err) { console.error("❌ Critical Main Error:", err); }
};
