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

export interface Message {
    id: string
    sender: string
    chat?: string
    [key: string]: any
}

export interface QuotedTemplates {
    kont: any
    lok: any
    slran: any
    vrif: any
    ktlog: any
    evnt: (text: string) => any
    aud: any
    file: any
    stc: any
    stcp: any
    pay: (text: string) => any
    img: (text: string) => any
}

export declare function ffffffff(m: Message): Promise<void>

declare global {
    var q: QuotedTemplates
    var imej: { pp: string }
    var jij: { ai: string; wa: string; meta: string; status: string }
}

export {}