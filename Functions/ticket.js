const path = require("path");
const fs = require("fs");
const config = require(path.resolve(__dirname, "../config.json"));
const { 
    EmbedBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ChannelType, 
    PermissionFlagsBits 
} = require("discord.js");

module.exports = {
    // Lähetä ticket-panel kanavalle
    async sendTicketPanel(channel) {
        const embed = new EmbedBuilder()
            .setTitle("Lässyn lässyn lää")
            .setDescription("Luo uusi tiketti painamalla nappia alla.")
            .setColor("Blue");

        const button = new ButtonBuilder()
            .setCustomId("create_ticket")
            .setLabel("Luo tiketti")
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        await channel.send({ embeds: [embed], components: [row] });
    },

    // Käsittele interaktiot: painikkeet & dropdown
    async handleInteraction(interaction) {
        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

        try {
            if (interaction.isButton()) {
                if (interaction.customId === "create_ticket") {
                    await this.showTicketMenu(interaction);
                } else if (interaction.customId === "close_ticket") {
                    await this.closeTicket(interaction);
                }
            }

            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === "ticket_select") {
                    await this.createTicketChannel(interaction);
                }
            }
        } catch (err) {
            console.error("Virhe handleInteractionissä:", err);
        }
    },

    // Näytä dropdown aihevalinnalla
    async showTicketMenu(interaction) {
        // Defer reply välittömästi, jotta vältetään "Unknown interaction"
        await interaction.deferReply({ ephemeral: true });

        const menu = new StringSelectMenuBuilder()
            .setCustomId("ticket_select")
            .setPlaceholder("Valitse ticketin aihe")
            .addOptions([
                { label: "Bug report", value: "bugreport" },
                { label: "YP report", value: "ypreport" },
                { label: "Pelaaja report", value: "playerreport" },
                { label: "Muut asiat", value: "other" }
            ]);

        const row = new ActionRowBuilder().addComponents(menu);

        await interaction.editReply({ content: "Valitse aihe:", components: [row] });
    },

    // Luo ticket-kanava
    async createTicketChannel(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        const user = interaction.user;
        const selected = interaction.values[0];

        // Luo kanava
        const channel = await guild.channels.create({
            name: `ticket-${selected}-${user.username}`.toLowerCase().replace(/ /g, "-"),
            type: ChannelType.GuildText,
            parent: config.ticket.ticketCategoryId,
            permissionOverwrites: [
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: config.ticket.roleYllapito, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: config.ticket.roleValvoja, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        // Tallenna luoja kanavan topictiin
        await channel.setTopic(`ticketCreator:${user.id}`);

        const embed = new EmbedBuilder()
            .setTitle(`Tiketti: ${selected}`)
            .setDescription(`Tervetuloa ticket-kanavaasi!\nStaff seuraa tilannetta.`)
            .setColor("Green");

        const closeButton = new ButtonBuilder()
            .setCustomId("close_ticket")
            .setLabel("Sulje tiketti")
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(closeButton);

        await channel.send({ content: `<@${user.id}>`, embeds: [embed], components: [row] });

        await interaction.editReply({ content: `Ticket luotu: ${channel}` });
    },

    // Sulje ticket ja arkistoi
    async closeTicket(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.channel;
        if (!channel) return;

        const userClosing = interaction.user;

        await interaction.editReply({ content: "Ticket suljetaan 10 sekunnin kuluttua..." });

        setTimeout(async () => {
            try {
                const archiveChannel = interaction.guild.channels.cache.get(config.ticket.archiveChannelId);
                if (!archiveChannel) return channel.send("Arkisto-kanavaa ei löytynyt.");

                const messages = await channel.messages.fetch({ limit: 100 });
                const participants = [...new Set(messages.map(m => m.author.tag))];

                const creatorId = channel.topic?.split("ticketCreator:")[1];
                const ticketCreator = interaction.guild.members.cache.get(creatorId)?.user.tag || "Tuntematon";

                // Luo .txt-transcript
                let transcript = `=== Tiketti: ${channel.name} ===\nAihe: ${channel.name.split('-')[1]}\nLuonut: ${ticketCreator}\nSulki: ${userClosing.tag}\nOsallistujat: ${participants.join(", ")}\n\n--- Viestit ---\n\n`;
                messages.reverse().forEach(m => {
                    transcript += `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}\n`;
                });

                const filePath = `./transcript-${channel.name}.txt`;
                fs.writeFileSync(filePath, transcript);

                const embed = new EmbedBuilder()
                    .setTitle(`Ticket arkistoitu: ${channel.name}`)
                    .addFields(
                        { name: "Tiketin nimi", value: channel.name, inline: true },
                        { name: "Aihe", value: channel.name.split('-')[1], inline: true },
                        { name: "Luonut", value: ticketCreator, inline: true },
                        { name: "Osallistujat", value: participants.join(", ") || "Ei osallistujia", inline: false },
                        { name: "Sulki", value: userClosing.tag, inline: true }
                    )
                    .setColor("Grey");

                await archiveChannel.send({ embeds: [embed], files: [filePath] });
                fs.unlinkSync(filePath);
                await channel.delete();

            } catch (err) {
                console.error("Virhe ticketin sulkemisessa:", err);
            }
        }, 10000);
    },

    // Lisää jäsen ticket-kanavaan
    async addMember(interaction, member) {
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.channel;
        if (!channel) return;

        await channel.permissionOverwrites.edit(member.id, { ViewChannel: true, SendMessages: true });
        await interaction.editReply({ content: `${member} lisätty ticketiin!` });
    },

    // Poista jäsen ticket-kanavasta
    async removeMember(interaction, member) {
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.channel;
        if (!channel) return;

        await channel.permissionOverwrites.delete(member.id);
        await interaction.editReply({ content: `${member} poistettu ticketistä!` });
    }
};
