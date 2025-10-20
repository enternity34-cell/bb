"use strict";  
var __importDefault = (this && this.__importDefault) || function (mod) {  
    return (mod && mod.__esModule) ? mod : { "default": mod };  
};   
Object.defineProperty(exports, "__esModule", { value: true });  
exports.makeMessagesSocket = void 0;  
const boom_1 = require("@hapi/boom");  
const node_cache_1 = __importDefault(require("node-cache"));  
const WAProto_1 = require("../../WAProto");  
const Defaults_1 = require("../Defaults");  
const axios_1 = require("axios")  
const Utils_1 = require("../Utils");  
const link_preview_1 = require("../Utils/link-preview");  
const WABinary_1 = require("../WABinary");  
const newsletter_1 = require("./newsletter");  
const crypto = require('crypto');  

var ListType = WAProto_1.proto.Message.ListMessage.ListType;  
const makeMessagesSocket = (config) => {  
    const {  
        logger,  
        linkPreviewImageThumbnailWidth,   
        generateHighQualityLinkPreview,  
        options: axiosOptions,  
        patchMessageBeforeSending  
    } = config;  
    const sock = (0, newsletter_1.makeNewsletterSocket)(config);  
    const {  
        ev,   
        authState,   
        processingMutex,   
        signalRepository,   
        upsertMessage,  
        query,  
        fetchPrivacySettings,  
        generateMessageTag,  
        sendNode,   
        groupMetadata,  
        groupToggleEphemeral  
    } = sock;  
    const userDevicesCache = config.userDevicesCache || new node_cache_1.default({  
        stdTTL: Defaults_1.DEFAULT_CACHE_TTLS.USER_DEVICES,  
        useClones: false  
    });  
    let mediaConn;  
    const refreshMediaConn = async (forceGet = false) => {  
        const media = await mediaConn;  
        if (!media || forceGet || (new Date().getTime() - media.fetchDate.getTime()) > media.ttl * 1000) {  
            mediaConn = (async () => {  
                const result = await query({  
                    tag: 'iq',  
                    attrs: {  
                        type: 'set',  
                        xmlns: 'w:m',  
                        to: WABinary_1.S_WHATSAPP_NET,  
                    },  
                    content: [{ tag: 'media_conn', attrs: {} }]  
                });  
                const mediaConnNode = (0, WABinary_1.getBinaryNodeChild)(result, 'media_conn');  
                const node = {  
                    hosts: (0, WABinary_1.getBinaryNodeChildren)(mediaConnNode, 'host').map(({ attrs }) => ({  
                        hostname: attrs.hostname,  
                        maxContentLengthBytes: +attrs.maxContentLengthBytes,  
                    })),  
                    auth: mediaConnNode.attrs.auth,  
                    ttl: +mediaConnNode.attrs.ttl,  
                    fetchDate: new Date()  
                };  
                logger.debug('fetched media conn');  
                return node;  
            })();  
        }  
        return mediaConn;  
    };  
    const sendReceipt = async (jid, participant, messageIds, type) => {  
        const node = {  
            tag: 'receipt',  
            attrs: {  
                id: messageIds[0],  
            },  
        };  
        const isReadReceipt = type === 'read' || type === 'read-self';  
        if (isReadReceipt) {  
            node.attrs.t = (0, Utils_1.unixTimestampSeconds)().toString();  
        }  
        if (type === 'sender' && (0, WABinary_1.isJidUser)(jid)) {  
            node.attrs.recipient = jid;  
            node.attrs.to = participant;  
        }  
        else {  
            node.attrs.to = jid;  
            if (participant) {  
                node.attrs.participant = participant;  
            }  
        }  
        if (type) {  
            node.attrs.type = (0, WABinary_1.isJidNewsLetter)(jid) ? 'read-self' : type;  
        }  
        const remainingMessageIds = messageIds.slice(1);  
        if (remainingMessageIds.length) {  
            node.content = [  
                {  
                    tag: 'list',  
                    attrs: {},  
                    content: remainingMessageIds.map(id => ({  
                        tag: 'item',  
                        attrs: { id }  
                    }))  
                }  
            ];  
        }  
        logger.debug({ attrs: node.attrs, messageIds }, 'sending receipt for messages');  
        await sendNode(node);  
    };  
    const sendReceipts = async (keys, type) => {  
        const recps = (0, Utils_1.aggregateMessageKeysNotFromMe)(keys);  
        for (const { jid, participant, messageIds } of recps) {  
            await sendReceipt(jid, participant, messageIds, type);  
        }  
    };  
    const readMessages = async (keys) => {  
        const privacySettings = await fetchPrivacySettings();  
        const readType = privacySettings.readreceipts === 'all' ? 'read' : 'read-self';  
        await sendReceipts(keys, readType);  
    };  
    const getUSyncDevices = async (jids, useCache, ignoreZeroDevices) => {  
        var _a;  
        const deviceResults = [];  
        if (!useCache) {  
            logger.debug('not using cache for devices');  
        }  
        const users = [];  
        jids = Array.from(new Set(jids));  
        for (let jid of jids) {  
            const user = (_a = (0, WABinary_1.jidDecode)(jid)) === null || _a === void 0 ? void 0 : _a.user;  
            jid = (0, WABinary_1.jidNormalizedUser)(jid);  
            const devices = userDevicesCache.get(user);  
            if (devices && useCache) {  
                deviceResults.push(...devices);  
                logger.trace({ user }, 'using cache for devices');  
            }  
            else {  
                users.push({ tag: 'user', attrs: { jid } });  
            }  
        }  
        if (!users.length) {  
            return deviceResults;  
        }  
        const iq = {  
            tag: 'iq',  
            attrs: {  
                to: WABinary_1.S_WHATSAPP_NET,  
                type: 'get',  
                xmlns: 'usync',  
            },  
            content: [  
                {  
                    tag: 'usync',  
                    attrs: {  
                        sid: generateMessageTag(),  
                        mode: 'query',  
                        last: 'true',  
                        index: '0',  
                        context: 'message',  
                    },  
                    content: [  
                        {  
                            tag: 'query',  
                            attrs: {},  
                            content: [  
                                {  
                                    tag: 'devices',  
                                    attrs: { version: '2' }  
                                }  
                            ]  
                        },  
                        { tag: 'list', attrs: {}, content: users }  
                    ]  
                },  
            ],  
        };  
        const result = await query(iq);  
        const extracted = (0, Utils_1.extractDeviceJids)(result, authState.creds.me.id, ignoreZeroDevices);  
        const deviceMap = {};  
        for (const item of extracted) {  
            deviceMap[item.user] = deviceMap[item.user] || [];  
            deviceMap[item.user].push(item);  
            deviceResults.push(item);  
        }  
        for (const key in deviceMap) {  
            userDevicesCache.set(key, deviceMap[key]);  
        }  
        return deviceResults;  
    };  
    const assertSessions = async (jids, force) => {  
        let didFetchNewSession = false;  
        let jidsRequiringFetch = [];  
        if (force) {  
            jidsRequiringFetch = jids;  
        }  
        else {  
            const addrs = jids.map(jid => (signalRepository  
                .jidToSignalProtocolAddress(jid)));  
            const sessions = await authState.keys.get('session', addrs);  
            for (const jid of jids) {  
                const signalId = signalRepository  
                    .jidToSignalProtocolAddress(jid);  
                if (!sessions[signalId]) {  
                    jidsRequiringFetch.push(jid);  
                }  
            }  
        }  
        if (jidsRequiringFetch.length) {  
            logger.debug({ jidsRequiringFetch }, 'fetching sessions');  
            const result = await query({  
                tag: 'iq',  
                attrs: {  
                    xmlns: 'encrypt',  
                    type: 'get',  
                    to: WABinary_1.S_WHATSAPP_NET,  
                },  
                content: [  
                    {  
                        tag: 'key',  
                        attrs: {},  
                        content: jidsRequiringFetch.map(jid => ({  
                            tag: 'user',  
                            attrs: { jid },  
                        }))  
                    }  
                ]  
            });  
            await (0, Utils_1.parseAndInjectE2ESessions)(result, signalRepository);  
            didFetchNewSession = true;  
        }  
        return didFetchNewSession;  
    };  
    const createParticipantNodes = async (jids, message, extraAttrs) => {  
        const patched = await patchMessageBeforeSending(message, jids);  
        const bytes = (0, Utils_1.encodeWAMessage)(patched);  
        let shouldIncludeDeviceIdentity = false;  
        const nodes = await Promise.all(jids.map(async (jid) => {  
            const { type, ciphertext } = await signalRepository  
                .encryptMessage({ jid, data: bytes });  
            if (type === 'pkmsg') {  
                shouldIncludeDeviceIdentity = true;  
            }  
            const node = {  
                tag: 'to',  
                attrs: { jid },  
                content: [{  
                        tag: 'enc',  
                        attrs: {  
                            v: '2',  
                            type,  
                            ...extraAttrs || {}  
                        },  
                        content: ciphertext  
                    }]  
            };  
            return node;  
        }));  
        return { nodes, shouldIncludeDeviceIdentity };  
    };  
    const relayMessage = async (jid, message, { messageId: msgId, participant, additionalAttributes, additionalNodes, useUserDevicesCache, cachedGroupMetadata, statusJidList, AI = true }) => {  
        const meId = authState.creds.me.id;  
        let shouldIncludeDeviceIdentity = false;  
        let didPushAdditional = false  
        const { user, server } = (0, WABinary_1.jidDecode)(jid);  
        const statusJid = 'status@broadcast';  
        const isGroup = server === 'g.us';  
        const isStatus = jid === statusJid;  
        const isLid = server === 'lid';  
        const isPrivate = server === 's.whatsapp.net'  
        const isNewsletter = server === 'newsletter';  
        msgId = msgId || (0, Utils_1.generateMessageID)();  
        useUserDevicesCache = useUserDevicesCache !== false;  
        const participants = [];  
        const destinationJid = (!isStatus) ? (0, WABinary_1.jidEncode)(user, isLid ? 'lid' : isGroup ? 'g.us' : isNewsletter ? 'newsletter' : 's.whatsapp.net') : statusJid;  
        const binaryNodeContent = [];  
        const devices = [];  
        const meMsg = {  
            deviceSentMessage: {  
                destinationJid,  
                message  
            }  
        };  
        if (participant) {  
            if (!isGroup && !isStatus) {  
                additionalAttributes = { ...additionalAttributes, 'device_fanout': 'false' };  
            }  
            const { user, device } = (0, WABinary_1.jidDecode)(participant.jid);  
            devices.push({ user, device });  
        }  
        await authState.keys.transaction(async () => {  
            var _a, _b, _c, _d, _e, _f;  
            const mediaType = getMediaType(message);  
            if (isGroup || isStatus) {  
                const [groupData, senderKeyMap] = await Promise.all([  
                    (async () => {  
                        let groupData = cachedGroupMetadata ? await cachedGroupMetadata(jid) : undefined;  
                        if (groupData) {  
                            logger.trace({ jid, participants: groupData.participants.length }, 'using cached group metadata');  
                        }  
                        if (!groupData && !isStatus) {  
                            groupData = await groupMetadata(jid);  
                        }  
                        return groupData;  
                    })(),  
                    (async () => {  
                        if (!participant && !isStatus) {  
                            const result = await authState.keys.get('sender-key-memory', [jid]);  
                            return result[jid] || {};  
                        }  
                        return {};  
                    })()  
                ]);  
                if (!participant) {  
                    const participantsList = (groupData && !isStatus) ? groupData.participants.map(p => p.id) : [];  
                    if (isStatus && statusJidList) {  
                        participantsList.push(...statusJidList);  
                    }  
                    const additionalDevices = await getUSyncDevices(participantsList, !!useUserDevicesCache, false);  
                    devices.push(...additionalDevices);  
                }  
                const patched = await patchMessageBeforeSending(message, devices.map(d => (0, WABinary_1.jidEncode)(d.user, isLid ? 'lid' : 's.whatsapp.net', d.device)));  
                const bytes = (0, Utils_1.encodeWAMessage)(patched);  
                const { ciphertext, senderKeyDistributionMessage } = await signalRepository.encryptGroupMessage({  
                    group: destinationJid,  
                    data: bytes,  
                    meId,  
                });  
                const senderKeyJids = [];  
                for (const { user, device } of devices) {  
                    const jid = (0, WABinary_1.jidEncode)(user, (groupData === null || groupData === void 0 ? void 0 : groupData.addressingMode) === 'lid' ? 'lid' : 's.whatsapp.net', device);  
                    if (!senderKeyMap[jid] || !!participant) {  
                        senderKeyJids.push(jid);  
                        senderKeyMap[jid] = true;  
                    }  
                }  
                if (senderKeyJids.length) {  
                    logger.debug({ senderKeyJids }, 'sending new sender key');  
                    const senderKeyMsg = {  
                        senderKeyDistributionMessage: {  
                            axolotlSenderKeyDistributionMessage: senderKeyDistributionMessage,  
                            groupId: destinationJid  
                        }  
                    };  
                    await assertSessions(senderKeyJids, false);  
                    const result = await createParticipantNodes(senderKeyJids, senderKeyMsg, mediaType ? { mediatype: mediaType } : undefined);  
                    shouldIncludeDeviceIdentity = shouldIncludeDeviceIdentity || result.shouldIncludeDeviceIdentity;  
                    participants.push(...result.nodes);  
                }  
                binaryNodeContent.push({  
                    tag: 'enc',  
                    attrs: { v: '2', type: 'skmsg' },  
                    content: ciphertext  
                });  
                await authState.keys.set({ 'sender-key-memory': { [jid]: senderKeyMap } });  
            }  
            else if (isNewsletter) {  
                if ((_a = message.protocolMessage) === null || _a === void 0 ? void 0 : _a.editedMessage) {  
                    msgId = (_b = message.protocolMessage.key) === null || _b === void 0 ? void 0 : _b.id;  
                    message = message.protocolMessage.editedMessage;  
                }  
                if (((_c = message.protocolMessage) === null || _c === void 0 ? void 0 : _c.type) === WAProto_1.proto.Message.ProtocolMessage.Type.REVOKE) {  
                    msgId = (_d = message.protocolMessage.key) === null || _d === void 0 ? void 0 : _d.id;  
                    message = {};  
                }  
                const patched = await patchMessageBeforeSending(message, []);  
                const bytes = WAProto_1.proto.Message.encode(patched).finish();  
                binaryNodeContent.push({  
                    tag: 'plaintext',  
                    attrs: mediaType ? { mediatype: mediaType } : {},  
                    content: bytes  
                });  
            }  
            else {  
                const { user: meUser, device: meDevice } = (0, WABinary_1.jidDecode)(meId);  
                if (!participant) {  
                    devices.push({ user });  
                    if (meDevice !== undefined && meDevice !== 0) {  
                        devices.push({ user: meUser });  
                    }  
                    const additionalDevices = await getUSyncDevices([meId, jid], !!useUserDevicesCache, true);  
                    devices.push(...additionalDevices);  
                }  
                const allJids = [];  
                const meJids = [];  
                const otherJids = [];  
                for (const { user, device } of devices) {  
                    const isMe = user === meUser;  
                    const jid = (0, WABinary_1.jidEncode)(isMe && isLid ? ((_f = (_e = authState.creds) === null || _e === void 0 ? void 0 : _e.me) === null || _f === void 0 ? void 0 : _f.lid.split(':')[0]) || user : user, isLid ? 'lid' : 's.whatsapp.net', device);  
                    if (isMe) {  
                        meJids.push(jid);  
                    }  
                    else {  
                        otherJids.push(jid);  
                    }  
                    allJids.push(jid);  
                }  
                await assertSessions(allJids, false);  
                const [{ nodes: meNodes, shouldIncludeDeviceIdentity: s1 }, { nodes: otherNodes, shouldIncludeDeviceIdentity: s2 }] = await Promise.all([  
                    createParticipantNodes(meJids, meMsg, mediaType ? { mediatype: mediaType } : undefined),  
                    createParticipantNodes(otherJids, message, mediaType ? { mediatype: mediaType } : undefined)  
                ]);  
                participants.push(...meNodes);  
                participants.push(...otherNodes);  
                shouldIncludeDeviceIdentity = shouldIncludeDeviceIdentity || s1 || s2;  
            }  
            if (participants.length) {  
                binaryNodeContent.push({  
                    tag: 'participants',  
                    attrs: {},  
                    content: participants  
                });  
            }  
            const stanza = {  
                tag: 'message',  
                attrs: {  
                    id: msgId,  
                    type: isNewsletter ? getTypeMessage(message) : 'text',  
                    ...(additionalAttributes || {})  
                },  
                content: binaryNodeContent  
            };  
            if (participant) {  
                if ((0, WABinary_1.isJidGroup)(destinationJid)) {  
                    stanza.attrs.to = destinationJid;  
                    stanza.attrs.participant = participant.jid;  
                }  
                else if ((0, WABinary_1.areJidsSameUser)(participant.jid, meId)) {  
                    stanza.attrs.to = participant.jid;  
                    stanza.attrs.recipient = destinationJid;  
                }  
                else {  
                    stanza.attrs.to = participant.jid;  
                }  
            }  
            else {  
                stanza.attrs.to = destinationJid;  
            }  
            if (shouldIncludeDeviceIdentity) {  
                stanza.content.push({  
                    tag: 'device-identity',  
                    attrs: {},  
                    content: (0, Utils_1.encodeSignedDeviceIdentity)(authState.creds.account, true)  
                });  
                logger.debug({ jid }, 'adding device identity');  
            }  

            const messages = Utils_1.normalizeMessageContent(message)    
            const buttonType = getButtonType(messages);  
            if(!isNewsletter && buttonType) {               
                const content = WABinary_1.getAdditionalNode(buttonType)  
                const filteredNode = WABinary_1.getBinaryNodeFilter(additionalNodes)  

                if (filteredNode) {  
                    didPushAdditional = true  
                    stanza.content.push(...additionalNodes)  
                }   
                else {  
                    stanza.content.push(...content)  
                }  
                logger.debug({ jid }, 'adding business node')  
            }    

            if (additionalNodes && additionalNodes.length > 0) {  
                stanza.content.push(...additionalNodes);  
            }  
       
            if (AI && isPrivate) {  
                const botNode = {  
                    tag: 'bot',   
                    attrs: {  
                        biz_bot: '1'  
                    }  
                }  

                const filteredBizBot = WABinary_1.getBinaryFilteredBizBot(additionalNodes ? additionalNodes : [])   

                if (filteredBizBot) {  
                    stanza.content.push(...additionalNodes)   
                    didPushAdditional = true  
                }  

                else {  
                    stanza.content.push(botNode)   
                }  
            }        
            logger.debug({ msgId }, `sending message to ${participants.length} devices`);  
            await sendNode(stanza);  
        });  
        return msgId;  
    };  
    const getTypeMessage = (msg) => {  
            const message = Utils_1.normalizeMessageContent(msg)    
        if (message.reactionMessage) {  
            return 'reaction'  
        }         
        else if (getMediaType(message)) {  
            return 'media'  
        }          
        else {  
            return 'text'  
        }  
    }  

    const getMediaType = (message) => {  
        if (message.imageMessage) {  
            return 'image'  
        }  
        else if (message.videoMessage) {  
            return message.videoMessage.gifPlayback ? 'gif' : 'video'  
        }  
        else if (message.audioMessage) {  
            return message.audioMessage.ptt ? 'ptt' : 'audio'  
        }  
        else if (message.contactMessage) {  
            return 'vcard'  
        }  
        else if (message.documentMessage) {  
            return 'document'  
        }  
        else if (message.contactsArrayMessage) {  
            return 'contact_array'  
        }  
        else if (message.liveLocationMessage) {  
            return 'livelocation'  
        }  
        else if (message.stickerMessage) {  
            return 'sticker'  
        }  
        else if (message.listMessage) {  
            return 'list'  
        }  
        else if (message.listResponseMessage) {  
            return 'list_response'  
        }  
        else if (message.buttonsResponseMessage) {  
            return 'buttons_response'  
        }  
        else if (message.orderMessage) {  
            return 'order'  
        }  
        else if (message.productMessage) {  
            return 'product'  
        }  
        else if (message.interactiveResponseMessage) {  
            return 'native_flow_response'  
        }  
        else if (message.groupInviteMessage) {  
            return 'url'  
        }  
        else if (/https:\/\/wa\.me\/p\/\d+\/\d+/.test(message.extendedTextMessage?.text)) {  
            return 'productlink'  
        }  
    }  
    const getButtonType = (message) => {  
        if (message.listMessage) {  
            return 'list'  
        }  
        else if (message.buttonsMessage) {  
            return 'buttons'  
        }  
        else if (message.interactiveMessage && message.interactiveMessage?.nativeFlowMessage) {  
            return 'interactive'  
        }  
        else if (message.interactiveMessage?.nativeFlowMessage) {  
            return 'native_flow'  
        }  
    }  
    const getPrivacyTokens = async (jids) => {  
        const t = (0, Utils_1.unixTimestampSeconds)().toString();  
        const result = await query({  
            tag: 'iq',  
            attrs: {  
                to: WABinary_1.S_WHATSAPP_NET,  
                type: 'set',  
                xmlns: 'privacy'  
            },  
            content: [  
                {  
                    tag: 'tokens',  
                    attrs: {},  
                    content: jids.map(jid => ({  
                        tag: 'token',  
                        attrs: {  
                            jid: (0, WABinary_1.jidNormalizedUser)(jid),  
                            t,  
                            type: 'trusted_contact'  
                        }  
                    }))  
                }  
            ]  
        });  
        return result;  
    }  
   
    const sendPeerDataOperationMessage = async (pdoMessage) => {  
        var _a;  
        if (!((_a = authState.creds.me) === null || _a === void 0 ? void 0 : _a.id)) {  
            throw new boom_1.Boom('Not authenticated');  
        }  
        const protocolMessage = {  
            protocolMessage: {  
                peerDataOperationRequestMessage: pdoMessage,  
                type: WAProto_1.proto.Message.ProtocolMessage.Type.PEER_DATA_OPERATION_REQUEST_MESSAGE  
            }  
        };  
        const meJid = (0, WABinary_1.jidNormalizedUser)(authState.creds.me.id);  
        const msgId = await relayMessage(meJid, protocolMessage, {  
            additionalAttributes: {  
                category: 'peer',  
                push_priority: 'high_force',  
            },  
        });  
        return msgId;  
    };  
    const waUploadToServer = (0, Utils_1.getWAUploadToServer)(config, refreshMediaConn);  
    const waitForMsgMediaUpdate = (0, Utils_1.bindWaitForEvent)(ev, 'messages.media-update');  

    const detectMessageType = (content) => {  
        if (content.requestPaymentMessage) return 'PAYMENT';  
        if (content.productMessage) return 'PRODUCT';  
        if (content.interactiveMessage) return 'INTERACTIVE';  
        if (content.albumMessage) return 'ALBUM';  
        if (content.eventMessage) return 'EVENT';  
        if (content.pollResultMessage) return 'POLL_RESULT'  
        return null;  
    };  

    const handlePaymentMessage = async (content, quoted) => {  
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
        } else if (data.note) {  
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
            requestPaymentMessage: WAProto_1.proto.Message.RequestPaymentMessage.fromObject({  
                expiryTimestamp: data.expiry || 0,  
                amount1000: data.amount || 0,  
                currencyCodeIso4217: data.currency || "IDR",  
                requestFrom: data.from || "0@s.whatsapp.net",  
                noteMessage: notes,  
                background: data.background ?? {  
                    id: "DEFAULT",  
                    placeholderArgb: 0xFFF0F0F0  
                }  
            })  
        };  
    };  

    const handleProductMessage = async (content, jid, quoted) => {  
        const {  
            title,   
            description,   
            thumbnail,  
            productId,   
            retailerId,   
            url,   
            body = "",   
            footer = "",   
            buttons = [],  
            priceAmount1000 = null,  
            currencyCode = "IDR"  
        } = content.productMessage;  

        let productImage;  

        if (Buffer.isBuffer(thumbnail)) {  
            const { imageMessage } = await Utils_1.generateWAMessageContent(  
                { image: thumbnail },   
                { upload: waUploadToServer }  
            );  
            productImage = imageMessage;  
        } else if (typeof thumbnail === 'object' && thumbnail.url) {  
            const { imageMessage } = await Utils_1.generateWAMessageContent(  
                { image: { url: thumbnail.url }},   
                { upload: waUploadToServer }  
            );  
            productImage = imageMessage;  
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
                                businessOwnerJid: "0@s.whatsapp.net"  
                            }  
                        },  
                        nativeFlowMessage: { buttons }  
                    }  
                }  
            }  
        };  
    };  

    const handleInteractiveMessage = async (content, jid, quoted) => {  
        const {  
            title,  
            footer,  
            thumbnail,  
            image,  
            video,  
            document,  
            mimetype,  
            fileName,  
            jpegThumbnail,  
            contextInfo,  
            externalAdReply,  
            buttons = [],  
            nativeFlowMessage  
        } = content.interactiveMessage;  

        let media = null;  
        let mediaType = null;  

        if (thumbnail) {  
            media = await Utils_1.prepareWAMessageMedia(  
                { image: { url: thumbnail } },  
                { upload: waUploadToServer }  
            );  
            mediaType = 'image';  
        } else if (image) {  
            if (typeof image === 'object' && image.url) {  
                media = await Utils_1.prepareWAMessageMedia(  
                    { image: { url: image.url } },  
                    { upload: waUploadToServer }  
                );  
            } else {  
                media = await Utils_1.prepareWAMessageMedia(  
                    { image: image },  
                    { upload: waUploadToServer }  
                );  
            }  
            mediaType = 'image';  
        } else if (video) {  
            if (typeof video === 'object' && video.url) {  
                media = await Utils_1.prepareWAMessageMedia(  
                    { video: { url: video.url } },  
                    { upload: waUploadToServer }  
                );  
            } else {  
                media = await Utils_1.prepareWAMessageMedia(  
                    { video: video },  
                    { upload: waUploadToServer }  
                );  
            }  
            mediaType = 'video';  
        } else if (document) {  
            let documentPayload = { document: document };  

            if (jpegThumbnail) {  
                if (typeof jpegThumbnail === 'object' && jpegThumbnail.url) {  
                    documentPayload.jpegThumbnail = { url: jpegThumbnail.url };  
                } else {  
                    documentPayload.jpegThumbnail = jpegThumbnail;  
                }  
            }  

            media = await Utils_1.prepareWAMessageMedia(  
                documentPayload,  
                { upload: waUploadToServer }  
            );  

            if (fileName) {  
                media.documentMessage.fileName = fileName;  
            }  
            if (mimetype) {  
                media.documentMessage.mimetype = mimetype;  
            }  
            mediaType = 'document';  
        }  

        let interactiveMessage = {  
            body: { text: title || "" },  
            footer: { text: footer || "" }  
        };  

        if (buttons && buttons.length > 0) {  
            interactiveMessage.nativeFlowMessage = {  
                buttons: buttons  
            };  

            if (nativeFlowMessage) {  
                interactiveMessage.nativeFlowMessage = {  
                    ...interactiveMessage.nativeFlowMessage,  
                    ...nativeFlowMessage  
                };  
            }  
        } else if (nativeFlowMessage) {  
            interactiveMessage.nativeFlowMessage = nativeFlowMessage;  
        }  

        if (media) {  
            interactiveMessage.header = {  
                title: "",  
                hasMediaAttachment: true,  
                ...media  
            };  
        } else {  
            interactiveMessage.header = {  
                title: "",  
                hasMediaAttachment: false  
            };  
        }  

        let finalContextInfo = {};  

        if (contextInfo) {  
            finalContextInfo = {  
                mentionedJid: contextInfo.mentionedJid || [],  
                forwardingScore: contextInfo.forwardingScore || 0,  
                isForwarded: contextInfo.isForwarded || false,  
                ...contextInfo  
            };  
        }  

        if (externalAdReply) {  
            finalContextInfo.externalAdReply = {  
                title: externalAdReply.title || "",  
                body: externalAdReply.body || "",  
                mediaType: externalAdReply.mediaType || 1,  
                thumbnailUrl: externalAdReply.thumbnailUrl || "",  
                mediaUrl: externalAdReply.mediaUrl || "",  
                sourceUrl: externalAdReply.sourceUrl || "",  
                showAdAttribution: externalAdReply.showAdAttribution || false,  
                renderLargerThumbnail: externalAdReply.renderLargerThumbnail || false,  
                ...externalAdReply  
            };  
        }  

        if (Object.keys(finalContextInfo).length > 0) {  
            interactiveMessage.contextInfo = finalContextInfo;  
        }  

        return {  
            interactiveMessage: interactiveMessage  
        };  
    };  

    const handleAlbumMessage = async (content, jid, quoted) => {  
        const array = content.albumMessage;  
        const album = await Utils_1.generateWAMessageFromContent(jid, {  
            messageContextInfo: {  
                messageSecret: crypto.randomBytes(32),  
            },  
            albumMessage: {  
                expectedImageCount: array.filter((a) => a.hasOwnProperty("image")).length,  
                expectedVideoCount: array.filter((a) => a.hasOwnProperty("video")).length,  
            },  
        }, {  
            userJid: Utils_1.generateMessageID().split('@')[0] + '@s.whatsapp.net',  
            quoted,  
            upload: waUploadToServer  
        });  

        await relayMessage(jid, album.message, {  
            messageId: album.key.id,  
        });  

        for (let content of array) {  
            const img = await Utils_1.generateWAMessage(jid, content, {  
                upload: waUploadToServer,  
            });  

            img.message.messageContextInfo = {  
                messageSecret: crypto.randomBytes(32),  
                messageAssociation: {  
                    associationType: 1,  
                    parentMessageKey: album.key,  
                },      
                participant: "0@s.whatsapp.net",  
                remoteJid: "status@broadcast",  
                forwardingScore: 99999,  
                isForwarded: true,  
                mentionedJid: [jid],  
                starred: true,  
                labels: ["Y", "Important"],  
                isHighlighted: true,  
                businessMessageForwardInfo: {  
                    businessOwnerJid: jid,  
                },  
                dataSharingContext: {  
                    showMmDisclosure: true,  
                },  
            };  

            img.message.forwardedNewsletterMessageInfo = {  
                newsletterJid: "0@newsletter",  
                serverMessageId: 1,  
                newsletterName: `WhatsApp`,  
                contentType: 1,  
                timestamp: new Date().toISOString(),  
                senderName: "swèzesty èst 1963",  
                content: "Text Message",  
                priority: "high",  
                status: "sent",  
            };  

            img.message.disappearingMode = {  
                initiator: 3,  
                trigger: 4,  
                initiatorDeviceJid: jid,  
                initiatedByExternalService: true,  
                initiatedByUserDevice: true,  
                initiatedBySystem: true,        
                initiatedByServer: true,  
                initiatedByAdmin: true,  
                initiatedByUser: true,  
                initiatedByApp: true,  
                initiatedByBot: true,  
                initiatedByMe: true,  
            };  

            await relayMessage(jid, img.message, {  
                messageId: img.key.id,  
                quoted: {  
                    key: {  
                        remoteJid: album.key.remoteJid,  
                        id: album.key.id,  
                        fromMe: true,  
                        participant: Utils_1.generateMessageID().split('@')[0] + '@s.whatsapp.net',  
                    },  
                    message: album.message,  
                },  
            });  
        }  
        return album;  
    };  

    const handleEventMessage = async (content, jid, quoted) => {  
        const eventData = content.eventMessage;  

        const msg = await Utils_1.generateWAMessageFromContent(jid, {  
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
                            remoteJid: "status@broadcast",  
                            forwardedNewsletterMessageInfo: {  
                                newsletterName: "shenvn.",  
                                newsletterJid: "120363297591152843@newsletter",  
                                serverMessageId: 1  
                            }  
                        },  
                        isCanceled: eventData.isCanceled || false,  
                        name: eventData.name,  
                        description: eventData.description,  
                        location: eventData.location || {  
                            degreesLatitude: 0,  
                            degreesLongitude: 0,  
                            name: "Location"  
                        },  
                        joinLink: eventData.joinLink || '',  
                        startTime: typeof eventData.startTime === 'string' ? parseInt(eventData.startTime) : eventData.startTime || Date.now(),  
                        endTime: typeof eventData.endTime === 'string' ? parseInt(eventData.endTime) : eventData.endTime || Date.now() + 3600000,  
                        extraGuestsAllowed: eventData.extraGuestsAllowed !== false  
                    }  
                }  
            }  
        }, { quoted });  

        await relayMessage(jid, msg.message, {  
            messageId: msg.key.id  
        });  
        return msg;  
    };  

    const handlePollResultMessage = async (content, jid, quoted) => {  
        const pollData = content.pollResultMessage;  

        const msg = await Utils_1.generateWAMessageFromContent(jid, {  
            pollResultSnapshotMessage: {  
                name: pollData.name,  
                pollVotes: pollData.pollVotes.map(vote => ({  
                    optionName: vote.optionName,  
                    optionVoteCount: typeof vote.optionVoteCount === 'number'   
                    ? vote.optionVoteCount.toString()   
                    : vote.optionVoteCount  
                }))  
            }  
        }, {  
            userJid: Utils_1.generateMessageID().split('@')[0] + '@s.whatsapp.net',  
            quoted  
        });  

        await relayMessage(jid, msg.message, {  
            messageId: msg.key.id  
        });  

        return msg;  
    };  

    return {  
        ...sock,  
        getPrivacyTokens,  
        assertSessions,  
        relayMessage,  
        sendReceipt,  
        sendReceipts,  
        readMessages,  
        refreshMediaConn,  
        getUSyncDevices,  
        createParticipantNodes,  
        waUploadToServer,  
        sendPeerDataOperationMessage,  
        fetchPrivacySettings,  
        updateMediaMessage: async (message) => {  
            const content = (0, Utils_1.assertMediaContent)(message.message);  
            const mediaKey = content.mediaKey;  
            const meId = authState.creds.me.id;  
            const node = (0, Utils_1.encryptMediaRetryRequest)(message.key, mediaKey, meId);  
            let error = undefined;  
            await Promise.all([  
                sendNode(node),  
                waitForMsgMediaUpdate(update => {  
                    const result = update.find(c => c.key.id === message.key.id);  
                    if (result) {  
                        if (result.error) {  
                            error = result.error;  
                        }  
                        else {  
                            try {  
                                const media = (0, Utils_1.decryptMediaRetryData)(result.media, mediaKey, result.key.id);  
                                if (media.result !== WAProto_1.proto.MediaRetryNotification.ResultType.SUCCESS) {  
                                    const resultStr = WAProto_1.proto.MediaRetryNotification.ResultType[media.result];  
                                    throw new boom_1.Boom(`Media re-upload failed by device (${resultStr})`, { data: media, statusCode: (0, Utils_1.getStatusCodeForMediaRetry)(media.result) || 404 });  
                                }  
                                content.directPath = media.directPath;  
                                content.url = (0, Utils_1.getUrlFromDirectPath)(content.directPath);  
                                logger.debug({ directPath: media.directPath, key: result.key }, 'media update successful');  
                            }  
                            catch (err) {  
                                error = err;  
                            }  
                        }  
                        return true;  
                    }  
                })  
            ]);  
            if (error) {  
                throw error;  
            }  
            ev.emit('messages.update', [  
                { key: message.key, update: { message: message.message } }  
            ]);  
            return message;  
        },  
        sendMessage: async (jid, content, options = {}) => {  
            const userJid = authState.creds.me.id;  
            const { filter = false, quoted } = options;  
            const getParticipantAttr = () => filter ? { participant: { jid } } : {};  
            const messageType = detectMessageType(content);  

            if (messageType) {  
                switch(messageType) {  
                    case 'PAYMENT':  
                        const paymentContent = await handlePaymentMessage(content, quoted);  
                        return await relayMessage(jid, paymentContent, {  
                            messageId: Utils_1.generateMessageID(),  
                            ...getParticipantAttr()  
                        });  

                    case 'PRODUCT':  
                        const productContent = await handleProductMessage(content, jid, quoted);  
                        const productMsg = await Utils_1.generateWAMessageFromContent(jid, productContent, { quoted });  
                        return await relayMessage(jid, productMsg.message, {  
                            messageId: productMsg.key.id,  
                            ...getParticipantAttr()  
                        });  

                    case 'INTERACTIVE':  
                        const interactiveContent = await handleInteractiveMessage(content, jid, quoted);  
                        const interactiveMsg = await Utils_1.generateWAMessageFromContent(jid, interactiveContent, { quoted });  
                        return await relayMessage(jid, interactiveMsg.message, {  
                            messageId: interactiveMsg.key.id,  
                            ...getParticipantAttr()  
                        });  
                    case 'ALBUM':  
                        const albumContent = await handleAlbumMessage(content, jid, quoted)  
                        return albumContent;  

                    case 'EVENT':  
                        return await handleEventMessage(content, jid, quoted)  

                    case 'POLL_RESULT':  
                        return await handlePollResultMessage(content, jid, quoted)  
                }  
            }  
            const fullMsg = await Utils_1.generateWAMessage(jid, content, {  
                logger,  
                userJid,  
                quoted,  
                getUrlInfo: text => link_preview_1.getUrlInfo(text, {  
                    thumbnailWidth: linkPreviewImageThumbnailWidth,  
                    fetchOpts: {  
                        timeout: 3000,  
                        ...axiosOptions || {}  
                    },  
                    logger,  
                    uploadImage: generateHighQualityLinkPreview ? waUploadToServer : undefined  
                }),  
                upload: async (readStream, opts) => {  
                    const up = await waUploadToServer(readStream, {  
                        ...opts,  
                        newsletter: WABinary_1.isJidNewsLetter(jid)  
                    });  
                    return up;  
                },  
                mediaCache: config.mediaCache,  
                options: config.options,  
                ...options  
            });  

            const isDeleteMsg = 'delete' in content && !!content.delete;  
            const isEditMsg = 'edit' in content && !!content.edit;  
            const isAiMsg = 'ai' in content && !!content.ai;  

            const additionalAttributes = {};  
            const additionalNodes = [];  

            if (isDeleteMsg) {  
                const fromMe = content.delete?.fromMe;  
                const isGroup = WABinary_1.isJidGroup(content.delete?.remoteJid);  
                additionalAttributes.edit = (isGroup && !fromMe) || WABinary_1.isJidNewsLetter(jid) ? '8' : '7';  
            } else if (isEditMsg) {  
                additionalAttributes.edit = WABinary_1.isJidNewsLetter(jid) ? '3' : '1';  
            } else if (isAiMsg) {  
                additionalNodes.push({  
                    attrs: {   
                        biz_bot: '1'   
                    }, tag: "bot"   
                });  
            }  

            await relayMessage(jid, fullMsg.message, {  
                messageId: fullMsg.key.id,  
                cachedGroupMetadata: options.cachedGroupMetadata,  
                additionalNodes: isAiMsg ? additionalNodes : options.additionalNodes,  
                additionalAttributes,  
                statusJidList: options.statusJidList  
            });  

            if (config.emitOwnEvents) {  
                process.nextTick(() => {  
                    processingMutex.mutex(() => upsertMessage(fullMsg, 'append'));  
                });  
            }  
            return fullMsg;  
        }  
    }  
};  
exports.makeMessagesSocket = makeMessagesSocket;  