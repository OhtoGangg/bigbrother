const { loadCommands } = require("../../Handlers/commandHandler");
const ticket = require("../../Functions/ticket"); // ticket.js moduuli
const allowlist = require("../../Functions/allowlist"); // allowlist.js moduuli
const config = require("../../config.json");

module.exports = {
    name: "clientReady",
    once: true,
    async execute(client) {
        try {
            // --- Lataa komennot ---
            await loadCommands(client);
            console.log(`Kirjauduttu sisään: ${client.user.tag}`);

            // --- Lähetä ticket-panel ---
            const ticketChannel = client.channels.cache.get(config.ticket.ticketPanelChannelId);
            if (ticketChannel) {
                await ticket.sendTicketPanel(ticketChannel);
                console.log("🎫 Ticket-panel lähetetty kanavalle.");
            } else {
                console.warn("⚠️ Ticket-panel kanavaa ei löytynyt. Tarkista config.");
            }

            // --- Lähetä allowlist-panel ---
            const allowlistChannel = client.channels.cache.get(config.channels.haeAllowlistChannel);
            if (allowlistChannel) {
                await allowlist.sendAllowlistPanel(allowlistChannel);
                console.log("📨 Allowlist-panel lähetetty kanavalle.");
            } else {
                console.warn("⚠️ Allowlist-panel kanavaa ei löytynyt. Tarkista config.");
            }

            // --- Käynnistä watchlist ---
            try {
                const watchlistModule = require("../../Functions/watchlist")(client);
                client.watchlist = watchlistModule;
                await watchlistModule.startWatching();
                console.log("👁️ Watchlist-moduuli käynnistetty!");
            } catch (err) {
                console.error("❌ Watchlist-moduulin käynnistys epäonnistui:", err);
            }

        } catch (error) {
            console.error("❌ Error loading commands:", error);
        }
    }
};
