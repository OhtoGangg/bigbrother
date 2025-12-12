const { loadCommands } = require("../../Handlers/commandHandler");
const ticket = require("../../Functions/ticket"); // ticket.js moduuli
const allowlist = require("../../Functions/allowlist"); // allowlist.js moduuli
const config = require("../../config.json");
const watchlistModule = require("../../Functions/watchlist")(client);
client.watchlist = watchlistModule;

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
                await watchlistModule.startWatching();
                console.log("👁️ Watchlist-moduuli käynnistetty!");
            } catch (err) {
                console.error("❌ Watchlist-moduulin käynnistys epäonnistui:", err);
            }

            // --- Luo intervallitarkistus kaikille jäsenille watchlistiä varten ---
            const intervalTime = 1000 * 60 * 60 //1000ms*60s = 1min | 1min*60min = 1h
            setInterval(() => {
                watchlistModule.scanEveryMember()
            }, intervalTime)

        } catch (error) {
            console.error("❌ Error loading commands:", error);
        }
    }
};
