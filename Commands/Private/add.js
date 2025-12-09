const { SlashCommandBuilder } = require("discord.js");
const ticket = require("../../Functions/ticket");
const config = require("../../config.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("lisää")
        .setDescription("Lisää käyttäjä ticketiin")
        .addUserOption(option => 
            option.setName("käyttäjä")
                  .setDescription("Käyttäjä lisättäväksi ticketiin")
                  .setRequired(true)
        ),
    
    async execute(interaction) {
        const member = interaction.options.getMember("käyttäjä");

        if (!member) {
            return interaction.reply({ content: "Käyttäjää ei löytynyt.", flags: 64 });
        }

        // Roolit configista OIKEASTA polusta
        const allowedRoles = [
            config.ticket.roleYllapito,
            config.ticket.roleValvoja
        ];

        // Debug (näkyy vain consoleen)
        console.log("Käyttäjän roolit:", interaction.member.roles.cache.map(r => r.id));
        console.log("Sallitut roolit:", allowedRoles);

        const hasRole = interaction.member.roles.cache.some(role => allowedRoles.includes(role.id));

        if (!hasRole) {
            return interaction.reply({ content: "Sinulla ei ole lupaa käyttää tätä komentoa.", flags: 64 });
        }

        try {
            await ticket.addMember(interaction, member);
        } catch (err) {
            console.error("Virhe lisää-komennossa:", err);
            interaction.reply({ content: "Tapahtui virhe käyttäjän lisäämisessä.", flags: 64 });
        }
    }
}
