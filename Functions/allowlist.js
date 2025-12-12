const { 
    EmbedBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ActionRowBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    InteractionResponseFlags
} = require('discord.js');
const config = require('../config.json');

module.exports = {
    // --- Lähetä allowlist panel ---
    async sendAllowlistPanel(channel) {
        console.log("[DEBUG] sendAllowlistPanel kutsuttu");
        const embed = new EmbedBuilder()
            .setTitle('Hae allowlistiä palvelimellemme!')
            .setDescription('Paina nappia ja täytä hakemuslomake.')
            .setColor('Blue');

        const button = new ButtonBuilder()
            .setCustomId('create_allowlist')
            .setLabel('Hae allowlistiä')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        const sentMessage = await channel.send({ embeds: [embed], components: [row] });
        console.log("[DEBUG] Allowlist panel lähetetty:", sentMessage.id);
    },

    // --- Interaction handler ---
    async handleInteraction(interaction) {
        console.log("[DEBUG] handleInteraction kutsuttu:", interaction.type);

        try {
            if (interaction.isButton() && interaction.customId === 'create_allowlist') {
                console.log("[DEBUG] Napin painallus havaittu, avataan modal...");
                await module.exports.showAllowlistModal(interaction);
                return;
            }

            if (interaction.isModalSubmit() && interaction.customId === 'allowlist_modal') {
                console.log("[DEBUG] Modal submit havaittu, käsitellään hakemus...");
                await module.exports.handleModalSubmit(interaction);
                return;
            }

        } catch (err) {
            console.error('[ERROR] Virhe handleInteractionissa:', err);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Tapahtui virhe interaktiossa.', flags: InteractionResponseFlags.Ephemeral });
            }
        }
    },

    // --- Modal ---
    async showAllowlistModal(interaction) {
        console.log("[DEBUG] showAllowlistModal kutsuttu");

        const modal = new ModalBuilder()
            .setCustomId('allowlist_modal')
            .setTitle('Allowlist Hakemus');

        const inputs = [
            { id: 'realAge', label: 'IRL-ikä?', style: TextInputStyle.Short },
            { id: 'experience', label: 'Kokemuksesi roolipelaamisesta?', style: TextInputStyle.Paragraph },
            { id: 'aboutYou', label: 'Kerro itsestäsi roolipelaajana?', style: TextInputStyle.Paragraph },
            { id: 'character', label: 'Kerro tulevasta hahmostasi?', style: TextInputStyle.Paragraph }
        ];

        const rows = inputs.map(input =>
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId(input.id)
                    .setLabel(input.label)
                    .setStyle(input.style)
                    .setRequired(true)
            )
        );

        modal.addComponents(...rows);

        await interaction.showModal(modal);
    },

    // --- Modal submit ---
    async handleModalSubmit(interaction) {
        console.log("[DEBUG] handleModalSubmit kutsuttu:", interaction.user.tag);

        const realAge = interaction.fields.getTextInputValue('realAge');
        const experience = interaction.fields.getTextInputValue('experience');
        const aboutYou = interaction.fields.getTextInputValue('aboutYou');
        const character = interaction.fields.getTextInputValue('character');

        // --- Lähetä DM ---
        try {
            await interaction.user.send('✅ Hakemuksesi on otettu vastaan. Henkilökunta käsittelee tämän pian!');
        } catch (err) {
            console.error("[WARN] DM ei onnistunut:", err);
        }

        // --- Kanava ---
        const allowlistChannel = interaction.guild.channels.cache.get(config.channels.allowlistChannel);
        if (!allowlistChannel) {
            if (!interaction.replied) {
                await interaction.reply({ content: '❌ Virhe: Allowlist-kanavaa ei löydy.', flags: InteractionResponseFlags.Ephemeral });
            }
            return;
        }

        // --- Embed ---
        const embed = new EmbedBuilder()
            .setTitle('Uusi Allowlist-hakemus')
            .setColor('Green')
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
            .addFields(
                { name: 'IRL-ikä', value: realAge },
                { name: 'Kokemus roolipelaamisesta', value: experience },
                { name: 'Itsestäsi roolipelaajana', value: aboutYou },
                { name: 'Tuleva hahmo', value: character },
            )
            .setFooter({ text: `Hakija: ${interaction.user.id}` })
            .setTimestamp();

        try {
            const sentMessage = await allowlistChannel.send({ embeds: [embed] });

            await sentMessage.react('👍');
            await sentMessage.react('👎');

            if (!interaction.replied) {
                await interaction.reply({ content: '✅ Hakemus lähetetty onnistuneesti!', flags: InteractionResponseFlags.Ephemeral });
            }
        } catch (err) {
            console.error("[ERROR] Hakemuksen lähetys epäonnistui:", err);
            if (!interaction.replied) {
                await interaction.reply({ content: '❌ Hakemuksen lähetys epäonnistui.', flags: InteractionResponseFlags.Ephemeral });
            }
        }
    }
};
