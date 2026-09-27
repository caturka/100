const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const fs = require('fs')
const pino = require('pino')
const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000

// Web server biar Render gak sleep
app.get('/', (req,res) => res.send('<h1>🐱 BANGCATS BOT ONLINE 24/7</h1><p>Bot jalan! Scan QR di logs Render</p>'))
app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`))

async function startBot(){
    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const { version } = await fetchLatestBaileysVersion()
    
    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({level:'silent'}),
        printQRInTerminal: true,
        browser: ['BANGCATS BOT','Chrome','1.0'],
        markOnlineOnConnect: true
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (up) => {
        const { connection, lastDisconnect } = up
        if(connection === 'close'){
            const reason = lastDisconnect?.error?.output?.statusCode
            console.log('Connection closed, reason:', reason)
            if(reason !== DisconnectReason.loggedOut){
                startBot()
            } else {
                console.log('Logout, hapus folder session dan scan ulang')
            }
        } else if(connection === 'open'){
            console.log('✅ BANGCATS BOT CONNECTED - 24/7 ONLINE')
        }
    })

    sock.ev.on('messages.upsert', async ({messages}) => {
        let m = messages[0]
        if(!m.message || m.key.fromMe) return
        let from = m.key.remoteJid
        let type = Object.keys(m.message)[0]
        let body = (type==='conversation') ? m.message.conversation : (type==='extendedTextMessage') ? m.message.extendedTextMessage.text : (type==='imageMessage') ? m.message.imageMessage.caption : ''
        if(!body) return
        
        let cmd = body.trim().split(' ')[0].toLowerCase()
        let args = body.trim().split(' ').slice(1).join(' ')
        let isGroup = from.endsWith('@g.us')
        
        console.log(`[${isGroup?'GROUP':'PRIVATE'}] ${from}: ${body}`)

        // ===== MENU UTAMA - PAKE ! TANPA / =====
        if(cmd === "!menu" || cmd === "!help"){
            let menuText = `*🐱 BANGCATS BOT - 24/7 ONLINE 🤖*

*Bot Aktif Bosku!*
Ketik command dibawah dengan tanda !

╭───〔 📥 DOWNLOADER 〕
│ • !tt <link tiktok>
│ • !ig <link instagram>
│ • !yt <link youtube>
│ • !play <judul lagu>
│ • !fb <link facebook>
╰───

╭───〔 🎨 STICKER 〕
│ • !s (reply foto/video)
│ • !toimg (reply sticker)
╰───

╭───〔 👑 OWNER 〕
│ • !owner - sewa & info
│ • !ping - cek speed
╰───

*TYPE !MENU TO VIEW COMMANDS*
*READY TO PLAY - BANGCATS 2026*`

            try{
                if(fs.existsSync('./logo.jpg')){
                    await sock.sendMessage(from, {
                        image: fs.readFileSync('./logo.jpg'),
                        caption: menuText
                    })
                } else {
                    await sock.sendMessage(from, {text: menuText})
                }
            } catch(e){
                await sock.sendMessage(from, {text: menuText})
            }
        }

        else if(cmd === "!owner"){
            await sock.sendMessage(from, {text: `*OWNER BANGCATS BOT*\n\nWA: wa.me/628xxxx\nIG: @__kerass\n\nMau sewa bot? Chat aja!\nBot 24 jam online di Render`})
        }
        else if(cmd === "!ping"){
            await sock.sendMessage(from, {text: `*PING:* ${(Date.now()/1000).toFixed(0)}ms\n*Status:* Online 24/7 di Render ✅`})
        }
        else if(cmd === "!tt"){
            if(!args) return sock.sendMessage(from, {text: "Kirim link TikTok! Contoh: !tt https://vt.tiktok.com/xxx"})
            await sock.sendMessage(from, {text: `⏳ Downloading TikTok...\nLink: ${args}\n\nFitur auto download aktif, tinggal sambung API tiktok!`})
        }
        else if(cmd === "!s"){
            await sock.sendMessage(from, {text: "Reply foto/video dengan caption !s untuk jadi sticker"})
        }
    })
}

startBot()
