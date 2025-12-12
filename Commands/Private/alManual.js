const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("allowlist")
        .setDescription("Manuaalisesti hyväksy tai hylkää allowlist-hakemus")
        .addSubcommand(subcommand =>
            subcommand
                .setName("hyväksy")
                .setDescription("Hyväksy hakemus")
                .addUserOption(option =>
                    option.setName("hakija")
                          .setDescription("Henkilö, jonka hakemus hyväksytään")
                          .setRequired(true))
                .addStringOption(option =>
                    option.setName("viestiid")
                          .setDescription("Alkuperäisen hakemusviestin ID (valinnainen)")
                          .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName("hylkää")
                .setDescription("Hylkää hakemus")
                .addUserOption(option =>
                    option.setName("hakija")
                          .setDescription("Henkilö, jonka hakemus hylätään")
                          .setRequired(true))
                .addStringOption(option =>
                    option.setName("viestiid")
                          .setDescription("Alkuperäisen hakemusviestin ID (valinnainen)")
                          .setRequired(false))),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const applicant = interaction.options.getUser("hakija");
        const messageId = interaction.options.getString("viestiid");
        const guild = interaction.guild;
        const member = guild.members.cache.get(applicant.id);

        let embed;

        // Haetaan alkuperäinen embed, jos viesti-ID annettu
        if (messageId) {
            const channel = guild.channels.cache.get(config.channels.allowlistChannel);
            if (!channel) return interaction.reply({ content: "Allowlist-kanavaa ei löytynyt.", ephemeral: true });

            try {
                const msg = await channel.messages.fetch(messageId);
                embed = msg.embeds[0];
            } catch {
                return interaction.reply({ content: "Viestiä ei löytynyt allowlist-kanavasta.", ephemeral: true });
            }
        }

        if (!embed) {
            embed = new EmbedBuilder()
                .setAuthor({ name: applicant.tag, iconURL: applicant.displayAvatarURL() })
                .setTimestamp();
        } else {
            embed = EmbedBuilder.from(embed);
        }

        if (subcommand === "hyväksy") {
            embed.setTitle("✅ Hakemus hyväksytty");

            const hyvaksytyt = guild.channels.cache.get(config.channels.hyvaksytytChannel);
            if (!hyvaksytyt) return interaction.reply({ content: "Hyväksytty-kanavaa ei löytynyt.", ephemeral: true });
            await hyvaksytyt.send({ embeds: [embed] });

            try {
                await applicant.send("🎉 Hakemuksesi on hyväksytty manuaalisesti! Seuraavaksi pääset odottamaan haastattelua.");
            } catch {
                console.warn(`⚠️ Ei voitu lähettää DM hakijalle ${applicant.tag}`);
            }

            // Anna AL-haastattelu-rooli
            const role = guild.roles.cache.get(config.roles.roleAlHaastattelu);
            if (member && role && !member.roles.cache.has(role.id)) {
                await member.roles.add(role);
            }

            await interaction.reply({ content: `✅ Hakemus hyväksytty: ${applicant.tag}`, ephemeral: true });

        } else if (subcommand === "hylkää") {
            embed.setTitle("❌ Hakemus hylätty");

            const hylatyt = guild.channels.cache.get(config.channels.hylatytChannel);
            if (!hylatyt) return interaction.reply({ content: "Hylätty-kanavaa ei löytynyt.", ephemeral: true });
            await hylatyt.send({ embeds: [embed] });

            try {
                await applicant.send("❌ Hakemuksesi on hylätty manuaalisesti.");
            } catch {
                console.warn(`⚠️ Ei voitu lähettää DM hakijalle ${applicant.tag}`);
            }

            await interaction.reply({ content: `❌ Hakemus hylätty: ${applicant.tag}`, ephemeral: true });

        } else {
            await interaction.reply({ content: "❌ Tuntematon komento.", ephemeral: true });
        }
    }
};
