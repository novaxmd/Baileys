# toxic-baileys™ ⭐

<div align="center">

[![npm version](https://img.shields.io/npm/v/toxic-baileys.svg?style=for-the-badge)](https://www.npmjs.com/package/toxic-baileys)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![npm downloads](https://img.shields.io/npm/dm/toxic-baileys.svg?style=for-the-badge)](https://www.npmjs.com/package/toxic-baileys)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?style=for-the-badge&logo=github)](https://github.com/xhclintohn/Baileys)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen?style=for-the-badge)](https://nodejs.org)

</div>

A professionally enhanced, feature-rich fork of the Baileys WhatsApp Web API. Built for developers who need robust, stable WhatsApp automation with extended message types, improved connection handling, and comprehensive documentation.

**Maintainer:** 𝐱𝐡_𝐜𝐥𝐢𝐧𝐭𝐨𝐧 ✓

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
- [🔌 Connection & Configuration](#-connection--configuration)
- [💾 Authentication State Management](#-authentication-state-management)
- [📤 Sending Messages](#-sending-messages)
  - [Basic Messages](#basic-messages)
  - [Media Messages](#media-messages)
  - [Interactive Messages](#interactive-messages)
  - [Album Messages](#album-messages)
  - [Event Messages](#event-messages)
  - [Poll & Poll Result Messages](#poll--poll-result-messages)
  - [Group Status Messages](#group-status-messages)
  - [Payment Request Messages](#payment-request-messages)
  - [Product Messages](#product-messages)
  - [Button & Template Messages](#button--template-messages)
- [📁 Chat & Message Management](#-chat--message-management)
- [👥 Group Management](#-group-management)
- [👤 User & Profile Management](#-user--profile-management)
- [📡 Newsletter / Channel Management](#-newsletter--channel-management)
- [🔒 Privacy & Block Management](#-privacy--block-management)
- [🗄️ Data Store Implementation](#️-data-store-implementation)
- [🛠️ Utility Functions](#️-utility-functions)
- [💡 Best Practices & Tips](#-best-practices--tips)
- [⚠️ Important Legal Notice](#️-important-legal-notice)
- [🆘 Getting Help](#-getting-help)
- [📄 License](#-license)

---

## ✨ Features

- 🚀 **Modern & Fast** — Latest WA version `[2,3000,1035194821]`, optimised pre-key upload (812 keys)
- 🔧 **Enhanced Stability** — Improved connection handling, rate-limit backoff, 5 s keepAlive grace
- 📱 **Multi-Device Support** — Full WhatsApp multi-device protocol with improved `historySyncConfig`
- 🔐 **End-to-End Encryption** — Signal Protocol, `inlineInitialPayloadInE2EeMsg: true`
- 📨 **Extended Message Types** — Interactive, album, event, poll result, group status, payment, product
- 👥 **Advanced Group Management** — Group controls, group status V2, communities support
- 💾 **Flexible Auth** — Multi-file auth state with `makeCacheableSignalKeyStore`
- 📡 **Full Newsletter/Channel API** — Follow, create, metadata, `newsletterId()` helper
- 🛠️ **Developer Friendly** — `toxicHandler` exposed on socket, clean API
- 🌐 **WebSocket Improvements** — `perMessageDeflate: false`, 100 MB max payload

---

## 📦 Installation

### Via npm
```bash
npm install toxic-baileys
```

### Via Yarn
```bash
yarn add toxic-baileys
```

### From GitHub (edge)
```bash
npm install github:xhclintohn/Baileys
```

### Drop-in replacement for `@whiskeysockets/baileys`
```json
{
  "dependencies": {
    "@whiskeysockets/baileys": "npm:toxic-baileys@latest"
  }
}
```

---

## 🚀 Quick Start

<details>
<summary>Basic Connection (QR Code)</summary>

```javascript
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = import makeWASocket from 'toxic-baileys';
const { Boom } = require('@hapi/boom');

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({ auth: state, printQRInTerminal: true });

    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('Connected!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const m of messages) {
            if (!m.message) continue;
            console.log('Message:', JSON.stringify(m, undefined, 2));
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp().catch(console.error);
```
</details>

<details>
<summary>Pairing Code (no QR)</summary>

```javascript
const { makeWASocket, useMultiFileAuthState } = import makeWASocket from 'toxic-baileys';

async function connectWithPairing() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({ auth: state, printQRInTerminal: false });
    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        const phoneNumber = '254712345678'; // no + or spaces
        const code = await sock.requestPairingCode(phoneNumber);
        console.log('Pairing Code:', code);
    }
}

connectWithPairing().catch(console.error);
```
</details>

---

## 🔌 Connection & Configuration

<details>
<summary>Full Socket Configuration</summary>

```javascript
const { makeWASocket, Browsers } = import makeWASocket from 'toxic-baileys';
const NodeCache = require('@cacheable/node-cache');

const groupCache = new NodeCache({ stdTTL: 300, useClones: false });

const sock = makeWASocket({
    browser: Browsers.macOS('Chrome'),
    syncFullHistory: true,
    markOnlineOnConnect: false,
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 60_000,
    keepAliveIntervalMs: 30_000,
    generateHighQualityLinkPreview: true,
    cachedGroupMetadata: async (jid) => groupCache.get(jid),
    getMessage: async (key) => await yourStore.getMessage(key),
});

sock.ev.on('groups.update', async ([event]) => {
    const metadata = await sock.groupMetadata(event.id);
    groupCache.set(event.id, metadata);
});
```
</details>

---

## 💾 Authentication State Management

<details>
<summary>Multi-File Auth (Development)</summary>

```javascript
const { makeWASocket, useMultiFileAuthState } = import makeWASocket from 'toxic-baileys';

const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
const sock = makeWASocket({ auth: state });
sock.ev.on('creds.update', saveCreds);
```
</details>

<details>
<summary>Custom Database Auth (Production)</summary>

```javascript
const { makeWASocket, makeCacheableSignalKeyStore } = import makeWASocket from 'toxic-baileys';

const myAuthState = {
    creds: await db.getAuthCreds(),
    keys: makeCacheableSignalKeyStore(await db.getSignalKeys(), console)
};
const sock = makeWASocket({ auth: myAuthState });
sock.ev.on('creds.update', async (creds) => await db.saveAuthCreds(creds));
```
</details>

---

## 📤 Sending Messages

### Basic Messages

<details>
<summary>Text, Reply, Mention, Forward, Edit, Delete, React</summary>

```javascript
await sock.sendMessage(jid, { text: 'Hello World!' });
await sock.sendMessage(jid, { text: 'Reply!' }, { quoted: m });
await sock.sendMessage(jid, { text: 'Hi @user!', mentions: ['254712345678@s.whatsapp.net'] });
await sock.sendMessage(jid, { forward: m });

const sent = await sock.sendMessage(jid, { text: 'Original' });
await sock.sendMessage(jid, { text: 'Edited!', edit: sent.key });
await sock.sendMessage(jid, { delete: sent.key });

await sock.sendMessage(jid, { react: { text: '🔥', key: m.key } });
await sock.sendMessage(jid, { react: { text: '', key: m.key } }); // remove reaction
```
</details>

### Media Messages

<details>
<summary>Image, Video, Audio, Document, Sticker, View Once</summary>

```javascript
await sock.sendMessage(jid, { image: { url: './image.jpg' }, caption: 'Caption' });
await sock.sendMessage(jid, { image: fs.readFileSync('./img.jpg') });
await sock.sendMessage(jid, { video: { url: './video.mp4' }, caption: 'Video' });
await sock.sendMessage(jid, { video: { url: './animation.mp4' }, gifPlayback: true });
await sock.sendMessage(jid, { audio: { url: './voice.ogg' }, mimetype: 'audio/ogg; codecs=opus', ptt: true });
await sock.sendMessage(jid, { audio: { url: './song.mp3' }, mimetype: 'audio/mp4' });
await sock.sendMessage(jid, { document: { url: './file.pdf' }, fileName: 'MyDoc.pdf', mimetype: 'application/pdf' });
await sock.sendMessage(jid, { sticker: { url: './sticker.webp' } });
await sock.sendMessage(jid, { image: fs.readFileSync('./img.jpg'), viewOnce: true });
```
</details>

### Interactive Messages

<details>
<summary>Interactive Message with Native Flow Buttons</summary>

```javascript
// Copy button
await sock.sendMessage(jid, {
    interactiveMessage: {
        header: 'toxic-baileys™',
        title: 'Hello World',
        footer: 'By 𝐱𝐡_𝐜𝐥𝐢𝐧𝐭𝐨𝐧 ✓',
        buttons: [
            {
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({ display_text: 'Copy Code', id: '1', copy_code: 'TOXIC123' })
            }
        ]
    }
}, { quoted: m });

// URL button
await sock.sendMessage(jid, {
    interactiveMessage: {
        header: 'Visit Us',
        title: 'toxic-baileys',
        footer: 'GitHub',
        buttons: [
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({ display_text: 'Open GitHub', url: 'https://github.com/xhclintohn/Baileys' })
            }
        ]
    }
}, { quoted: m });

// With image thumbnail
await sock.sendMessage(jid, {
    interactiveMessage: {
        header: 'With Image',
        title: 'toxic-baileys™',
        footer: 'Best Baileys Fork',
        image: { url: 'https://example.com/image.jpg' },
        buttons: [
            { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: 'Copy', id: '1', copy_code: 'HELLO' }) }
        ]
    }
}, { quoted: m });

// Single select list
await sock.sendMessage(jid, {
    interactiveMessage: {
        header: 'Choose',
        title: 'Menu',
        footer: 'Select below',
        nativeFlowMessage: {
            buttons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: 'Options',
                        sections: [
                            {
                                title: 'Commands',
                                rows: [
                                    { title: 'Option 1', description: 'First', id: 'opt_1' },
                                    { title: 'Option 2', description: 'Second', id: 'opt_2' }
                                ]
                            }
                        ]
                    })
                }
            ]
        }
    }
}, { quoted: m });

// With externalAdReply
await sock.sendMessage(jid, {
    interactiveMessage: {
        header: 'Premium',
        title: 'toxic-baileys™',
        footer: 'By 𝐱𝐡_𝐜𝐥𝐢𝐧𝐭𝐨𝐧',
        externalAdReply: {
            title: 'toxic-baileys',
            body: 'Best WhatsApp Library',
            mediaType: 1,
            thumbnailUrl: 'https://example.com/thumb.jpg',
            sourceUrl: 'https://github.com/xhclintohn/Baileys',
            showAdAttribution: true,
            renderLargerThumbnail: true
        },
        buttons: [
            { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: 'Visit', url: 'https://github.com/xhclintohn/Baileys' }) }
        ]
    }
}, { quoted: m });

// Interactive with document
await sock.sendMessage(jid, {
    interactiveMessage: {
        header: 'Document',
        title: 'File',
        footer: 'toxic-baileys™',
        document: fs.readFileSync('./file.pdf'),
        mimetype: 'application/pdf',
        fileName: 'document.pdf',
        buttons: [
            { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: 'GitHub', url: 'https://github.com/xhclintohn/Baileys' }) }
        ]
    }
}, { quoted: m });
```
</details>

### Album Messages

<details>
<summary>Send multiple images/videos in a single album</summary>

```javascript
await sock.sendMessage(jid, {
    albumMessage: [
        { image: fs.readFileSync('./photo1.jpg'), caption: 'First photo' },
        { image: { url: 'https://example.com/photo2.jpg' }, caption: 'Second photo' },
        { video: fs.readFileSync('./clip.mp4'), caption: 'A video clip' }
    ]
}, { quoted: m });
```
</details>

### Event Messages

<details>
<summary>Send WhatsApp event invitations</summary>

```javascript
await sock.sendMessage(jid, {
    eventMessage: {
        isCanceled: false,
        name: 'toxic-baileys Launch',
        description: 'Join us for the launch!',
        location: { degreesLatitude: -1.2921, degreesLongitude: 36.8219, name: 'Nairobi, Kenya' },
        joinLink: 'https://call.whatsapp.com/video/your-link',
        startTime: String(Math.floor(Date.now() / 1000) + 3600),
        endTime: String(Math.floor(Date.now() / 1000) + 7200),
        extraGuestsAllowed: true
    }
}, { quoted: m });
```
</details>

### Poll & Poll Result Messages

<details>
<summary>Polls and displaying poll results</summary>

```javascript
// Create poll
await sock.sendMessage(jid, {
    poll: {
        name: 'Best WhatsApp library?',
        values: ['toxic-baileys', 'Baileys', 'Other'],
        selectableCount: 1
    }
});

// Display poll results
await sock.sendMessage(jid, {
    pollResultMessage: {
        name: 'Best Library Results',
        pollVotes: [
            { optionName: 'toxic-baileys', optionVoteCount: '42' },
            { optionName: 'Baileys', optionVoteCount: '10' },
            { optionName: 'Other', optionVoteCount: '2' }
        ]
    }
}, { quoted: m });
```
</details>

### Group Status Messages

<details>
<summary>Post status to a group</summary>

```javascript
await sock.sendMessage(groupJid, { groupStatusMessage: { text: 'Hello group! 👋' } });
await sock.sendMessage(groupJid, { groupStatusMessage: { image: fs.readFileSync('./banner.jpg'), caption: 'Update!' } });
await sock.sendMessage(groupJid, { groupStatusMessage: { video: fs.readFileSync('./promo.mp4'), caption: 'Promo' } });
await sock.sendMessage(groupJid, { groupStatusMessage: { audio: fs.readFileSync('./audio.mp4'), mimetype: 'audio/mp4' } });
```
</details>

### Payment Request Messages

<details>
<summary>Send payment requests</summary>

```javascript
await sock.sendMessage(jid, {
    requestPaymentMessage: {
        currency: 'KES',
        amount: 500000,
        from: m.sender,
        background: { id: 'DEFAULT', placeholderArgb: 0xFFF0F0F0 }
    }
}, { quoted: m });
```
</details>

### Product Messages

<details>
<summary>Send product catalog messages</summary>

```javascript
await sock.sendMessage(jid, {
    productMessage: {
        title: 'Premium Script',
        description: 'Best bot script available',
        thumbnail: { url: 'https://example.com/product.jpg' },
        productId: 'PROD001',
        retailerId: 'xhclinton',
        url: 'https://github.com/xhclintohn/Baileys',
        body: 'Full featured automation',
        footer: 'Special price',
        priceAmount1000: 10000,
        currencyCode: 'USD',
        buttons: [{ name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: 'Buy Now', url: 'https://github.com/xhclintohn/Baileys' }) }]
    }
}, { quoted: m });
```
</details>

### Button & Template Messages

<details>
<summary>Classic buttons, list messages, template buttons</summary>

```javascript
// Classic buttons
await sock.sendMessage(jid, {
    text: 'Choose:',
    footer: 'toxic-baileys™',
    buttons: [
        { buttonId: 'btn_1', buttonText: { displayText: 'Option 1' }, type: 1 },
        { buttonId: 'btn_2', buttonText: { displayText: 'Option 2' }, type: 1 }
    ],
    headerType: 1
});

// List message
await sock.sendMessage(jid, {
    text: 'Select an item:',
    footer: 'toxic-baileys™',
    title: 'Main Menu',
    buttonText: 'Open Menu',
    sections: [
        {
            title: 'Commands',
            rows: [
                { title: '!help', rowId: 'help', description: 'Show help' },
                { title: '!ping', rowId: 'ping', description: 'Check bot' }
            ]
        }
    ]
});

// Template buttons
await sock.sendMessage(jid, {
    text: 'Quick actions:',
    footer: 'toxic-baileys™',
    templateButtons: [
        { index: 1, urlButton: { displayText: '🌐 GitHub', url: 'https://github.com/xhclintohn/Baileys' } },
        { index: 2, callButton: { displayText: '📞 Call', phoneNumber: '+254712345678' } },
        { index: 3, quickReplyButton: { displayText: '✅ OK', id: 'ok_reply' } }
    ]
});
```
</details>

### Status Mention

<details>
<summary>Send status with mentions</summary>

```javascript
// Send status and mention specific contacts/groups
await sock.sendStatusMention(
    { text: 'Hello everyone! 👋', backgroundColor: '#FF5733' },
    ['254712345678@s.whatsapp.net', groupJid]
);

// Media status with mention
await sock.sendStatusMention(
    { image: fs.readFileSync('./banner.jpg'), caption: 'New update!' },
    ['254712345678@s.whatsapp.net']
);
```
</details>

---

## 📁 Chat & Message Management

<details>
<summary>Chat Operations</summary>

```javascript
await sock.chatModify({ archive: true }, jid);
await sock.chatModify({ archive: false }, jid);
await sock.chatModify({ mute: 8 * 60 * 60 * 1000 }, jid);
await sock.chatModify({ mute: null }, jid);
await sock.chatModify({ pin: true }, jid);
await sock.chatModify({ pin: false }, jid);
await sock.chatModify({ markRead: true }, jid);
await sock.chatModify({ markRead: false }, jid);
await sock.readMessages([m.key]);

const { downloadMediaMessage } = import makeWASocket from 'toxic-baileys';
const buffer = await downloadMediaMessage(m, 'buffer', {}, { logger: console });
fs.writeFileSync('./download.jpg', buffer);
```
</details>

---

## 👥 Group Management

<details>
<summary>Group Operations</summary>

```javascript
const group = await sock.groupCreate('My Group', ['254712345678@s.whatsapp.net']);
await sock.groupParticipantsUpdate(groupJid, ['254712345678@s.whatsapp.net'], 'add');
await sock.groupParticipantsUpdate(groupJid, ['254712345678@s.whatsapp.net'], 'remove');
await sock.groupParticipantsUpdate(groupJid, ['254712345678@s.whatsapp.net'], 'promote');
await sock.groupParticipantsUpdate(groupJid, ['254712345678@s.whatsapp.net'], 'demote');
await sock.groupUpdateSubject(groupJid, 'New Group Name');
await sock.groupUpdateDescription(groupJid, 'New description');
await sock.groupSettingUpdate(groupJid, 'announcement');
await sock.groupSettingUpdate(groupJid, 'not_announcement');
await sock.groupSettingUpdate(groupJid, 'locked');
await sock.groupSettingUpdate(groupJid, 'unlocked');

const code = await sock.groupInviteCode(groupJid);
await sock.groupAcceptInvite('INVITE_CODE');
const meta = await sock.groupMetadata(groupJid);
await sock.groupLeave(groupJid);
await sock.setLabelGroup(groupJid, 'VIP');
```
</details>

---

## 👤 User & Profile Management

<details>
<summary>Profile & Presence Operations</summary>

```javascript
const [result] = await sock.onWhatsApp('254712345678');
console.log(result.exists, result.jid);

const status = await sock.checkWhatsApp('254712345678@s.whatsapp.net');
console.log(status.isBanned, status.isNeedOfficialWa);

const ppUrl = await sock.profilePictureUrl(jid, 'image');
await sock.updateProfileName('My New Name');
await sock.updateProfileStatus('Powered by toxic-baileys™ 🚀');
await sock.updateProfilePicture(sock.user.id, fs.readFileSync('./avatar.jpg'));

sock.ev.on('presence.update', ({ id, presences }) => console.log(id, presences));
await sock.presenceSubscribe(jid);
const biz = await sock.getBusinessProfile(jid);
```
</details>

---

## 📡 Newsletter / Channel Management

<details>
<summary>Full Newsletter / Channel API</summary>

```javascript
// Get ID from URL (unique to toxic-baileys)
const info = await sock.newsletterId('https://whatsapp.com/channel/YOUR_CODE');
console.log(JSON.parse(info)); // { name, id }

// Get full metadata from URL
const meta = await sock.newsletterFromUrl('https://whatsapp.com/channel/YOUR_CODE');

// Full metadata by JID
const fullMeta = await sock.newsletterMetadata('jid', '120363427340708111@newsletter');

// Follow / unfollow / mute / unmute
await sock.newsletterFollow('120363427340708111@newsletter');
await sock.newsletterUnfollow('120363427340708111@newsletter');
await sock.newsletterMute('120363427340708111@newsletter');
await sock.newsletterUnmute('120363427340708111@newsletter');

// Create a newsletter
const channel = await sock.newsletterCreate('My Channel', 'Description', 'ALL');

// Update
await sock.newsletterUpdateName('120363427340708111@newsletter', 'New Name');
await sock.newsletterUpdateDescription('120363427340708111@newsletter', 'New description');
await sock.newsletterUpdatePicture('120363427340708111@newsletter', fs.readFileSync('./pic.jpg'));
await sock.newsletterRemovePicture('120363427340708111@newsletter');

// React to a newsletter message
await sock.newsletterReactMessage('120363427340708111@newsletter', serverMessageId, '🔥');

// Fetch messages
const msgs = await sock.newsletterFetchMessages('jid', '120363427340708111@newsletter', 10);

// Get all subscribed newsletters
const subscribed = await sock.newsletterFetchAllSubscribe();

// Subscribe to live updates
await sock.subscribeNewsletterUpdates('120363427340708111@newsletter');

// Delete newsletter
await sock.newsletterDelete('120363427340708111@newsletter');
```
</details>

---

## 🔒 Privacy & Block Management

<details>
<summary>Privacy Settings & Block List</summary>

```javascript
await sock.updateLastSeenPrivacy('contacts');       // 'all' | 'contacts' | 'contact_blacklist' | 'none'
await sock.updateOnlinePrivacy('match_last_seen');
await sock.updateProfilePicturePrivacy('contacts');
await sock.updateStatusPrivacy('contacts');
await sock.updateReadReceiptsPrivacy('all');        // 'all' | 'none'
await sock.updateGroupsAddPrivacy('contacts');

const privacy = await sock.fetchPrivacySettings(true);
await sock.updateBlockStatus(jid, 'block');
await sock.updateBlockStatus(jid, 'unblock');
const blocked = await sock.fetchBlocklist();
```
</details>

---

## 🗄️ Data Store Implementation

<details>
<summary>In-Memory Store (Development)</summary>

```javascript
const { makeInMemoryStore } = import makeWASocket from 'toxic-baileys';

const store = makeInMemoryStore({ logger: console });
store.readFromFile('./baileys_store.json');
setInterval(() => store.writeToFile('./baileys_store.json'), 10_000);

const sock = makeWASocket({});
store.bind(sock.ev);
```
</details>

<details>
<summary>Using toxicHandler Directly</summary>

```javascript
// toxicHandler is exposed on the socket for advanced usage
const { toxicHandler } = sock;

const paymentContent = await toxicHandler.handlePayment(content, quoted);
const interactiveContent = await toxicHandler.handleInteractive(content, jid, quoted);
const albumResult = await toxicHandler.handleAlbum(content, jid, quoted);
const eventResult = await toxicHandler.handleEvent(content, jid, quoted);
const pollResult = await toxicHandler.handlePollResult(content, jid, quoted);
const storyResult = await toxicHandler.handleGroupStory(content, jid, quoted);
```
</details>

---

## 🛠️ Utility Functions

<details>
<summary>Core Utilities</summary>

```javascript
const {
    getContentType, areJidsSameUser, isJidGroup, isJidBroadcast,
    isJidStatusBroadcast, isJidNewsLetter, jidNormalizedUser,
    generateMessageID, generateMessageIDV2, generateWAMessage,
    generateWAMessageContent, generateWAMessageFromContent,
    downloadContentFromMessage, getAggregateVotesInPollMessage,
    extractMessageContent, normalizeMessageContent, proto
} = import makeWASocket from 'toxic-baileys';

const type = getContentType(m.message);
console.log(isJidGroup('123@g.us'));        // true
console.log(isJidNewsLetter('123@newsletter')); // true

const votes = getAggregateVotesInPollMessage(
    { message: pollMsg.message, pollUpdates },
    sock.user.id
);

const stream = await downloadContentFromMessage(m.message.imageMessage, 'image');
const chunks = [];
for await (const chunk of stream) chunks.push(chunk);
const buffer = Buffer.concat(chunks);
```
</details>

---

## 💡 Best Practices & Tips

### Connection Stability
1. Always implement reconnect logic on `connection === 'close'`
2. Cache group metadata using `cachedGroupMetadata`
3. Use `markOnlineOnConnect: false` to still receive phone notifications
4. Set `syncFullHistory: true` for complete history

### Performance
1. Use `@cacheable/node-cache` for group metadata caching
2. Implement a message queue with rate limiting for bulk sends
3. Use databases instead of in-memory store for production

<details>
<summary>Auto-reconnect pattern</summary>

```javascript
async function connectWithRetry(maxRetries = 10) {
    let attempt = 0;
    const connect = async () => {
        attempt++;
        try {
            const { state, saveCreds } = await useMultiFileAuthState('./auth');
            const sock = makeWASocket({ auth: state });
            sock.ev.on('creds.update', saveCreds);
            sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
                if (connection === 'close') {
                    const code = lastDisconnect?.error?.output?.statusCode;
                    if (code === DisconnectReason.loggedOut) return;
                    const delay = Math.min(5000 * attempt, 60000);
                    if (attempt < maxRetries) setTimeout(connect, delay);
                } else if (connection === 'open') {
                    attempt = 0;
                }
            });
        } catch (err) {
            if (attempt < maxRetries) setTimeout(connect, 5000 * attempt);
        }
    };
    await connect();
}
```
</details>

<details>
<summary>Message queue with rate limiting</summary>

```javascript
class MessageQueue {
    constructor(sock, delayMs = 1000) {
        this.sock = sock;
        this.queue = [];
        this.processing = false;
        this.delayMs = delayMs;
    }
    async add(jid, content, options = {}) {
        this.queue.push({ jid, content, options });
        if (!this.processing) this._process();
    }
    async _process() {
        this.processing = true;
        while (this.queue.length > 0) {
            const { jid, content, options } = this.queue.shift();
            try {
                await this.sock.sendMessage(jid, content, options);
                await new Promise(r => setTimeout(r, this.delayMs));
            } catch (err) {
                console.error('Send failed:', err.message);
            }
        }
        this.processing = false;
    }
}

const queue = new MessageQueue(sock, 1500);
await queue.add(jid, { text: 'Message 1' });
await queue.add(jid, { text: 'Message 2' });
```
</details>

---

## ⚠️ Important Legal Notice

This project is **NOT** affiliated with, authorized, maintained, sponsored, or endorsed by WhatsApp LLC or any of its affiliates.

- Only message users who have explicitly consented
- Do NOT use for spamming, bulk unsolicited messaging, or harassment
- Respect WhatsApp's Terms of Service and rate limits
- The maintainer assumes NO liability for misuse or damages

---

## 🆘 Getting Help

1. **GitHub Issues** — [github.com/xhclintohn/Baileys/issues](https://github.com/xhclintohn/Baileys/issues)
2. **WhatsApp** — +254114885159
3. **Response Time** — Typically within 24–48 hours

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.

**Credits:** Original Baileys by [WhiskeySockets](https://github.com/WhiskeySockets/Baileys) · toxic-baileys enhancements by **𝐱𝐡_𝐜𝐥𝐢𝐧𝐭𝐨𝐧 ✓**

---

<div align="center">

🌟 **toxic-baileys™** — Crafted with ❤️ by **𝐱𝐡_𝐜𝐥𝐢𝐧𝐭𝐨𝐧 ✓**

*The most powerful WhatsApp automation toolkit*

⭐ Star the repository if this helped you!

</div>
