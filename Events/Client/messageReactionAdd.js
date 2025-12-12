const { Events, EmbedBuilder } = require("discord.js");
const config = require("../../config.json");

module.exports = {
    name: Events.MessageReactionAdd,
    /**
     * @param {MessageReaction} reaction 
     * @param {User} user
     */
    async execute(reaction, user) {
        if (user.bot) return;

        // --- Hae täydellinen viesti jos partial ---
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (err) {
                console.error("❌ Error fetching reaction:", err);
                return;
            }
        }

        // --- Tarkista oikea kanava ---
        if (reaction.message.channel.id !== config.channels.allowlistChannel) return;

        // --- Emoji määritykset ---
        const upvote = "👍";
        const downvote = "👎";
        const upvotecount = reaction.message.reactions.cache.get(upvote)?.count - 1 || 0;
        const downvotecount = reaction.message.reactions.cache.get(downvote)?.count - 1 || 0;
        const totalvotecount = upvotecount + downvotecount;

        console.log(`🗳️ Hakemus ${reaction.message.id} saanut uuden reaktion (${reaction.emoji.name}) käyttäjältä ${user.tag}`);
        console.log(`📊 Upvote: ${upvotecount}, Downvote: ${downvotecount}, Total: ${totalvotecount}`);

        // --- Päätös, kun ääniä vähintään 3 ---
        if (totalvotecount >= 3) {
            const guild = reaction.message.guild;
            const embed = reaction.message.embeds[0];
            if (!embed || !embed.footer) return console.warn("⚠️ Viestissä ei embedia tai footeria");

            const applicantId = embed.footer.text.split("Hakija: ")[1];
            const applicant = guild.members.cache.get(applicantId);
            if (!applicant) return console.warn("⚠️ Hakijaa ei löytynyt guildista");

            // --- Luo tulosembed ---
            const resultEmbed = EmbedBuilder.from(embed)
                .setTitle(upvotecount > downvotecount ? "✅ Hakemus hyväksytty" : "❌ Hakemus hylätty")
                .addFields({ name: "Äänestystulos", value: `👍 ${upvotecount}, 👎 ${downvotecount}` })
                .setTimestamp();

            if (upvotecount > downvotecount) {
                // --- Hyväksy ---
                const hyvaksytyt = guild.channels.cache.get(config.channels.hyvaksytytChannel);
                if (hyvaksytyt) await hyvaksytyt.send({ embeds: [resultEmbed] });

                try {
                    await applicant.send("🎉 Onnittelut, hakemuksesi on hyväksytty! Seuraavaksi pääset odottamaan haastattelua.");
                } catch {
                    console.warn(`⚠️ Ei voitu lähettää DM hakijalle ${applicant.user.tag}`);
                }

                // --- Anna AL-haastattelu-rooli ---
                const interviewRole = guild.roles.cache.get(config.roles.roleAlHaastattelu);
                if (interviewRole && !applicant.roles.cache.has(interviewRole.id)) {
                    await applicant.roles.add(interviewRole);
                }

                console.log(`✅ Hakemus hyväksytty: ${applicant.user.tag}`);

            } else {
                // --- Hylkää ---
                const hylatyt = guild.channels.cache.get(config.channels.hylatytChannel);
                if (hylatyt) await hylatyt.send({ embeds: [resultEmbed] });

                try {
                    await applicant.send("❌ Pahoittelut, tällä kertaa hakemuksesi ei mennyt läpi.");
                } catch {
                    console.warn(`⚠️ Ei voitu lähettää DM hakijalle ${applicant.user.tag}`);
                }

                console.log(`❌ Hakemus hylätty: ${applicant.user.tag}`);
            }

            // --- Poista alkuperäinen viesti ---
            await reaction.message.delete().catch(() => {});
            console.log(`🗑️ Alkuperäinen hakemusviesti poistettu: ${reaction.message.id}`);
        }
    }
};
