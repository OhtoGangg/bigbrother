const { Events, Client } = require("discord.js");
const allowlist = require("../../Functions/allowlist");

module.exports = {
    name: Events.InteractionCreate,
    /**
     * @param {nteractionCreate} interaction 
     * @param {Client} client
     */
    async execute(interaction, client) {
        if(!interaction.isButton()) return

        try {
        // --- Allowlist napin painallus ---
        if (interaction.customId === 'create_allowlist') {
            console.log("✅ Allowlist nappi painettu!");
            await allowlist.showAllowlistModal(interaction);
            return;
        }

        // --- Allowlist modal submit ---
        if (interaction.customId === 'allowlist_modal') {
            console.log("✅ Allowlist modal submit!");
            await allowlist.handleModalSubmit(interaction);
            return;
        }

        } catch (err) {
            console.error("Error handleInteraction (interactionCreate):", err);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Tapahtui virhe interaktiossa.', ephemeral: true });
            }
        }

    }
}
