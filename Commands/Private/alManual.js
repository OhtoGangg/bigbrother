const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("hakemus")
        .setDescription("Manuaalisesti hyväksy tai hylkää allowlist-hakemus")
        .addSubcommand(sub =>
            sub
                .setName("hyväksy")
                .setDescription("Hyväksy hakemus")
                .addUserOption(option =>
                    option.setName("hakija")
                        .setDescription("Henkilö, jonka hakemus hyväksytään")
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName("viestiid")
                        .setDescription("Alkuperäisen hakemusviestin ID (valinnainen)")
                        .setRequired(false))
        )
        .addSubcommand(sub =>
            sub
                .setName("hylkää")
                .setDescription("Hylkää hakemus")
                .addUserOption(option =>
                    option.setName("hakija")
                        .setDescription("Henkilö, jonka hakemus hylätään")
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName("viestiid")
                        .setDescription("Alkuperäisen hakemusviestin ID (valinnainen)")
                        .setRequired(false))
        ),

    async execute(interaction) {
        const member = interaction.member;
        const subcommand = interaction.options.getSubcommand();
        const applicant = interaction.options.getUser("hakija");
        const messageId = interaction.options.getString("viestiid");
        const applicantMember = interaction.guild.members.cache.get(applicant.id);
        const guild = interaction.guild;
        const logChannel = guild.channels.cache.get(config.channels.logChannel);

        const yllapito = config.ticket.roleYllapito;
        const valvoja = config.ticket.roleValvoja;

        // --- Tarkista oikeudet ---
        if (!member.roles.cache.has(yllapito) && !member.roles.cache.has(valvoja)) {
            console.log(`[DENIED] ${member.user.tag} yritti käyttää /hakemus ${subcommand}`);
            return interaction.reply({ content: "❌ Sinulla ei ole oikeuksia käyttää tätä komentoa.", ephemeral: true });
        }

        console.log(`[DEBUG] /hakemus ${subcommand} suoritetaan`);
        console.log(`➡️ Tekijä: ${member.user.tag}`);
        console.log(`➡️ Kohde: ${applicant.tag}`);
        console.log(`➡️ ViestiID: ${messageId || "Ei annettu"}`);

        // --- Haetaan alkuperäinen embed viestistä, jos annettu ---
        let embed;
        let upvotes = null;
        let downvotes = null;

        if (messageId) {
            const channel = guild.channels.cache.get(config.channels.allowlistChannel);
            if (!channel) return interaction.reply({ content: "❌ Allowlist-kanavaa ei löytynyt.", ephemeral: true });

            try {
                const msg = await channel.messages.fetch(messageId);
                embed = msg.embeds[0];
                upvotes = msg.reactions.cache.get("👍")?.count - 1 || 0;
                downvotes = msg.reactions.cache.get("👎")?.count - 1 || 0;
                console.log(`[DEBUG] Haettu viesti-ID ${messageId}. Upvotes: ${upvotes}, Downvotes: ${downvotes}`);
            } catch (err) {
                console.log(`[ERROR] Viestiä ei löytynyt: ${err}`);
                return interaction.reply({ content: "❌ Viestiä ei löytynyt allowlist-kanavasta.", ephemeral: true });
            }
        }

        if (!embed) {
            embed = new EmbedBuilder()
                .setAuthor({ name: applicant.tag, iconURL: applicant.displayAvatarURL() })
                .setTimestamp();
            console.log("[DEBUG] Luotiin uusi embed ilman alkuperäistä viestiä.");
        } else {
            embed = EmbedBuilder.from(embed);
        }

        if (upvotes !== null && downvotes !== null) {
            embed.addFields({ name: "Äänestystulos", value: `👍 ${upvotes}\n👎 ${downvotes}` });
        }

        // --- Toiminto ---
        if (subcommand === "hyväksy") {
            embed.setTitle("✅ Hakemus hyväksytty");

            // Hyväksytyt-kanava
            const hyvaksytyt = guild.channels.cache.get(config.channels.hyvaksytytChannel);
            if (hyvaksytyt) await hyvaksytyt.send({ embeds: [embed] });

            // Anna AL-haastattelu-rooli
            const role = guild.roles.cache.get(config.roles.roleAlHaastattelu);
            if (applicantMember && role && !applicantMember.roles.cache.has(role.id)) {
                await applicantMember.roles.add(role);
            }

            // Logikanava
            if (logChannel) {
                await logChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("📗 Manuaalinen hyväksyntä")
                            .addFields(
                                { name: "Hyväksyjä", value: `${member.user.tag} (${member.id})` },
                                { name: "Hakija", value: `${applicant.tag} (${applicant.id})` },
                                { name: "Viesti-ID", value: messageId || "Ei annettu" },
                                { name: "Aika", value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
                            )
                            .setColor("Green")
                    ]
                });
            }

            console.log(`[SUCCESS] ${member.user.tag} hyväksyi hakemuksen: ${applicant.tag}`);
            return interaction.reply({ content: `✅ Hakemus hyväksytty: **${applicant.tag}**`, ephemeral: true });

        } else if (subcommand === "hylkää") {
            embed.setTitle("❌ Hakemus hylätty");

            // Hylätyt-kanava
            const hylatyt = guild.channels.cache.get(config.channels.hylatytChannel);
            if (hylatyt) await hylatyt.send({ embeds: [embed] });

            // Logikanava
            if (logChannel) {
                await logChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("📕 Manuaalinen hylkäys")
                            .addFields(
                                { name: "Hylkääjä", value: `${member.user.tag} (${member.id})` },
                                { name: "Hakija", value: `${applicant.tag} (${applicant.id})` },
                                { name: "Viesti-ID", value: messageId || "Ei annettu" },
                                { name: "Aika", value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
                            )
                            .setColor("Red")
                    ]
                });
            }

            console.log(`[SUCCESS] ${member.user.tag} hylkäsi hakemuksen: ${applicant.tag}`);
            return interaction.reply({ content: `❌ Hakemus hylätty: **${applicant.tag}**`, ephemeral: true });
        }
    }
};
