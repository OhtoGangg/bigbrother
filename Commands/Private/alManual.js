const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config.json");

module.exports = [
    {
        data: new SlashCommandBuilder()
            .setName("hyväksy")
            .setDescription("Hyväksy allowlist-hakemus manuaalisesti")
            .addUserOption(option =>
                option.setName("hakija")
                    .setDescription("Henkilö, jonka hakemus hyväksytään")
                    .setRequired(true))
            .addStringOption(option =>
                option.setName("viestiid")
                    .setDescription("Alkuperäisen hakemusviestin ID (valinnainen)"))
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

        async execute(interaction) {
            await handleAllowlist(interaction, "hyväksy");
        }
    },

    {
        data: new SlashCommandBuilder()
            .setName("hylkää")
            .setDescription("Hylkää allowlist-hakemus manuaalisesti")
            .addUserOption(option =>
                option.setName("hakija")
                    .setDescription("Henkilö, jonka hakemus hylätään")
                    .setRequired(true))
            .addStringOption(option =>
                option.setName("viestiid")
                    .setDescription("Alkuperäisen hakemusviestin ID (valinnainen)"))
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

        async execute(interaction) {
            await handleAllowlist(interaction, "hylkää");
        }
    }
];

// ------------------ YHTEINEN FUNKTIO ---------------------

async function handleAllowlist(interaction, action) {

    const guild = interaction.guild;
    const member = interaction.member;
    const logChannel = guild.channels.cache.get(config.channels.logChannel);

    const applicant = interaction.options.getUser("hakija");
    const messageId = interaction.options.getString("viestiid");
    const applicantMember = guild.members.cache.get(applicant.id);

    const yllapito = config.ticket.roleYllapito;
    const valvoja = config.ticket.roleValvoja;

    // 🔐 Tarkista roolien oikeudet
    if (!member.roles.cache.has(yllapito) && !member.roles.cache.has(valvoja)) {
        console.log(`[DENIED] ${member.user.tag} yritti käyttää /${action} ilman oikeuksia.`);

        return interaction.reply({
            content: "❌ Sinulla ei ole oikeuksia käyttää tätä komentoa.",
            ephemeral: true
        });
    }

    let embed;
    let upvotes = null;
    let downvotes = null;

    // 🔍 Jos viesti-ID annettu → lataa_allowlist-kanavalta
    if (messageId) {
        const channel = guild.channels.cache.get(config.channels.allowlistChannel);

        if (!channel)
            return interaction.reply({ content: "❌ Allowlist-kanavaa ei löytynyt.", ephemeral: true });

        try {
            const msg = await channel.messages.fetch(messageId);
            embed = msg.embeds[0];

            upvotes = msg.reactions.cache.get("👍")?.count - 1 || 0;
            downvotes = msg.reactions.cache.get("👎")?.count - 1 || 0;

            console.log(`[DEBUG] Haettu viesti ${messageId} 👍 ${upvotes} / 👎 ${downvotes}`);

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

    if (upvotes !== null)
        embed.addFields({ name: "Äänet", value: `👍 ${upvotes}\n👎 ${downvotes}` });

    // ---------------- HYVÄKSY ----------------
    if (action === "hyväksy") {

        embed.setTitle("✅ Hakemus hyväksytty");

        const hyväksytyt = guild.channels.cache.get(config.channels.hyvaksytytChannel);
        await hyväksytyt.send({ embeds: [embed] });

        const role = guild.roles.cache.get(config.roles.roleAlHaastattelu);
        if (role && applicantMember && !applicantMember.roles.cache.has(role.id)) {
            await applicantMember.roles.add(role);
        }

        // Logi
        if (logChannel) {
            await logChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("📗 Manuaalinen hyväksyntä")
                        .addFields(
                            { name: "Käsittelijä", value: `${member.user.tag}` },
                            { name: "Hakija", value: `${applicant.tag}` },
                            { name: "Viesti-ID", value: messageId || "Ei annettu" },
                            { name: "Aika", value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
                        )
                        .setColor("Green")
                ]
            });
        }

        console.log(`[SUCCESS] ${member.user.tag} hyväksyi: ${applicant.tag}`);

        return interaction.reply({
            content: `✅ Hakemus hyväksytty: **${applicant.tag}**`,
            ephemeral: true
        });
    }

    // ---------------- HYLKÄÄ ----------------
    if (action === "hylkää") {

        embed.setTitle("❌ Hakemus hylätty");

        const hylatyt = guild.channels.cache.get(config.channels.hylatytChannel);
        await hylatyt.send({ embeds: [embed] });

        if (logChannel) {
            await logChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("📕 Manuaalinen hylkäys")
                        .addFields(
                            { name: "Käsittelijä", value: `${member.user.tag}` },
                            { name: "Hakija", value: `${applicant.tag}` },
                            { name: "Viesti-ID", value: messageId || "Ei annettu" },
                            { name: "Aika", value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
                        )
                        .setColor("Red")
                ]
            });
        }

        console.log(`[SUCCESS] ${member.user.tag} hylkäsi: ${applicant.tag}`);

        return interaction.reply({
            content: `❌ Hakemus hylätty: **${applicant.tag}**`,
            ephemeral: true
        });
    }
}
