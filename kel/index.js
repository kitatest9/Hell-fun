import { handleMessages } from './main.js';
import { config } from './config.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import { 
    makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    makeCacheableSignalKeyStore, 
    fetchLatestBaileysVersion, 
    Browsers 
} from '@kelvdra/baileys';

const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

let isAsking = false;

async function startBot() {
    const authFolder = 'Session';

    // --- 1. ATLAS SESSION RESTORE ---
    if (config.sessionId && config.sessionId.startsWith('KEL-') && !fs.existsSync(`./${authFolder}/creds.json`)) {
        try {
            if (!fs.existsSync(`./${authFolder}`)) fs.mkdirSync(`./${authFolder}`);
            const actualBase64 = config.sessionId.replace('KEL-', '');
            const decryptedSession = Buffer.from(actualBase64, 'base64').toString('utf-8');
            fs.writeFileSync(`./${authFolder}/creds.json`, decryptedSession);
            console.log("📂 [SYSTEM]: KEL Session loaded from config!");
        } catch (e) { console.log("❌ [ERROR]: Session decode failed."); }
    }

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
        },
        printQRInTerminal: false, // QR Code Disabled
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Safari'), 
        markOnline: true
    });

    // --- 2. DIRECT PAIRING LOGIC ---
    if (!sock.authState.creds.registered && !isAsking) {
        isAsking = true;
        console.log("\n🔗 --- KEL PAIRING MODE --- 🔗");
        const phoneNumber = await question("Enter Your Phone Number (e.g. 923001234567): ");
        
        if (phoneNumber) {
            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode(phoneNumber.trim());
                    console.log(`\n🔥 YOUR PAIRING CODE: ${code}\n`);
                    console.log("📌 Go to WhatsApp > Linked Devices > Link with Phone Number\n");
                } catch (err) {
                    console.log("❌ Error generating pairing code. Restarting...");
                    isAsking = false;
                    startBot();
                }
            }, 3000);
        }
    }

    // --- 3. CONNECTION UPDATES ---
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const reason = (new Boom(lastDisconnect?.error))?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                isAsking = false;
                startBot();
            } else {
                console.log("❌ Logged out. Delete 'Session' folder and restart.");
                process.exit();
            }
        } else if (connection === 'open') {
            isAsking = false;
            console.log('\n✅ KEL BOT IS LIVE & CONNECTED! 🚀');
        }
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        await handleMessages(sock, chatUpdate);
    });
}

startBot().catch(err => console.log(err));
