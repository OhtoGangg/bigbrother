const { loadCommands } = require("../../Handlers/commandHandler");
const ticket = require("../../Functions/ticket"); // ticket.js moduuli
const config = require("../../config.json");

module.exports = {
    name: "clientReady",
    once: true,
    async execute(client) {
        try {
            await loadCommands(client);
            console.log(`Kirjauduttu sisään: ${client.user.tag}`);

            // Lähetä ticket-panel tiettyyn kanavaan
            const panelChannel = client.channels.cache.get(config.ticketPanelChannelId);
            if (panelChannel) {
                await ticket.sendTicketPanel(panelChannel);
                console.log("Ticket-panel lähetetty kanavalle.");
            } else {
                console.warn("Ticket-panel kanavaa ei löytynyt. Tarkista config.");
            }

        } catch (error) {
            console.error("Error loading commands:", error);
        }
    }
};
