require('dotenv').config();
const express = require('express');
const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    Collection, 
    EmbedBuilder 
} = require('discord.js');

const { loadEvents } = require("./Handlers/eventHandler");

// -----------------------------
// EXPRESS KEEP-ALIVE (Render yms.)
// -----------------------------
const PORT = process.env.PORT || 10000;
const app = express();

app.get('/', (req, res) => res.send('✅ Big Brother bot running!'));
app.listen(PORT, () => console.log(`🌐 HTTP server alive on port ${PORT}`));

// -----------------------------
// LUODAAN YKSI JA AINOA CLIENT
// -----------------------------
const client = new Client({
    intents: [
        // index.js intentit
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,

        // main.js intentit
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildPresences
    ],
    partials: [
        Partials.Channel,
        Partials.GuildMember,
        Partials.Message,
        Partials.User,
        Partials.Reaction,
        Partials.ThreadMember
    ]
});

// EXPORT (jos joku tiedosto tarvitsee)
module.exports = client;

// -----------------------------
// DISCORD COLLECTIONS
// -----------------------------
client.events = new Collection();
client.commands = new Collection();

// -----------------------------
// ERROR HANDLING
// -----------------------------
process.on("unhandledRejection", (reason, promise) => {
    console.error("Error | ", promise, "Syy | ", reason);
});
process.on('uncaughtException', (error) => {
    console.error('Unhandled Exception:', error);
});

// -----------------------------
// LADATAAN EVENTIT
// -----------------------------
loadEvents(client);

// -----------------------------
// CONFIG / ENV
// -----------------------------
const GUILD_ID = process.env.GUILD_ID;

// -----------------------------
// BOT READY
// -----------------------------
client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    if (typeof scanWatchlist === "function") {
        await scanWatchlist();
    }

    const guildCache = await client.guilds.fetch(GUILD_ID);
    await guildCache.members.fetch();
});

// -----------------------------
// BOT LOGIN
// -----------------------------
client.login(process.env.TOKEN);
