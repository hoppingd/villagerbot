const NUM_VILLAGERS = 480; // dataset = 480, real = 488
const ROLL_CLAIM_TIME_LIMIT = 120 * 1000; // active collector time (sec * ms)
const DEFAULT_CARD_LIMIT = 10;
const DEFAULT_FOIL_CHANCE = 5;
const BASE = 20; // This will control the general scale of points
const SCALING_FACTOR = 200; // Adjust this to control the spread of points
const MAX_POINTS = 1400; // Cap the maximum points a character can have
const MIN_POINTS = 20; // Minimum points for least popular characters
const RARITIES = {COMMON: "Common", FOIL: "Foil"};
const DECK_NAME_CHAR_LIMIT = 16;
const FOIL_VALUE_MULTIPLIER = 2;
const UPGRADE_COSTS = [1000, 2000, 4000, 8000];

module.exports = {
    NUM_VILLAGERS,
    ROLL_CLAIM_TIME_LIMIT,
    DEFAULT_CARD_LIMIT,
    DEFAULT_FOIL_CHANCE,
    BASE,
    SCALING_FACTOR,
    MAX_POINTS,
    MIN_POINTS,
    RARITIES,
    DECK_NAME_CHAR_LIMIT,
    FOIL_VALUE_MULTIPLIER,
    UPGRADE_COSTS,
};