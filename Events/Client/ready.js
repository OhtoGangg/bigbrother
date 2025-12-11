const { loadCommands } = require("../../Handlers/commandHandler");
const ticket = require("../../Functions/ticket"); // ticket.js moduuli
const allowlist = require("../../Functions/allowlist"); // allowlist.js moduuli
const config = require("../../config.json");

module.exports = {
    name: "clientReady",
    once: true,
    async execute(client) {
        console.log("🔄 Ready event käynnistyy...");
        try {
            // --- Lataa komennot ---
            await loadCommands(client);
            console.log(`✅ Kirjauduttu sisään: ${client.user.tag}`);

            // --- Haetaan guild ---
            let guild;
            try {
                guild = await client.guilds.fetch(config.guildID);
                await guild.members.fetch(); // varmista, että jäsenet ovat cache:ssa
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

            // --- Lähetä allowlist-panel ---
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
                const watchlistModule = require("../Functions/watchlist")(client);
                client.watchlist = watchlistModule;
                await watchlistModule.startWatching();
                console.log("👍 Watchlist-moduuli käynnistetty!");
            } catch (err) {
                console.error("❌ Watchlist-moduulin käynnistys epäonnistui:", err);
            }

        } catch (error) {
            console.error("❌ Error ready eventissä:", error);
        }
    }
};
