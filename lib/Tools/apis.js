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
const axios=require("axios");function createClient(e,t={}){return axios.create({baseURL:e,validateStatus:()=>!0,headers:t})}function makeClient(e){let t=n=>async(...a)=>{try{let r=await n(...a);return r?.data}catch(o){return o?.response?.data}};return{get:t((t,a,r)=>e.get(t,{params:a,...r})),post:t((t,a,r)=>e.post(t,a,r)),request:t(t=>e.request({...t}))}}module.exports=(e,t=null)=>makeClient(createClient(e,{"x-api-key":t}));