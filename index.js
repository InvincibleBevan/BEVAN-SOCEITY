const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  fetchLatestBaileysVersion,
  Browsers,
} = require('@whiskeysockets/baileys');

const l = console.log;
const {
  getBuffer,
  getGroupAdmins,
  getRandom,
  h2k,
  isUrl,
  Json,
  runtime,
  sleep,
  fetchJson,
} = require('./lib/functions');
const fs = require('fs');
const ff = require('fluent-ffmpeg');
const P = require('pino');
const config = require('./config');
const rankCommand = require('./plugins/rank');
const qrcode = require('qrcode-terminal');
const StickersTypes = require('wa-sticker-formatter');
const util = require('util');
const { sms, downloadMediaMessage } = require('./lib/msg');
const axios = require('axios');
const { File } = require('megajs');
const { fromBuffer } = require('file-type');
const bodyparser = require('body-parser');
const { tmpdir } = require('os');
const Crypto = require('crypto');
const path = require('path');
const prefix = config.PREFIX;

const ownerNumber = ['254797827405'];

//===================SESSION-AUTH============================
const sessionPath = path.join(__dirname, 'sessions', 'creds.json');
if (!fs.existsSync(sessionPath)) {
  if (!config.SESSION_ID) {
    console.log('Please add your session to SESSION_ID env !!');
    process.exit(1);
  }
  const sessdata = config.SESSION_ID.replace('INFINITE-MD~', '');
  const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
  filer.download((err, data) => {
    if (err) throw err;
    fs.writeFile(sessionPath, data, () => {
      console.log('SESSION DOWNLOADED COMPLETED ✅');
    });
  });
}

const express = require('express');
const app = express();
const port = process.env.PORT || 9090;

// Start Express server if needed (optional for bot only, but good for health check)
app.get('/', (req, res) => {
  res.send('INFINITE-MD WhatsApp Bot is running.');
});
app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});

async function connectToWA() {
  console.log('CONNECTING INFINITE-MD 🧬...');
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'sessions'));
  const { version } = await fetchLatestBaileysVersion();

  const conn = makeWASocket({
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    browser: Browsers.macOS('Firefox'),
    syncFullHistory: true,
    auth: state,
    version,
  });

  conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        connectToWA();
      }
    } else if (connection === 'open') {
      console.log('♻️ INSTALLING PLUGINS FILES PLEASE WAIT... 🪄');
      fs.readdirSync('./plugins/').forEach((plugin) => {
        if (path.extname(plugin).toLowerCase() === '.js') {
          require('./plugins/' + plugin);
        }
      });
      console.log('PLUGINS FILES INSTALL SUCCESSFULLY ✅');
      console.log('INFINITE-MD CONNECTED TO WHATSAPP ENJOY ✅');

      let up = `*╭──────────────●●►*
> *➺ INFINITE-MD ᴄᴏɴɴᴇᴄᴛᴇᴅ sᴜᴄᴄᴇssғᴜʟʟʏ ᴛʏᴘᴇ .ᴍᴇɴᴜ ᴛᴏ ᴄᴏᴍᴍᴀɴᴅ ʟɪsᴛ ᴄʀᴇᴀᴛᴇᴅ ʙʏ your name ✅*

> *❁ᴊᴏɪɴ ᴏᴜʀ ᴡʜᴀᴛsᴀᴘᴘ ᴄʜᴀɴɴᴇʟ ғᴏʀ ᴜᴘᴅᴀᴛᴇs 

*https://whatsapp.com/channel/0029Vb4ezfxBadmWJzvNM13J*

*YOUR BOT ACTIVE NOW ENJOY♥️🪄*\n\n*PREFIX: ${prefix}*

*╰──────────────●●►*`;
      conn.sendMessage(conn.user.id, { image: { url: config.MENU_IMG }, caption: up });
    }
  });

  conn.ev.on('creds.update', saveCreds);

  //=============readstatus=======
  conn.ev.on('messages.upsert', async (mekObj) => {
    const mek = mekObj.messages[0];
    if (!mek.message) return;

    mek.message =
      getContentType(mek.message) === 'ephemeralMessage'
        ? mek.message.ephemeralMessage.message
        : mek.message;

    // Status read
    if (
      mek.key &&
      mek.key.remoteJid === 'status@broadcast' &&
      config.AUTO_READ_STATUS === 'true'
    ) {
      await conn.readMessages([mek.key]);
    }

    const m = sms(conn, mek);
    const type = getContentType(mek.message);
    const content = JSON.stringify(mek.message);
    const from = mek.key.remoteJid;
    const quoted =
      type === 'extendedTextMessage' &&
      mek.message.extendedTextMessage.contextInfo != null
        ? mek.message.extendedTextMessage.contextInfo.quotedMessage || []
        : [];
    // Fix body assignment logic
    let body = '';
    if (type === 'conversation') body = mek.message.conversation;
    else if (type === 'extendedTextMessage') body = mek.message.extendedTextMessage.text;
    else if (type === 'imageMessage' && mek.message.imageMessage.caption)
      body = mek.message.imageMessage.caption;
    else if (type === 'videoMessage' && mek.message.videoMessage.caption)
      body = mek.message.videoMessage.caption;

    if (!body) body = '';
    const isCmd = body.startsWith(prefix);
    const command = isCmd
      ? body.slice(prefix.length).trim().split(' ')[0].toLowerCase()
      : '';
    const args = body.trim().split(/ +/).slice(1);
    const q = args.join(' ');
    const isGroup = from.endsWith('@g.us');
    const sender = mek.key.fromMe
      ? conn.user.id.split(':')[0] + '@s.whatsapp.net'
      : mek.key.participant || mek.key.remoteJid;
    const senderNumber = sender.split('@')[0];
    const botNumber = conn.user.id.split(':')[0];
    const pushname = mek.pushName || 'Sin Nombre';
    const isMe = botNumber.includes(senderNumber);
    const isOwner = ownerNumber.includes(senderNumber) || isMe;
    const botNumber2 = await jidNormalizedUser(conn.user.id);
    const groupMetadata = isGroup
      ? await conn.groupMetadata(from).catch(() => ({}))
      : {};
    const groupName = isGroup ? groupMetadata.subject : '';
    const participants = isGroup ? groupMetadata.participants || [] : [];
    const groupAdmins = isGroup ? await getGroupAdmins(participants) : [];
    const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false;
    const isAdmins = isGroup ? groupAdmins.includes(sender) : false;
    const isReact = m.message && m.message.reactionMessage ? true : false;
    const reply = (teks) => {
      conn.sendMessage(from, { text: teks }, { quoted: mek });
    };

    // sendFileUrl helper
    conn.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
      let mime = '';
      let res = await axios.head(url);
      mime = res.headers['content-type'];
      if (mime.split('/')[1] === 'gif') {
        return conn.sendMessage(
          jid,
          { video: await getBuffer(url), caption, gifPlayback: true, ...options },
          { quoted, ...options }
        );
      }
      let type = mime.split('/')[0] + 'Message';
      if (mime === 'application/pdf') {
        return conn.sendMessage(
          jid,
          { document: await getBuffer(url), mimetype: 'application/pdf', caption, ...options },
          { quoted, ...options }
        );
      }
      if (mime.split('/')[0] === 'image') {
        return conn.sendMessage(
          jid,
          { image: await getBuffer(url), caption, ...options },
          { quoted, ...options }
        );
      }
      if (mime.split('/')[0] === 'video') {
        return conn.sendMessage(
          jid,
          { video: await getBuffer(url), caption, mimetype: 'video/mp4', ...options },
          { quoted, ...options }
        );
      }
      if (mime.split('/')[0] === 'audio') {
        return conn.sendMessage(
          jid,
          { audio: await getBuffer(url), caption, mimetype: 'audio/mpeg', ...options },
          { quoted, ...options }
        );
      }
    };

    //================ownerreact==============
    if (senderNumber === ownerNumber[0] && !isReact) {
      // Only react once per message, if not already reacted
      m.react('👑');
      m.react('🦋');
      m.react('🎀');
    }

    //==========================public react===============//
    // Auto React (for everyone except bot)
    if (!isReact && senderNumber !== botNumber) {
      if (config.AUTO_REACT === 'true') {
        const reactions = [
          '😊',
          '👍',
          '😂',
          '💯',
          '🔥',
          '🙏',
          '🎉',
          '👏',
          '😎',
          '🤖',
          '👫',
          '👭',
          '👬',
          '👮',
          '🕴️',
          '💼',
          '📊',
          '📈',
          '📉',
          '📝',
          '🌟',
        ];
        const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
        m.react(randomReaction);
      }
    }

    // Owner React (for bot messages)
    if (!isReact && senderNumber === botNumber) {
      if (config.OWNER_REACT === 'true') {
        const reactions = [
          '😊',
          '👍',
          '😂',
          '💯',
          '🔥',
          '🙏',
          '🎉',
          '👏',
          '😎',
          '🤖',
          '👫',
          '👭',
          '👬',
          '👮',
          '🕴️',
          '💼',
          '📊',
          '📈',
          '📉',
          '📝',
          '🌟',
        ];
        const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
        m.react(randomReaction);
      }
    }

    // ===================== COMMAND HANDLER =====================
    if (isCmd) {
      // Example: menu command
      if (command === 'menu') {
        reply('Here is your menu...');
      }
      // Add more commands below as needed
      // if (command === 'rank') {
      //   rankCommand.run({ conn, m, args, reply }); // Example structure
      // }
    }
  });
}

connectToWA();
