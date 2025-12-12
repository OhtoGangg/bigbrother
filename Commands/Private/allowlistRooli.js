const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("allowlist")
        .setDescription("Lisää jäsenelle allowlist-rooli ja poista al-haastattelu rooli.")
        .addUserOption(option =>
            option.setName("jäsen")
                  .setDescription("Valitse jäsen, jolle rooli annetaan")
                  .setRequired(true)
        ),
    async execute(interaction) {
        const suorittaja = interaction.member;

        // --- Tarkista että suorittajalla on roleYllapito tai roleValvoja ---
        if (
            !suorittaja.roles.cache.has(config.ticket.roleYllapito) &&
            !suorittaja.roles.cache.has(config.ticket.roleValvoja)
        ) {
            return interaction.reply({ content: "❌ Sinulla ei ole oikeuksia käyttää tätä komentoa.", ephemeral: true });
        }

        const member = interaction.options.getMember("jäsen");
        if (!member) {
            return interaction.reply({ content: "❌ Jäsentä ei löytynyt.", ephemeral: true });
        }

        const roleAllowlist = interaction.guild.roles.cache.get(config.roles.roleAllowlist);
        const roleAlHaastattelu = interaction.guild.roles.cache.get(config.roles.roleAlHaastattelu);

        if (!roleAllowlist || !roleAlHaastattelu) {
            return interaction.reply({ content: "❌ Roolit eivät ole kunnossa configissa.", ephemeral: true });
        }

        try {
            // --- Poista al-haastattelu ja lisää allowlist ---
            await member.roles.remove(roleAlHaastattelu);
            await member.roles.add(roleAllowlist);

            // --- Lähetä embed log-kanavalle ---
            const logChannel = interaction.guild.channels.cache.get(config.channels.logChannel);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle("👥 Roolit vaihdettu")
                    .setColor("Green")
                    .setDescription(`Jäsen: ${member} roolit vaihdettu!`)
                    .addFields(
                        { name: "Entinen rooli", value: `<@&${config.roles.roleAlHaastattelu}>`, inline: true },
                        { name: "Uusi rooli", value: `<@&${config.roles.roleAllowlist}>`, inline: true },
                        { name: "Jäsen ID", value: member.id, inline: true },
                        { name: "Suorittaja", value: suorittaja.user.tag, inline: true },
                    )
                    .setThumbnail(member.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                await logChannel.send({ embeds: [embed] });
            }

            await interaction.reply({ content: `✅ ${member} sai allowlist-roolin ja al-haastattelu-rooli poistettu.`, ephemeral: true });

        } catch (err) {
            console.error("❌ Virhe allowlistRooli-komennossa:", err);
            return interaction.reply({ content: "❌ Tapahtui virhe roolien vaihdossa.", ephemeral: true });
        }
    }
};
