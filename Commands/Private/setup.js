const ticketHandler = require("../Functions/ticket.js") // Täällä importoidaan kaikki funktiot ticket.js tiedostosta ticketHandler muuttujaan

const { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagBits, InteractionContextType, MessageFlags } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Lähettää tikettipaneelin nykyiselle kanavalle")
  .setDefaultMemberPermission(PermissionFlagBits.ManageGuild)
  .setContext(InteractionContextType.Guild),
  /**
   *
   *@param {ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'Sinulla ei ole lupaa tähän komentoon.', flags: true })
        }
        
        // Kutsutaan funktiota ticket.js-tiedostosta
        await ticketHandler.sendTicketPanel(interaction.channel)
        
        await interaction.reply({ content: `Tikettipaneeli lähetetty onnistuneesti kanavalle: ${channel}`, flags: MessageFlags.Ephemeral })
    }
  }
