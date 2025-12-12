const { loadCommands } = require("../../Handlers/commandHandler");
const ticket = require("../../Functions/ticket"); // ticket.js moduuli
const allowlist = require("../../Functions/allowlist"); // allowlist.js moduuli
const config = require("../../config.json");

module.exports = {
    name: "clientReady",
    once: true,
    async execute(client) {
        try {
            // --- Alusta watchlist ---
            const watchlistModule = require("../../Functions/watchlist")(client);
            client.watchlist = watchlistModule;

            // --- Lataa komennot ---
            await loadCommands(client);
            console.log(`Kirjauduttu sisään: ${client.user.tag}`);

            // --- Lähetä ticket-panel ---
            try {
                const ticketChannel = await client.channels.fetch(config.ticket.ticketPanelChannelId);
                if (ticketChannel) {
                    await ticket.sendTicketPanel(ticketChannel);
                    console.log("🎫 Ticket-panel lähetetty kanavalle.");
                } else {
                    console.warn("⚠️ Ticket-panel kanavaa ei löytynyt. Tarkista config.");
                }
            } catch (err) {
                console.error("❌ Virhe ticket-panelin lähetyksessä:", err);
            }

            // --- Lähetä allowlist-panel ---
            try {
                const allowlistChannel = await client.channels.fetch(config.channels.haeAllowlistChannel);
                if (allowlistChannel) {
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
                await watchlistModule.startWatching();
                console.log("Watchlist-moduuli käynnistetty!");
            } catch (err) {
                console.error("❌ Watchlist-moduulin käynnistys epäonnistui:", err);
            }

            // --- Luo intervallitarkistus kaikille jäsenille watchlistiä varten ---
            const intervalTime = 1000 * 60 * 60; // 1 tunti
            setInterval(() => {
                if (watchlistModule.scanEveryMember) {
                    watchlistModule.scanEveryMember();
                }
            }, intervalTime);

        } catch (error) {
            console.error("❌ Error loading commands:", error);
        }
    }
};
