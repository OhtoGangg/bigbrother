const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config.json");

// Exportataan kaksi komentoa
module.exports = {

    hyväksy: {
        data: new SlashCommandBuilder()
            .setName("hyväksy")
            .setDescription("Hyväksy allowlist-hakemus manuaalisesti")
            .addUserOption(option =>
                option.setName("hakija")
                    .setDescription("Henkilö, jonka hakemus hyväksytään")
                    .setRequired(true))
            .addStringOption(option =>
                option.setName("viestiid")
                    .setDescription("Alkuperäisen hakemusviestin ID (valinnainen)")
                    .setRequired(false))
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

        async execute(interaction) {
            await handleAllowlist(interaction, "hyväksy");
        }
    },

    hylkää: {
        data: new SlashCommandBuilder()
            .setName("hylkää")
            .setDescription("Hylkää allowlist-hakemus manuaalisesti")
            .addUserOption(option =>
                option.setName("hakija")
                    .setDescription("Henkilö, jonka hakemus hylätään")
                    .setRequired(true))
            .addStringOption(option =>
                option.setName("viestiid")
                    .setDescription("Alkuperäisen hakemusviestin ID (valinnainen)")
                    .setRequired(false))
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

        async execute(interaction) {
            await handleAllowlist(interaction, "hylkää");
        }
    }
};



// =======================================================
//   YHTEINEN KÄSITTELIJÄ
// =======================================================

async function handleAllowlist(interaction, action) {

    const guild = interaction.guild;
    const member = interaction.member;
    const logChannel = guild.channels.cache.get(config.channels.logChannel);

    const applicant = interaction.options.getUser("hakija");
    const messageId = interaction.options.getString("viestiid");
    const applicantMember = guild.members.cache.get(applicant.id);

    const yllapito = config.ticket.roleYllapito;
    const valvoja = config.ticket.roleValvoja;

    // --------------------------------------------------
    // Tarkista roolit
    // --------------------------------------------------
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

    // --------------------------------------------------
    // Haetaan alkuperäinen viesti jos messageId on annettu
    // --------------------------------------------------
    if (messageId) {
        const channel = guild.channels.cache.get(config.channels.allowlistChannel);

        if (!channel)
            return interaction.reply({ content: "❌ Allowlist-kanavaa ei löytynyt.", ephemeral: true });

        try {
            const msg = await channel.messages.fetch(messageId);
            embed = msg.embeds[0];

            upvotes = msg.reactions.cache.get("👍")?.count - 1 || 0;
            downvotes = msg.reactions.cache.get("👎")?.count - 1 || 0;

            console.log(`[DEBUG] Haettu viesti-ID ${messageId}. Upvotes: ${upvotes}, Downvotes: ${downvotes}`);

        } catch (err) {
            console.log(`[ERROR] Virhe haettaessa viestiä: ${err}`);
            return interaction.reply({ content: "❌ Viestiä ei löytynyt allowlist-kanavasta.", ephemeral: true });
        }
    }

    // --------------------------------------------------
    // Jos ei ollut embed-dataa, luodaan uusi
    // --------------------------------------------------
    if (!embed) {
        embed = new EmbedBuilder()
            .setAuthor({ name: applicant.tag, iconURL: applicant.displayAvatarURL() })
            .setTimestamp();

        console.log("[DEBUG] Luotiin uusi embed ilman alkuperäistä viestiä.");
    } else {
        embed = EmbedBuilder.from(embed);
    }

    // Lisää äänestystulos
    if (upvotes !== null && downvotes !== null) {
        embed.addFields({
            name: "Äänestystulos",
            value: `👍 ${upvotes}\n👎 ${downvotes}`
        });
    }

    // ======================================================
    //   HYVÄKSY
    // ======================================================
    if (action === "hyväksy") {

        embed.setTitle("✅ Hakemus hyväksytty");

        const hyvaksytyt = guild.channels.cache.get(config.channels.hyvaksytytChannel);
        if (!hyvaksytyt)
            return interaction.reply({ content: "❌ Hyväksytyt-kanavaa ei löytynyt.", ephemeral: true });

        await hyvaksytyt.send({ embeds: [embed] });

        // Lähetä DM hakijalle
        try {
            await applicant.send("🎉 Onnea! Hakemuksesi on hyväksytty.");
        } catch (err) {
            console.log(`[WARN] Ei voitu lähettää DM hakijalle (${applicant.tag})`);
        }

        // Anna haastattelurooli
        const role = guild.roles.cache.get(config.roles.roleAlHaastattelu);
        if (applicantMember && role && !applicantMember.roles.cache.has(role.id)) {
            await applicantMember.roles.add(role);
        }

        // Logi
        if (logChannel) {
            await logChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("📗 Manuaalinen hyväksyntä")
                        .addFields(
                            { name: "Käsittelijä", value: `${member.user.tag} (${member.id})` },
                            { name: "Hakija", value: `${applicant.tag} (${applicant.id})` },
                            { name: "Viesti-ID", value: messageId || "Ei annettu" },
                            { name: "Aika", value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
                        )
                        .setColor("Green")
                ]
            });
        }

        console.log(`[SUCCESS] ${member.user.tag} hyväksyi hakemuksen: ${applicant.tag}`);

        return interaction.reply({
            content: `✅ Hakemus hyväksytty: **${applicant.tag}**`,
            ephemeral: true
        });
    }


    // ======================================================
    //   HYLKÄÄ
    // ======================================================
    if (action === "hylkää") {

        embed.setTitle("❌ Hakemus hylätty");

        const hylatyt = guild.channels.cache.get(config.channels.hylatytChannel);
        if (!hylatyt)
            return interaction.reply({ content: "❌ Hylätyt-kanavaa ei löytynyt.", ephemeral: true });

        await hylatyt.send({ embeds: [embed] });

        // Logi
        if (logChannel) {
            await logChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("📕 Manuaalinen hylkäys")
                        .addFields(
                            { name: "Käsittelijä", value: `${member.user.tag} (${member.id})` },
                            { name: "Hakija", value: `${applicant.tag} (${applicant.id})` },
                            { name: "Viesti-ID", value: messageId || "Ei annettu" },
                            { name: "Aika", value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
                        )
                        .setColor("Red")
                ]
            });
        }

        console.log(`[SUCCESS] ${member.user.tag} hylkäsi hakemuksen: ${applicant.tag}`);

        return interaction.reply({
            content: `❌ Hakemus hylätty: **${applicant.tag}**`,
            ephemeral: true
        });
    }
}
