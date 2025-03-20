const NUM_VILLAGERS = 565;
const ROLL_CLAIM_TIME_LIMIT = 120 * 1000; // active collector time (sec * ms)
const DEFAULT_CARD_LIMIT = 10;
const DEFAULT_FOIL_CHANCE = 5;
const BASE = 20; // This will control the general scale of points
const SCALING_FACTOR = 275; // Adjust this to control the spread of points
const MAX_POINTS = 2000; // Cap the maximum points a character can have
const MIN_POINTS = 20; // Minimum points for least popular characters
const RARITY_NAMES = ["Common", "Foil"];
const RARITY_NUMS = { COMMON: 0, FOIL: 1};
const DECK_NAME_CHAR_LIMIT = 16;
const FOIL_VALUE_MULTIPLIER = 2;
const UPGRADE_COSTS = [1000, 2000, 4000, 8000];
const WISH_BASE = 2;
const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V"];
const DEFAULT_ROLL_TIMER = 60*60*1000;
const DEFAULT_CLAIM_TIMER = 4*60*60*1000;
const DEFAULT_ENERGY = 5;

module.exports = {
    NUM_VILLAGERS,
    ROLL_CLAIM_TIME_LIMIT,
    DEFAULT_CARD_LIMIT,
    DEFAULT_FOIL_CHANCE,
    BASE,
    SCALING_FACTOR,
    MAX_POINTS,
    MIN_POINTS,
    RARITY_NAMES,
    RARITY_NUMS,
    DECK_NAME_CHAR_LIMIT,
    FOIL_VALUE_MULTIPLIER,
    UPGRADE_COSTS,
    WISH_BASE,
    ROMAN_NUMERALS,
    DEFAULT_ROLL_TIMER,
    DEFAULT_CLAIM_TIMER,
    DEFAULT_ENERGY
};