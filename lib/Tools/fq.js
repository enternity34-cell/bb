/**
     * Copyright © 2025 [ balxzzy ]
     *
     * All rights reserved. This source code is the property of [ Shiina Team ].
     * Unauthorized copying, distribution, modification, or use of this file,
     * via any medium, is strictly prohibited without prior written permission.
     *
     * This software is protected under international copyright laws.
     *
     * Contact: [ pa424013@gmail.com ]
     * GitHub: https://github.com/balxz
     * Official: https://balxzzy.web.id
     * Support: https://t.me/sh_team1
 */
const sharp = require("sharp")    
const axios = require("axios")    
    
async function bup(linj) {    
    const a = await axios.get(linj, {    
        responseType: "arraybuffer"    
    }).then(b => b.data)    
    const c = await sharp(a).resize(200, 200).jpeg().toBuffer()    
    return c    
}    
    
exports.ffffffff = async (m) => {    
    let t = await bup(imej.pp)   
    global.imej = {    
        pp: "https://raw.githubusercontent.com/balxz/akuuu-muaakk/refs/heads/main/IMG-20251019-WA0030.jpg"    
    }    
        
    global.jij = {    
        ai: "1294102229039086@bot",    
        wa: "0@s.whatsapp.net",    
        meta: "13135550002@s.whatsapp.net",    
        status: "status@broadcast"    
    }    
    global.q = {    
        kont: {    
            key: {    
                participant: jij.wa,    
                remoteJid: jij.wa,    
                id: m.id    
            },    
            message: {    
                contactMessage: {    
                    displayName: "bbb",    
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:XL,\nFN:\nitem1.TELwaid=:\nitem1.X-ABLabel:Mobile\nEND:VCARD`,    
                    jpegThumbnail: t,    
                    thumbnail: t,    
                    sendEphemeral: true    
                }    
            },    
            contextInfo: {    
                mentionedJid: [m.sender],    
                forwardingScore: 999,    
                isForwarded: true    
            }    
        },    
    
        lok: {    
            key: {    
                participant: jij.wa,    
                remoteJid: jij.status,    
                id: m.id    
            },    
            message: {    
                locationMessage: {    
                    name: "indonesia kalimantan timur",    
                    jpegThumbnail: t    
                }    
            },    
            contextInfo: {    
                mentionedJid: [m.sender],    
                forwardingScore: 999,    
                isForwarded: true    
            }    
        },    
    
        slran: {    
            key: {    
                remoteJid: jij.ai,    
                participant: jij.ai,    
                id: m.id    
            },    
            message: {    
                newsletterAdminInviteMessage: {    
                    newsletterJid: "120363421767388472@newsletter",    
                    newsletterName: "",    
                    caption: "SHIINA WABOT",    
                    inviteExpiration: 18181819    
                }    
            },    
            contextInfo: {    
                mentionedJid: [m.sender],    
                forwardingScore: 999,    
                isForwarded: true    
            }    
        },    
    
        vrif: {    
            key: {    
                participant: jij.wa,    
                remoteJid: jij.wa,    
                id: m.id    
            },    
            message: {    
                conversation: "_Shiina Terverifikasi Oleh WhatsApp_"    
            },    
            contextInfo: {    
                mentionedJid: [m.sender],    
                forwardingScore: 999,    
                isForwarded: true    
            }    
        },    
    
        ktlog: {    
            key: {    
                participant: jij.ai,    
                remoteJid: jij.ai    
            },    
            message: {    
                orderMessage: {    
                    orderId: 1,    
                    thumbnail: t,    
                    itemCount: 1,    
                    status: "INQUIRY",    
                    surface: "CATALOG",    
                    message: "bbb? bàlxzzy",    
                    token: "AR6xBKbXZn0Xwmu76Ksyd7rnxI+Rx87HfinVlW4lwXa6JA=="    
                }    
            },    
            contextInfo: {    
                mentionedJid: [m.sender],    
                forwardingScore: 999,    
                isForwarded: true    
            }    
        },    
    
        evnt: (text) => ({    
            key: {    
                participant: jij.wa,    
                remoteJid: jij.wa,    
                id: m.id    
            },    
            message: {    
                eventMessage: {    
                    isCanceled: false,    
                    name: text,    
                    location: {    
                        degreesLatitude: 0,    
                        degreesLongitude: 0,    
                        name: "SH"    
                    },    
                    startTime: {    
                        low: 1760819400,    
                        high: 0,    
                        unsigned: false    
                    },    
                    extraGuestsAllowed: false    
                }    
            },    
            contextInfo: {    
                mentionedJid: [m.sender],    
                forwardingScore: 999,    
                isForwarded: true    
            }    
        }),    
    
        aud: {    
            key: {    
                participant: jij.wa,    
                remoteJid: jij.wa,    
                id: m.id    
            },    
            message: {    
                audioMessage: {    
                    url: "https://mmg.whatsapp.net/v/t62.7114-24/566697908_778409681729038_1114864819551537281_n.enc?ccb=11-4&oh=01_Q5Aa2wEWkRVjeMhcxRnAcCGmCnwX14G7-hop52E_Cmy7iTa-Uw&oe=691B54E4&_nc_sid=5e03e0&mms3=true",    
                    mimetype: "audio/ogg; codecs=opus",    
                    fileSha256: Buffer.from("terO+wEkV5Rdd8i996IQmcrjqjnd4ecQ4qfBqceF3aQ=", "base64"),    
                    fileLength: "492524",    
                    seconds: 55,    
                    ptt: false,    
                    mediaKey: Buffer.from("RJp3pUMFpp0wPD/+6yxA2qU3aa6QG4Cks58oJiOSZWQ=", "base64"),    
                    fileEncSha256: Buffer.from("HDwiB+zLgy65E7ZLwzFwIn4jWa9qDueU7i1qHr/bTkI=", "base64"),    
                    directPath: "/v/t62.7114-24/566697908_778409681729038_1114864819551537281_n.enc",    
                    mediaKeyTimestamp: "1760630535"    
                }    
            },    
            contextInfo: {    
                mentionedJid: [m.sender],    
                forwardingScore: 999,    
                isForwarded: true    
            }    
        },    
    
        file: {    
            key: {    
                participant: jij.wa,    
                remoteJid: jij.wa,    
                id: m.id    
            },    
            message: {    
                documentMessage: {    
                    url: "https://mmg.whatsapp.net/v/t62.7119-24/566236817_1480966489690661_740972976298631092_n.enc?ccb=11-4&oh=01_Q5Aa2wFHFTLXaHIctYq8w0az_yTuovWRSsnONaWKwZdkvNE98g&oe=691B6268&_nc_sid=5e03e0&mms3=true",    
                    mimetype: "text/javascript",    
                    fileSha256: Buffer.from("MBfC0w02rdiT9cynBedK29x+DUsH5TWmsauZ6lelaJs=", "base64"),    
                    fileLength: "2139",    
                    pageCount: 0,    
                    mediaKey: Buffer.from("Irn2Ync+KqdH0/Raj6oStPl8loOqoSYqMqs9Ba0uFPQ=", "base64"),    
                    fileName: "Shiina-WaBot.zip",    
                    fileEncSha256: Buffer.from("SNdAR2WAsdCYPapOwlyQzycgtnHEfda2lqwBfQRtxIw=", "base64"),    
                    directPath: "/v/t62.7119-24/566236817_1480966489690661_740972976298631092_n.enc",    
                    mediaKeyTimestamp: "1760714768"    
                }    
            },    
            contextInfo: {    
                mentionedJid: [m.sender],    
                forwardingScore: 999,    
                isForwarded: true    
            }    
        },    
    
        stc: {    
            key: {    
                participant: jij.wa,    
                remoteJid: jij.wa,    
                id: m.id    
            },    
            message: {    
                stickerMessage: {    
                    url: "https://mmg.whatsapp.net/v/t62.15575-24/566475817_24368366692840944_7010511453873554327_n.enc?ccb=11-4&oh=01_Q5Aa2wFkst0wEGNjBGnPYayMQ7Q2o3u4J9_3mL6BsC7PMA1jYQ&oe=691B8416&_nc_sid=5e03e0&mms3=true",    
                    fileSha256: Buffer.from("UUF4NLPCBhxThmlZGOxrD8VEL6u5THEuVKLQbsMSDO4=", "base64"),    
                    fileEncSha256: Buffer.from("yUQDOE4Xf7mr15zZIQYq41yI2ogdP2qJ/7KzAr30kjM=", "base64"),    
                    mediaKey: Buffer.from("SP2lkhr4K42glxNSv1lEsnOCG7yQ1UQeNTrwiUWyows=", "base64"),    
                    mimetype: "image/webp",    
                    height: 64,    
                    width: 64,    
                    directPath: "/v/t62.15575-24/566475817_24368366692840944_7010511453873554327_n.enc",    
                    fileLength: "398610",    
                    mediaKeyTimestamp: "1760614502",    
                    isAnimated: true,    
                    isAvatar: false,    
                    isAiSticker: false,    
                    isLottie: false    
                }    
            },    
            contextInfo: {    
                mentionedJid: [m.sender],    
                forwardingScore: 999,    
                isForwarded: true    
            }    
        },    
    
        stcp: {    
            key: {    
                participant: jij.wa,    
                remoteJid: jij.wa,    
                id: m.id    
            },    
            message: {    
                stickerPackMessage: {    
                    stickerPackId: "653608de-b615-4fe0-8b56-106a207bedb6",    
                    name: "hitam",    
                    publisher: "",    
                    stickers: [{    
                            fileName: "KfSMd1gQth3QS2pbhpRqYTYzfy8R1Rctouy8EWyY7OU=.webp",    
                            isAnimated: true,    
                            emojis: [""]    
                        },    
                        {    
                            fileName: "d5vujUTjXCX8iOXTd+iGeTxMa78dZvEmHhAWm8TDFEU=.webp",    
                            isAnimated: true    
                        },    
                        {    
                            fileName: "FQRcZrMg3Yw8OnRka0FqeQQLlOAO6QWXaN3jnS5KwpA=.webp",    
                            isAnimated: true,    
                            emojis: [""]    
                        }    
                    ],    
                    fileLength: "497929",    
                    fileSha256: Buffer.from("XSzP5Ayhp+W2QMH+W62Iua3/SNLm9ZXi/UtFerAnYvw=", "base64"),    
                    fileEncSha256: Buffer.from("109ve6H/z/kIMNQebBIgfnZujYvxmKMrmRJmfadJBrg=", "base64"),    
                    mediaKey: Buffer.from("HEecOUOq2UEnIYwaLip2AP90Js/5wv58+tdkwC3ToGM=", "base64"),    
                    directPath: "/v/t62.15575-24/567379420_1307923277778309_6485885397637497017_n.enc",    
                    thumbnailDirectPath: "/v/t62.15575-24/568556587_809243951798388_692566258468974771_n.enc",    
                    thumbnailSha256: Buffer.from("0u6DJyq3KZWp1oqzFTuXNuVdX/NUrkAN8VkMeTOZSLU=", "base64"),    
                    thumbnailEncSha256: Buffer.from("+xXyqLMnrb9GUYw01MwgYF0+5UWOyA/xk0lAcxtA/Oc=", "base64"),    
                    thumbnailHeight: 252,    
                    thumbnailWidth: 252,    
                    stickerPackSize: "498086",    
                    stickerPackOrigin: 2,    
                    mediaKeyTimestamp: "1760819684"    
                }    
            },    
            contextInfo: {    
                mentionedJid: [m.sender],    
                forwardingScore: 999,    
                isForwarded: true    
            }    
        },    
    
        pay: (text) => ({    
            key: {    
                participant: jij.wa,    
                remoteJid: jij.wa,    
                id: m.id    
            },    
            message: {    
                interactiveMessage: {    
                    nativeFlowMessage: {    
                        buttons: [{    
                            name: "review_and_pay",    
                            buttonParamsJson: JSON.stringify({    
                                currency: "XXX",    
                                total_amount: {    
                                    value: 1100,    
                                    offset: 100    
                                },    
                                reference_id: "4TDL73JVZ7W",    
                                type: "physical-goods",    
                                order: {    
                                    status: "payment_requested",    
                                    subtotal: {    
                                        value: 0,    
                                        offset: 100    
                                    },    
                                    order_type: "PAYMENT_REQUEST",    
                                    items: [{    
                                        retailer_id: "custom-item-4385759e-671a-4f4d-828a-24819c916df4",    
                                        name: text,    
                                        amount: {    
                                            value: 1100,    
                                            offset: 100    
                                        },    
                                        quantity: 1    
                                    }]    
                                },    
                                additional_note: text,    
                                native_payment_methods: [],    
                                share_payment_status: false    
                            })    
                        }]    
                    }    
                }    
            },    
            contextInfo: {    
                mentionedJid: [m.sender],    
                forwardingScore: 999,    
                isForwarded: true    
            }    
        }),    
    
        img: (text) => ({    
            key: {    
                participant: jij.wa,    
                remoteJid: jij.wa,    
                id: m.id    
            },    
            message: {    
                imageMessage: {    
                    mimetype: "image/jpeg",    
                    jpegThumbnail: t,    
                    caption: text    
                }    
            }    
        })    
    }    
}    