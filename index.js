require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const config = require('./config.json');

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
process.on("unhandledRejection", (reason, promise) => console.error("Unhandled Rejection |", reason, promise));
process.on('uncaughtException', (error) => console.error('Unhandled Exception:', error));

// -----------------------------
// FUNCTIONS
// -----------------------------
const ticket = require('./Functions/ticket');
const allowlist = require('./Functions/allowlist');

// -----------------------------
// EVENT HANDLER
// -----------------------------
const { loadEvents } = require('./Handlers/eventHandler');
loadEvents(client);

// -----------------------------
// BOT READY
// -----------------------------
client.once("ready", async () => {
    console.log("🔄 Ready event käynnistyy...");
    try {
        // --- Lataa komennot ---
        await loadEvents(client);
        console.log(`✅ Kirjauduttu sisään: ${client.user.tag}`);

        // --- Haetaan guild ---
        let guild;
        try {
            guild = await client.guilds.fetch(config.guildID);
            await guild.members.fetch();
            console.log(`📦 Guild haettu: ${guild.name}, jäseniä: ${guild.memberCount}`);
        } catch (err) {
            console.error("❌ Virhe guildin fetchauksessa:", err);
            return;
        }

        // --- Lähetä ticket-panel ---
        try {
            const ticketChannel = await guild.channels.fetch(config.ticket.ticketPanelChannelId);
            if (ticketChannel) {
                await ticket.sendTicketPanel(ticketChannel);
                console.log("🎫 Ticket-panel lähetetty kanavalle.");
            } else {
                console.warn("⚠️ Ticket-panel kanavaa ei löytynyt. Tarkista config.");
            }
        } catch (err) {
            console.error("❌ Virhe ticket-panelin lähetyksessä:", err);
        }

// lähetä kusinen allowlist paneeli
        
        try {
            const allowlistChannel = await guild.channels.fetch(config.channels.haeAllowlistChannel);
            if (allowlistChannel) {
                console.log("👀 Allowlist-kanava löytyi, lähetetään panel...");
                await allowlist.sendAllowlistPanel(allowlistChannel);
                console.log("📨 Allowlist-panel lähetetty kanavalle.");
            } else {
                console.warn("⚠️ Allowlist-panel kanavaa ei löytynyt. Tarkista config.");
            }
        } catch (err) {
            console.error("❌ Virhe allowlist-panelin lähetyksessä:", err);
        }

        // --- Käynnistä watchlist ---
        try {
            const watchlistModule = require("./Functions/watchlist")(client);
            client.watchlist = watchlistModule;
            await watchlistModule.startWatching();
            console.log("👁️ Watchlist-moduuli käynnistetty!");
        } catch (err) {
            console.error("❌ Watchlist-moduulin käynnistys epäonnistui:", err);
        }

    } catch (error) {
        console.error("❌ Error ready eventissä:", error);
    }
});

// Interactiot 

client.on('interactionCreate', async (interaction) => {
    console.log("Nyt tapahtu jotain"); // <-- debug log

    try {
        // --- Allowlist napin painallus ---
        if (interaction.isButton() && interaction.customId === 'create_allowlist') {
            console.log("Nyt avataan allowlist modali!");
            await allowlist.showAllowlistModal(interaction);
            return;
        }

// Allowlisti moduulijutut
        
        if (interaction.isModalSubmit() && interaction.customId === 'allowlist_modal') {
            console.log("Allowlist modal submit käsitellään...");
            await allowlist.handleModalSubmit(interaction);
            return;
        }

// Tikettien toiminnot
        await ticket.handleInteraction(interaction);

    } catch (err) {
        console.error("Error handleInteraction (interactionCreate):", err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Tapahtui virhe interaktiossa.', ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN)
    .then(() => console.log("🔑 Bot kirjautunut sisään, TOKEN käytetty"))
    .catch(err => console.error("❌ Bot kirjautuminen epäonnistui:", err));
