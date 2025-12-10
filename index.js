require('dotenv').config();
const express = require('express');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { loadEvents } = require("./handlers/eventHandler");

// -----------------------------
// EXPRESS KEEP-ALIVE
// -----------------------------
const PORT = process.env.PORT || 10000;
const app = express();
app.get('/', (req, res) => res.send('✅ Big Brother bot running!'));
app.listen(PORT, () => console.log(`🌐 HTTP server alive on port ${PORT}`));

// -----------------------------
// LUODAAN CLIENT
// -----------------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
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

// -----------------------------
// COLLECTIONS
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
// LADATAAN WATCHLIST
// -----------------------------
const watchlist = require(path.resolve(__dirname, "functions/watchlist"))(client);

// -----------------------------
// LADATAAN EVENTIT
// -----------------------------
loadEvents(client);

// -----------------------------
// BOT READY
// -----------------------------
client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    if (watchlist && typeof watchlist.scanWatchlist === "function") {
        await watchlist.scanWatchlist();
    }

    // Haetaan guild ja jäsenet cacheen
    const guildCache = await client.guilds.fetch(process.env.GUILD_ID);
    await guildCache.members.fetch();
    watchlist.setGuildCache(guildCache);

    // Käydään läpi kaikki jäsenet käynnistyksessä
    guildCache.members.cache.forEach(member => watchlist.checkMemberAgainstWatchlist(member));
});

// -----------------------------
// BOT EVENTIT
// -----------------------------
client.on("guildMemberAdd", async (member) => {
    await watchlist.checkMemberAgainstWatchlist(member);
});

client.on("messageCreate", async (message) => {
    if (message.channel.id !== process.env.WATCHLIST_CHANNEL_ID || message.author.bot) return;
    const cleaned = message.content.trim().toLowerCase().replace(/\s+/g, " ");
    if (cleaned.length === 0) return;

    watchlist.addWatchlistEntry(cleaned);
    console.log(`Uusi watchlist-merkintä: "${cleaned}"`);

    // Käydään läpi kaikki jäsenet ilman fetchiä
    watchlist.getGuildCache()?.members.cache.forEach(member => watchlist.checkMemberAgainstWatchlist(member));
});

// -----------------------------
// BOT LOGIN
// -----------------------------
client.login(process.env.TOKEN);
