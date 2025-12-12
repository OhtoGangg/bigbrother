const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("allowlist")
        .setDescription("Manuaalisesti hyväksy tai hylkää allowlist-hakemus")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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
        const guild = interaction.guild;
        const member = interaction.member;

        // Tarkista roolit
        const yllapitoRole = config.ticket.roleYllapito;
        const valvojaRole = config.ticket.roleValvoja;

        if (!member.roles.cache.has(yllapitoRole) && !member.roles.cache.has(valvojaRole)) {
            return interaction.reply({ content: "❌ Sinulla ei ole oikeuksia käyttää tätä komentoa.", ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const applicant = interaction.options.getUser("hakija");
        const messageId = interaction.options.getString("viestiid");
        const applicantMember = guild.members.cache.get(applicant.id);

        let embed;
        let upvotes = null;
        let downvotes = null;

        // Haetaan alkuperäinen viesti ja äänet, jos viesti-ID annettu
        if (messageId) {
            const channel = guild.channels.cache.get(config.channels.allowlistChannel);
            if (!channel) return interaction.reply({ content: "Allowlist-kanavaa ei löytynyt.", ephemeral: true });

            try {
                const msg = await channel.messages.fetch(messageId);
                embed = msg.embeds[0];
                
                // Hae äänestystulokset
                const upvoteEmoji = "👍";
                const downvoteEmoji = "👎";
                upvotes = msg.reactions.cache.get(upvoteEmoji)?.count - 1 || 0;
                downvotes = msg.reactions.cache.get(downvoteEmoji)?.count - 1 || 0;

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

        // Lisää äänestystulos, jos saatavilla
        if (upvotes !== null && downvotes !== null) {
            embed.addFields({ name: "Äänestystulos", value: `👍 ${upvotes}, 👎 ${downvotes}` });
        }

        if (subcommand === "hyväksy") {
            embed.setTitle("✅ Hakemus hyväksytty");

            const hyvaksytyt = guild.channels.cache.get(config.channels.hyvaksytytChannel);
            if (!hyvaksytyt) return interaction.reply({ content: "Hyväksytty-kanavaa ei löytynyt.", ephemeral: true });
            await hyvaksytyt.send({ embeds: [embed] });

            try {
                await applicant.send("🎉 Onnea, hakemuksesi on hyväksytty! Seuraavaksi pääset odottamaan haastattelua.");
            } catch {
                console.warn(`⚠️ Ei voitu lähettää DM hakijalle ${applicant.tag}`);
            }

            const role = guild.roles.cache.get(config.roles.roleAlHaastattelu);
            if (applicantMember && role && !applicantMember.roles.cache.has(role.id)) {
                await applicantMember.roles.add(role);
            }

            await interaction.reply({ content: `✅ Hakemus hyväksytty: ${applicant.tag}`, ephemeral: true });

        } else if (subcommand === "hylkää") {
            embed.setTitle("❌ Hakemus hylätty");

            const hylatyt = guild.channels.cache.get(config.channels.hylatytChannel);
            if (!hylatyt) return interaction.reply({ content: "Hylätty-kanavaa ei löytynyt.", ephemeral: true });
            await hylatyt.send({ embeds: [embed] });

            try {
                await applicant.send("❌ Hakemuksesi on tällä kertaa hylätty... Kokeile onneasi uudelleen!");
            } catch {
                console.warn(`⚠️ Ei voitu lähettää DM hakijalle ${applicant.tag}`);
            }

            await interaction.reply({ content: `❌ Hakemus hylätty: ${applicant.tag}`, ephemeral: true });

        } else {
            await interaction.reply({ content: "❌ Tuntematon komento.", ephemeral: true });
        }
    }
};
