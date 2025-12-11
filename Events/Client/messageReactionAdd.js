const { Events } = require("discord.js")
const config = require("../../config.json")

module.exports = {
    name: Events.MessageReactionAdd, // Tää on sama asia kuin messageReactionAdd, verrattavissa yllä olevaan esimerkkiin¨
    /**
     *Tää kommentointikenttä on kans täysin vapaaehtonen, ainoo mitä tää hyödyttää on että koodieditori saattaa
     *ymmärtää paremmin mitä reaction sana tarkottaa ja antaa koodiehdotuksia
     *
     *@param {Events.MessageReactionAdd} reaction
     */
async execute(reaction) {
       if (interaction.message.channel !== config.channel.allowlistChannel) return
       /*Nyt jos reaktio ei oo configissa mainitulla allowlistChannel kanavalla, mitään ei tapahtu*/
    }
}

/*Täällä määritä emojit mitä käytetään reagoimiseen*/
const upvote = ":heavy_plus_sign"
const downvote = ":heavy_minus_sign:"

/*Näin saadaan, että kuinka paljon on ääniä kyseisessä viestissä*/
const upvotecount = interaction.message.reactions.cache.get(upvote).count/*Täällä haetaan reagoidun viestin upvote reagointien määrä*/
const downvotecount = interaction.message.reactions.cache.get(downvote).count/*Sama kuin äsken mutta downote reagointien määrä*/
const totalvotecount = upvotecount + downvotecount/*Äänet yhteensä*/

/*SITTEN SE LOGIIKKA - Jos haluaa esimerkiks että kun ääniä on x määrä tai jos upvoteja tulee tietty määrä*/
if (totalvotecount === 3) {
  /*Tämä tapahtuu jos ääniä on yhteensä 10*/
  if (upvotecount < 2) {/*10 yhteisäänestä jos upvoteja on alle 5, äänestys hylätään näiden sulkujen sisällä*/}
  else {/*Täällä käsitellään jos upvoteja on 5 tai enemmän, jolloin äänestys vois olla esim hyväksytty*/}
}
