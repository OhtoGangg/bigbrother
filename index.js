require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const path = require('path');
const config = require('./config.json'); // suhteellinen polku index.js:stä

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
    console.error("Unhandled Rejection |", reason, promise);
});
process.on('uncaughtException', (error) => {
    console.error('Unhandled Exception:', error);
});

// -----------------------------
// LADATAAN WATCHLIST
// -----------------------------
// Render ja Node ovat case-sensitive → kansio pienellä
const watchlist = require('./functions/watchlist')(client);

// -----------------------------
// LADATAAN EVENTIT
// -----------------------------
const { loadEvents } = require('./handlers/eventHandler');
loadEvents(client);

// -----------------------------
// BOT READY
// -----------------------------
client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Päivitetään watchlist ennen tarkistusta
    if (watchlist && typeof watchlist.scanWatchlist === "function") {
        await watchlist.scanWatchlist();
    }

    // Hae guild ja jäsenten cache
    const guild = await client.guilds.fetch(config.guildID);
    await guild.members.fetch();
    watchlist.setGuildCache(guild);

    console.log("Tarkistetaan watchlist kaikille jäsenille käynnistyksen yhteydessä...");

    // Käydään läpi kaikki jäsenet
    guild.members.cache.forEach(member => watchlist.checkMemberAgainstWatchlist(member));
});

// -----------------------------
// BOT EVENTIT
// -----------------------------
client.on("guildMemberAdd", async (member) => {
    console.log(`Uusi jäsen: ${member.user.tag} - tarkistetaan watchlist...`);
    await watchlist.checkMemberAgainstWatchlist(member);
});

client.on("messageCreate", async (message) => {
    const WATCHLIST_CHANNEL_ID = config.channels.watchlistChannel;
    if (message.channel.id !== WATCHLIST_CHANNEL_ID || message.author.bot) return;

    const cleaned = message.content.trim().toLowerCase().replace(/\s+/g, " ");
    if (cleaned.length === 0) return;

    console.log(`Uusi watchlist-merkintä kanavasta: "${cleaned}"`);
    watchlist.addWatchlistEntry(cleaned);

    watchlist.getGuildCache()?.members.cache.forEach(member => {
        console.log(`Tarkistetaan ${member.user.tag} watchlistia vasten`);
        watchlist.checkMemberAgainstWatchlist(member);
    });
});

// -----------------------------
// BOT LOGIN
// -----------------------------
client.login(process.env.TOKEN);
