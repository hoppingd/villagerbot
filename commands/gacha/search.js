const { EmbedBuilder, InteractionContextType, MessageFlags, SlashCommandBuilder } = require('discord.js');
const profileModel = require('../../models/profileSchema');
const charModel = require('../../models/charSchema');
const villagers = require('../../villagerdata/data.json');
const constants = require('../../constants');
const { calculatePoints, getOrCreateProfile, getOwnershipFooter, getRank } = require('../../util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription("Returns a list of cards that match the supplied parameters.")
        .addStringOption(option =>
            option.setName('gender')
                .setDescription('Specify the gender of returned cards.')
                .addChoices(
                    { name: "Male", value: "Male" },
                    { name: "Female", value: "Female" },
                )
        )
        .addStringOption(option =>
            option.setName('personality')
                .setDescription('Specify the personality of returned cards.')
                .addChoices(
                    { name: "Big sister", value: "Big sister" },
                    { name: "Cranky", value: "Cranky" },
                    { name: "Jock", value: "Jock" },
                    { name: "Lazy", value: "Lazy" },
                    { name: "Normal", value: "Normal" },
                    { name: "Peppy", value: "Peppy" },
                    { name: "Smug", value: "Smug" },
                    { name: "Snooty", value: "Snooty" },
                    { name: "Special", value: "Special" },
                )
        )
        .addStringOption(option =>
            option.setName('species')
                .setDescription('Specify the species of returned cards.')
                .addChoices(
                    { name: "Alligator", value: "Alligator" },
                    { name: "Alpaca", value: "Alpaca" },
                    { name: "Anteater", value: "Anteater" },
                    { name: "Axolotl", value: "Axolotl" },
                    { name: "Bear", value: "Bear" },
                    { name: "Bear cub", value: "Bear cub" },
                    { name: "Beaver", value: "Beaver" },
                    { name: "Bird", value: "Bird" },
                    { name: "Boar", value: "Boar" },
                    { name: "Bull", value: "Bull" },
                    { name: "Camel", value: "Camel" },
                    { name: "Cat", value: "Cat" },
                    { name: "Chameleon", value: "Chameleon" },
                    { name: "Chicken", value: "Chicken" },
                    { name: "Cow", value: "Cow" },
                    { name: "Deer", value: "Deer" },
                    { name: "Dodo", value: "Dodo" },
                    { name: "Dog", value: "Dog" },
                    { name: "Duck", value: "Duck" },
                    { name: "Eagle", value: "Eagle" },
                    { name: "Elephant", value: "Elephant" },
                    { name: "Fox", value: "Fox" },
                    { name: "Frill-necked lizard", value: "Frill-necked lizard" },
                    { name: "Frog", value: "Frog" },
                    { name: "Fur seal", value: "Fur seal" },
                    { name: "Ghost", value: "Ghost" },
                    { name: "Giraffe", value: "Giraffe" },
                    { name: "Goat", value: "Goat" },
                    { name: "Gorilla", value: "Gorilla" },
                    { name: "Gray langur", value: "Gray langur" },
                    { name: "Gyroid (species)", value: "Gyroid (species)" },
                    { name: "Hamster", value: "Hamster" },
                    { name: "Hedgehog", value: "Hedgehog" },
                    { name: "Hippo", value: "Hippo" },
                    { name: "Horse", value: "Horse" },
                    { name: "Kangaroo", value: "Kangaroo" },
                    { name: "Koala", value: "Koala" },
                    { name: "Lion", value: "Lion" },
                    { name: "Manatee", value: "Manatee" },
                    { name: "Mole", value: "Mole" },
                    { name: "Monkey", value: "Monkey" },
                    { name: "Mouse", value: "Mouse" },
                    { name: "Octopus", value: "Octopus" },
                    { name: "Ostrich", value: "Ostrich" },
                    { name: "Otter", value: "Otter" },
                    { name: "Owl", value: "Owl" },
                    { name: "Panther", value: "Panther" },
                    { name: "Peacock", value: "Peacock" },
                    { name: "Pelican", value: "Pelican" },
                    { name: "Penguin", value: "Penguin" },
                    { name: "Pig", value: "Pig" },
                    { name: "Pigeon", value: "Pigeon" },
                    { name: "Rabbit", value: "Rabbit" },
                    { name: "Raccoon", value: "Raccoon" },
                    { name: "Reindeer", value: "Reindeer" },
                    { name: "Rhinoceros", value: "Rhinoceros" },
                    { name: "Seagull", value: "Seagull" },
                    { name: "Sheep", value: "Sheep" },
                    { name: "Skunk", value: "Skunk" },
                    { name: "Sloth", value: "Sloth" },
                    { name: "Snowfolk", value: "Snowfolk" },
                    { name: "Squirrel", value: "Squirrel" },
                    { name: "Tapir", value: "Tapir" },
                    { name: "Tiger", value: "Tiger" },
                    { name: "Tortoise", value: "Tortoise" },
                    { name: "Turkey", value: "Turkey" },
                    { name: "Turtle", value: "Turtle" },
                    { name: "Unknown", value: "Unknown" },
                    { name: "Walrus", value: "Walrus" },
                    { name: "Wolf", value: "Wolf" },
                )
        ),
    async execute(interaction) {
        try {
            // TODO: impl
        } catch (err) {
            console.log(err);
            try {
                await interaction.reply(`There was an error searching for cards with the specified parameters. Please report bugs [here](https://discord.gg/CC9UKF9a6r).`);
            } catch (APIError) { console.log("Could not send error message. The bot may have been removed from the server."); }
        }
    },
};