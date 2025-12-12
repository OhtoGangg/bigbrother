const { Events } = require("discord.js");
const allowlist = require("../../Functions/allowlist");

module.exports = {
    name: Events.InteractionCreate,
    /**
     * @param {import("discord.js").Interaction} interaction 
     * @param {import("discord.js").Client} client
     */
    async execute(interaction, client) {
        try {
            // --- Napit ---
            if (interaction.isButton()) {
                if (interaction.customId === 'create_allowlist') {
                    console.log("✅ Allowlist nappi painettu!");
                    await allowlist.showAllowlistModal(interaction);
                    return;
                }
            }

            // --- Modal submit ---
            if (interaction.isModalSubmit()) {
                if (interaction.customId === 'allowlist_modal') {
                    console.log("✅ Allowlist modal submit!");
                    await allowlist.handleModalSubmit(interaction);
                    return;
                }
            }

        } catch (err) {
            console.error("Error handleInteraction (interactionCreate):", err);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Tapahtui virhe interaktiossa.', ephemeral: true });
            }
        }
    }
};
