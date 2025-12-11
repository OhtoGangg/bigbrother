const config = require("../../config.json");

// Oletetaan, että watchlist-moduuli on saatavilla client.watchlist
// client.watchlist = watchlistModule; → asetetaan index.js:ssä readyssa

module.exports = {
    name: "guildMemberAdd",
    async execute(member) {
        const guild = member.guild;
        const client = member.client;

        // --- Welcome channel & role ---
        const welcomeChannel = client.channels.cache.get(config.channels.welcomeChannel);
        const welcomeRole = guild.roles.cache.get("1447942712970973245"); // halutessa voi laittaa configiin

        if (!welcomeChannel || !welcomeRole) {
            console.error("Welcome channel or role not found.");
        } else {
            await welcomeChannel.send(`${member} liittyi Discordiin. Tervetuloa palvelimelle!`);

            try {
                await member.roles.add(welcomeRole);
            } catch (error) {
                console.error("Error adding welcome role:", error);
            }
        }

        // --- Watchlist-tarkistus ---
        if (client.watchlist && typeof client.watchlist.checkMemberAgainstWatchlist === "function") {
            try {
                await client.watchlist.checkMemberAgainstWatchlist(member);
            } catch (err) {
                console.error("❌ Virhe watchlistin tarkistuksessa guildMemberAddissa:", err);
            }
        }
    }
};