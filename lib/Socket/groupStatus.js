import crypto from 'crypto';
import { proto } from '../../WAProto/index.js';
import { delay, generateMessageID, generateWAMessage, generateWAMessageContent, generateWAMessageFromContent, prepareWAMessageMedia } from '../Utils/index.js';
import { isJidGroup, isPnUser, jidNormalizedUser, STORIES_JID } from '../WABinary/index.js';
export class ToxicHandler {
    constructor(utils, waUploadToServer, relayMessageFn, config, sock) {
        this.utils = utils;
        this.relayMessage = relayMessageFn;
        this.waUploadToServer = waUploadToServer;
        this.config = config;
        this.sock = sock;
    }
    detectType(content) {
        if (content.requestPaymentMessage)
            return 'PAYMENT';
        if (content.productMessage)
            return 'PRODUCT';
        if (content.interactiveMessage)
            return 'INTERACTIVE';
        if (content.albumMessage)
            return 'ALBUM';
        if (content.eventMessage)
            return 'EVENT';
        if (content.pollResultMessage)
            return 'POLL_RESULT';
        if (content.groupStatusMessage)
            return 'GROUP_STORY';
        return null;
    }
    async handlePayment(content, quoted) {
        const data = content.requestPaymentMessage;
        let notes = {};
        if (data.sticker?.stickerMessage) {
            notes = {
                stickerMessage: {
                    ...data.sticker.stickerMessage,
                    contextInfo: {
                        stanzaId: quoted?.key?.id,
                        participant: quoted?.key?.participant || content.sender,
                        quotedMessage: quoted?.message
                    }
                }
            };
        }
        else if (data.note) {
            notes = {
                extendedTextMessage: {
                    text: data.note,
                    contextInfo: {
                        stanzaId: quoted?.key?.id,
                        participant: quoted?.key?.participant || content.sender,
                        quotedMessage: quoted?.message
                    }
                }
            };
        }
        return {
            requestPaymentMessage: proto.Message.RequestPaymentMessage.fromObject({
                expiryTimestamp: data.expiry || 0,
                amount1000: data.amount || 0,
                currencyCodeIso4217: data.currency || 'IDR',
                requestFrom: data.from || '0@s.whatsapp.net',
                noteMessage: notes,
                background: data.background ?? {
                    id: 'DEFAULT',
                    placeholderArgb: 0xfff0f0f0
                }
            })
        };
    }
    async handleProduct(content, jid, quoted) {
        const { title, description, thumbnail, productId, retailerId, url, body = '', footer = '', buttons = [], priceAmount1000 = null, currencyCode = 'IDR' } = content.productMessage;
        let productImage;
        if (Buffer.isBuffer(thumbnail)) {
            const result = await prepareWAMessageMedia({ image: thumbnail }, { upload: this.waUploadToServer });
            productImage = result.imageMessage ?? undefined;
        }
        else if (typeof thumbnail === 'object' && thumbnail?.url) {
            const result = await prepareWAMessageMedia({ image: { url: thumbnail.url } }, { upload: this.waUploadToServer });
            productImage = result.imageMessage ?? undefined;
        }
        return {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { text: body },
                        footer: { text: footer },
                        header: {
                            title,
                            hasMediaAttachment: true,
                            productMessage: {
                                product: {
                                    productImage,
                                    productId,
                                    title,
                                    description,
                                    currencyCode,
                                    priceAmount1000,
                                    retailerId,
                                    url,
                                    productImageCount: 1
                                },
                                businessOwnerJid: '0@s.whatsapp.net'
                            }
                        },
                        nativeFlowMessage: { buttons }
                    }
                }
            }
        };
    }
    async handleInteractive(content, jid, quoted) {
        const { title, body, footer, thumbnail, image, video, document: docFile, mimetype, fileName, jpegThumbnail, contextInfo, externalAdReply, buttons = [], nativeFlowMessage, header } = content.interactiveMessage;
        const bodyText = typeof body === 'object' && body?.text ? body.text : (typeof body === 'string' ? body : (title || ''));
        const footerText = typeof footer === 'object' && footer?.text ? footer.text : (typeof footer === 'string' ? footer : '');
        const resolvedButtons = buttons?.length > 0 ? buttons : (nativeFlowMessage?.buttons || []);
        let media = null;
        let mediaType = null;
        if (thumbnail) {
            media = await prepareWAMessageMedia({ image: { url: thumbnail } }, { upload: this.waUploadToServer });
            mediaType = 'image';
        }
        else if (image) {
            media = await prepareWAMessageMedia(typeof image === 'object' && image?.url ? { image: { url: image.url } } : { image }, { upload: this.waUploadToServer });
            mediaType = 'image';
        }
        else if (video) {
            media = await prepareWAMessageMedia(typeof video === 'object' && video?.url ? { video: { url: video.url } } : { video }, { upload: this.waUploadToServer });
            mediaType = 'video';
        }
        else if (docFile) {
            const documentPayload = { document: docFile };
            if (jpegThumbnail) {
                documentPayload.jpegThumbnail = typeof jpegThumbnail === 'object' && jpegThumbnail?.url
                    ? { url: jpegThumbnail.url }
                    : jpegThumbnail;
            }
            media = await prepareWAMessageMedia(documentPayload, { upload: this.waUploadToServer });
            if (fileName && media?.documentMessage)
                media.documentMessage.fileName = fileName;
            if (mimetype && media?.documentMessage)
                media.documentMessage.mimetype = mimetype;
            mediaType = 'document';
        }
        const interactiveMessage = {
            body: { text: bodyText },
            footer: { text: footerText }
        };
        if (resolvedButtons?.length > 0) {
            interactiveMessage.nativeFlowMessage = {
                ...(nativeFlowMessage || {}),
                buttons: resolvedButtons
            };
        }
        else if (nativeFlowMessage) {
            interactiveMessage.nativeFlowMessage = nativeFlowMessage;
        }
        if (media) {
            interactiveMessage.header = {
                title: header || '',
                hasMediaAttachment: true,
                ...media
            };
        }
        else {
            interactiveMessage.header = {
                title: header || '',
                hasMediaAttachment: false
            };
        }
        const finalContextInfo = {};
        if (contextInfo) {
            Object.assign(finalContextInfo, {
                mentionedJid: contextInfo.mentionedJid || [],
                forwardingScore: contextInfo.forwardingScore || 0,
                isForwarded: contextInfo.isForwarded || false,
                ...contextInfo
            });
        }
        if (externalAdReply) {
            finalContextInfo.externalAdReply = {
                title: externalAdReply.title || '',
                body: externalAdReply.body || '',
                mediaType: externalAdReply.mediaType || 1,
                thumbnailUrl: externalAdReply.thumbnailUrl || '',
                mediaUrl: externalAdReply.mediaUrl || '',
                sourceUrl: externalAdReply.sourceUrl || '',
                showAdAttribution: externalAdReply.showAdAttribution || false,
                renderLargerThumbnail: externalAdReply.renderLargerThumbnail || false,
                ...externalAdReply
            };
        }
        if (Object.keys(finalContextInfo).length > 0) {
            interactiveMessage.contextInfo = finalContextInfo;
        }
        return { interactiveMessage };
    }
    async handleAlbum(content, jid, quoted) {
        const array = content.albumMessage;
        const album = await generateWAMessageFromContent(jid, {
            messageContextInfo: {
                messageSecret: crypto.randomBytes(32)
            },
            albumMessage: {
                expectedImageCount: array.filter(a => 'image' in a).length,
                expectedVideoCount: array.filter(a => 'video' in a).length
            }
        }, {
            userJid: generateMessageID().split('@')[0] + '@s.whatsapp.net',
            quoted,
            upload: this.waUploadToServer
        });
        await this.relayMessage(jid, album.message, { messageId: album.key.id });
        for (const item of array) {
            const img = await generateWAMessage(jid, item, {
                upload: this.waUploadToServer
            });
            img.message.messageContextInfo = {
                messageSecret: crypto.randomBytes(32),
                messageAssociation: {
                    associationType: 1,
                    parentMessageKey: album.key
                },
                participant: '0@s.whatsapp.net',
                remoteJid: 'status@broadcast',
                forwardingScore: 99999,
                isForwarded: true,
                mentionedJid: [jid],
                starred: true,
                isHighlighted: true,
                businessMessageForwardInfo: { businessOwnerJid: jid },
                dataSharingContext: { showMmDisclosure: true }
            };
            await this.relayMessage(jid, img.message, {
                messageId: img.key.id,
                quoted: {
                    key: {
                        remoteJid: album.key.remoteJid,
                        id: album.key.id,
                        fromMe: true,
                        participant: generateMessageID().split('@')[0] + '@s.whatsapp.net'
                    },
                    message: album.message
                }
            });
        }
        return album;
    }
    async handleEvent(content, jid, quoted) {
        const eventData = content.eventMessage;
        const msg = await generateWAMessageFromContent(jid, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2,
                        messageSecret: crypto.randomBytes(32),
                        supportPayload: JSON.stringify({
                            version: 2,
                            is_ai_message: true,
                            should_show_system_message: true,
                            ticket_id: crypto.randomBytes(16).toString('hex')
                        })
                    },
                    eventMessage: {
                        contextInfo: {
                            mentionedJid: [jid],
                            participant: jid,
                            remoteJid: 'status@broadcast'
                        },
                        isCanceled: eventData.isCanceled || false,
                        name: eventData.name,
                        description: eventData.description,
                        location: eventData.location || {
                            degreesLatitude: 0,
                            degreesLongitude: 0,
                            name: 'Location'
                        },
                        joinLink: eventData.joinLink || '',
                        startTime: typeof eventData.startTime === 'string'
                            ? parseInt(eventData.startTime)
                            : eventData.startTime || Date.now(),
                        endTime: typeof eventData.endTime === 'string'
                            ? parseInt(eventData.endTime)
                            : eventData.endTime || Date.now() + 3600000,
                        extraGuestsAllowed: eventData.extraGuestsAllowed !== false
                    }
                }
            }
        }, { quoted });
        await this.relayMessage(jid, msg.message, { messageId: msg.key.id });
        return msg;
    }
    async handlePollResult(content, jid, quoted) {
        const pollData = content.pollResultMessage;
        const msg = await generateWAMessageFromContent(jid, {
            pollResultSnapshotMessage: {
                name: pollData.name,
                pollVotes: pollData.pollVotes.map((vote) => ({
                    optionName: vote.optionName,
                    optionVoteCount: typeof vote.optionVoteCount === 'number'
                        ? vote.optionVoteCount.toString()
                        : vote.optionVoteCount
                }))
            }
        }, {
            userJid: generateMessageID().split('@')[0] + '@s.whatsapp.net',
            quoted
        });
        await this.relayMessage(jid, msg.message, { messageId: msg.key.id });
        return msg;
    }
    async handleGroupStory(content, jid, quoted) {
        const storyData = content.groupStatusMessage;
        let waMsgContent;
        if (storyData.message) {
            waMsgContent = storyData;
        }
        else {
            const generated = await generateWAMessageContent(storyData, {
                upload: this.waUploadToServer
            });
            waMsgContent = generated;
        }
        const msgPayload = {
            groupStatusMessageV2: {
                message: waMsgContent.message || waMsgContent
            }
        };
        return this.relayMessage(jid, msgPayload, { messageId: generateMessageID() });
    }
    async sendStatusWhatsApp(content, jids = []) {
        const userJid = jidNormalizedUser(this.sock.authState.creds.me.id);
        const allUsers = new Set([userJid]);
        for (const id of jids) {
            if (isJidGroup(id)) {
                try {
                    const metadata = await this.sock.groupMetadata(id);
                    for (const p of metadata.participants) {
                        allUsers.add(jidNormalizedUser(p.id));
                    }
                }
                catch (error) {
                    this.config.logger.error(`Error getting metadata for group ${id}: ${error}`);
                }
            }
            else if (isPnUser(id)) {
                allUsers.add(jidNormalizedUser(id));
            }
        }
        const uniqueUsers = Array.from(allUsers);
        const getRandomHexColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        const isMedia = content.image || content.video || content.audio;
        const isAudio = !!content.audio;
        const messageContent = { ...content };
        if (isMedia && !isAudio) {
            if (messageContent.text) {
                messageContent.caption = messageContent.text;
                delete messageContent.text;
            }
            delete messageContent.ptt;
            delete messageContent.font;
            delete messageContent.backgroundColor;
            delete messageContent.textColor;
        }
        if (isAudio) {
            delete messageContent.text;
            delete messageContent.caption;
            delete messageContent.font;
            delete messageContent.textColor;
        }
        const font = !isMedia ? (content.font ?? Math.floor(Math.random() * 9)) : undefined;
        const textColor = !isMedia ? (content.textColor ?? getRandomHexColor()) : undefined;
        const backgroundColor = !isMedia || isAudio ? (content.backgroundColor ?? getRandomHexColor()) : undefined;
        const ptt = isAudio ? (typeof content.ptt === 'boolean' ? content.ptt : true) : undefined;
        const { getUrlInfo } = await import('../Utils/link-preview.js');
        const msg = await generateWAMessage(STORIES_JID, messageContent, {
            logger: this.config.logger,
            userJid,
            getUrlInfo: (text) => getUrlInfo(text, {
                thumbnailWidth: this.config.linkPreviewImageThumbnailWidth,
                fetchOpts: { timeout: 3000, ...(this.config.options || {}) },
                logger: this.config.logger,
                uploadImage: this.config.generateHighQualityLinkPreview ? this.waUploadToServer : undefined
            }),
            upload: this.waUploadToServer,
            mediaCache: this.config.mediaCache,
            options: this.config.options,
            font,
            textColor,
            backgroundColor,
            ptt
        });
        await this.relayMessage(STORIES_JID, msg.message, {
            messageId: msg.key.id,
            statusJidList: uniqueUsers,
            additionalNodes: [
                {
                    tag: 'meta',
                    attrs: {},
                    content: [
                        {
                            tag: 'mentioned_users',
                            attrs: {},
                            content: jids.map(id => ({
                                tag: 'to',
                                attrs: { jid: jidNormalizedUser(id) }
                            }))
                        }
                    ]
                }
            ]
        });
        for (const id of jids) {
            try {
                const normalizedId = jidNormalizedUser(id);
                const isPrivate = isPnUser(normalizedId);
                const type = isPrivate ? 'statusMentionMessage' : 'groupStatusMentionMessage';
                const protocolMessage = {
                    [type]: {
                        message: {
                            protocolMessage: {
                                key: msg.key,
                                type: 25
                            }
                        }
                    },
                    messageContextInfo: {
                        messageSecret: crypto.randomBytes(32)
                    }
                };
                const statusMsg = await generateWAMessageFromContent(normalizedId, protocolMessage, {});
                await this.relayMessage(normalizedId, statusMsg.message, {
                    additionalNodes: [
                        {
                            tag: 'meta',
                            attrs: isPrivate ? { is_status_mention: 'true' } : { is_group_status_mention: 'true' }
                        }
                    ]
                });
                await delay(2000);
            }
            catch (error) {
                this.config.logger.error(`Error sending to ${id}: ${error}`);
            }
        }
        return msg;
    }
}
//# sourceMappingURL=groupStatus.js.map