const { EmbedBuilder } = require('discord.js');
const path = require('path');
const config = require(path.resolve(__dirname, "../config.json"));

const WATCHLIST_CHANNEL_ID = config.channels.watchlistChannel;
const ALERT_CHANNEL_ID = config.channels.alertChannel;
const GUILD_ID = config.guildID;

let watchlist = new Set();
let alreadyAlerted = new Set();

module.exports = (client) => {

    async function sendAlert(member, matchedWord) {
        try {
            const channel = await client.channels.fetch(ALERT_CHANNEL_ID);
            if (!channel) return console.error("❌ Alert-kanavaa ei löytynyt!");
            const embed = new EmbedBuilder()
                .setTitle("📢 Watchlist BINGO!")
                .setColor(0xFF0000)
                .setDescription("Jäsen vastaa mustalla listalla olevaa tietoa")
                .addFields(
                    { name: "👤 Käyttäjä:", value: `${member.user.tag} (ID: ${member.id})` },
                    { name: "🔍 Nimi löytyy listasta:", value: matchedWord }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp();
            await channel.send({ embeds: [embed] });
            console.log(`🚨 Alertti lähetetty: ${member.user.tag} -> ${matchedWord}`);
        } catch (err) {
            console.error("❌ Error alertin lähetyksessä:", err);
        }
    }

    async function checkMemberAgainstWatchlist(member) {
        if (!member?.user) return;
        const username = member.user.username.toLowerCase();
        const tag = member.user.tag.toLowerCase();
        const id = member.id;

        for (const entry of watchlist) {
            const key = `${id}-${entry}`;
            if (alreadyAlerted.has(key)) continue;

            if (entry.includes(id) || entry.includes(username) || entry.includes(tag)) {
                console.log(`⚠️ ${member.user.tag} vastaa watchlistia: ${entry}`);
                await sendAlert(member, entry);
                alreadyAlerted.add(key);
            }
        }
    }

    async function scanWatchlist() {
        try {
            const channel = await client.channels.fetch(WATCHLIST_CHANNEL_ID);
            if (!channel) return console.error("❌ Watchlist-kanavaa ei löytynyt!");
            const messages = await channel.messages.fetch({ limit: 100 });
            watchlist.clear();
            for (const msg of messages.values()) {
                const cleaned = msg.content.trim().toLowerCase();
                if (cleaned) watchlist.add(cleaned);
            }
            console.log(`👁️ Watchlist päivitetty: ${watchlist.size} merkintää`);
        } catch (err) {
            console.error("❌ Error scanning watchlist:", err);
        }
    }

    async function startWatching() {
        console.log("👁️ Aloitetaan watchlist-tarkkailu...");

        try {
            const guild = await client.guilds.fetch(GUILD_ID);
            console.log(`✅ Guild haettu: ${guild.name}`);

            await guild.members.fetch();
            console.log(`✅ Jäseniä ladattu: ${guild.memberCount}`);

            // Skannaa watchlist-kanava
            await scanWatchlist();

            // Tarkista kaikki jäsenet heti
            guild.members.cache.forEach(member => checkMemberAgainstWatchlist(member));

            // Event: uusi jäsen
            client.on("guildMemberAdd", async (member) => {
                console.log(`➕ Uusi jäsen liittyi: ${member.user.tag}`);
                await checkMemberAgainstWatchlist(member);
            });

            // Event: uusi viesti watchlist-kanavalla
            client.on("messageCreate", async (message) => {
                if (message.channel.id !== WATCHLIST_CHANNEL_ID || message.author.bot) return;

                const cleaned = message.content.trim().toLowerCase();
                if (!cleaned) return;

                watchlist.add(cleaned);
                console.log(`➕ Uusi watchlist-merkintä lisätty: "${cleaned}"`);

                guild.members.cache.forEach(member => checkMemberAgainstWatchlist(member));
            });

            console.log("✅ Watchlist-tarkkailu käynnistetty!");
        } catch (err) {
            console.error("❌ Watchlist startWatching epäonnistui:", err);
        }
    }

    return {
        startWatching,
        scanWatchlist,
        checkMemberAgainstWatchlist
    };
};