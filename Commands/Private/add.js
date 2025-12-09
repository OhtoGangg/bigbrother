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
        const memberToAdd = interaction.options.getMember("käyttäjä");

        if (!memberToAdd) {
            return interaction.reply({ content: "Käyttäjää ei löytynyt.", ephemeral: true });
        }

        // Roolitarkistus
        const allowedRoles = [
            config.ticket.roleYllapito,
            config.ticket.roleValvoja
        ];

        const guildMember = interaction.guild.members.cache.get(interaction.user.id);

        const hasRole = guildMember.roles.cache.some(role => allowedRoles.includes(role.id));
        if (!hasRole) {
            return interaction.reply({ content: "Sinulla ei ole lupaa käyttää tätä komentoa.", ephemeral: true });
        }

        // Lisää jäsen ticket-kanavaan
        try {
            await ticket.addMember(interaction, memberToAdd);
        } catch (err) {
            console.error("Virhe lisää-komennossa:", err);
            interaction.reply({ content: "Tapahtui virhe käyttäjän lisäämisessä.", ephemeral: true });
        }
    }
};
