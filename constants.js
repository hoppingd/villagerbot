const NUM_VILLAGERS = 566;
const ROLL_CLAIM_TIME_LIMIT = 300 * 1000; // active collector time (sec * ms)
const CONFIRM_TIME_LIMIT = 180 * 1000; // active collector time (sec * ms)
const DEFAULT_CARD_LIMIT = 10;
const DEFAULT_FOIL_CHANCE = 5;
const DEFAULT_PRISMATIC_CHANCE = 1
const BASE = 20; // This will control the general scale of points
const SCALING_FACTOR = 275; // Adjust this to control the spread of points
const MAX_POINTS = 2000; // Cap the maximum points a character can have
const MIN_POINTS = 20; // Minimum points for least popular characters
const RARITY_NAMES = ["Common", "Foil", "Prismatic"];
const RARITY_NUMS = { COMMON: 0, FOIL: 1, PRISMATIC: 2};
const RARITY_LVL = [1, 10, 100]; // how much lvl you gain for each rarity
const DECK_NAME_CHAR_LIMIT = 16;
const RARITY_VALUE_MULTIPLIER = [1, 2, 5];
const UPGRADE_COSTS = [1000, 2000, 4000, 8000, 16000];
const WISH_BASE = 2;
const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "V"];
const DEFAULT_ROLL_TIMER = 60 * 60 * 1000;
const DEFAULT_CLAIM_TIMER = 4 * 60 * 60 * 1000;
const DEFAULT_ENERGY = 5;
const ADDITIONAL_CARD_SLOTS = 4;
const DAY = 24 * 60 * 60 * 1000;
const HALF_DAY = 12 * 60 * 60 * 1000;
const WISH_CLAIM_BONUS = 100;
const BLATIER_TO_STORAGE_LIMIT = [0, 1, 1, 1, 2, 2];
const BLATHERS_BONUS_LVLS = 8;
const BLATHERS_BONUS_CHANCE = 25;
const MAX_TORT_LVL = 60;
const TORT_NUMERALS = [
    "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
    "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX",
    "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXVI", "XXVII", "XXVIII", "XXIX", "XXX",
    "XXXI", "XXXII", "XXXIII", "XXXIV", "XXXV", "XXXVI", "XXXVII", "XXXVIII", "XXXIX", "XL",
    "XLI", "XLII", "XLIII", "XLIV", "XLV", "XLVI", "XLVII", "XLVIII", "XLIX", "L",
    "LI", "LII", "LIII", "LIV", "LV", "LVI", "LVII", "LVIII", "LIX", "LX", "LX"];
const GLOBAL_COMMAND_COOLDOWN = 1000; // 1 second
const UPGRADE_THRESHOLDS = [10, 100, Number.MAX_SAFE_INTEGER];
const TORT_PRISMATIC_CHANCE_INTERVAL = 5;

module.exports = {
    NUM_VILLAGERS,
    ROLL_CLAIM_TIME_LIMIT,
    CONFIRM_TIME_LIMIT,
    DEFAULT_CARD_LIMIT,
    DEFAULT_FOIL_CHANCE,
    DEFAULT_PRISMATIC_CHANCE,
    BASE,
    SCALING_FACTOR,
    MAX_POINTS,
    MIN_POINTS,
    RARITY_NAMES,
    RARITY_NUMS,
    RARITY_LVL,
    DECK_NAME_CHAR_LIMIT,
    RARITY_VALUE_MULTIPLIER,
    UPGRADE_COSTS,
    WISH_BASE,
    ROMAN_NUMERALS,
    DEFAULT_ROLL_TIMER,
    DEFAULT_CLAIM_TIMER,
    DEFAULT_ENERGY,
    ADDITIONAL_CARD_SLOTS,
    DAY,
    HALF_DAY,
    WISH_CLAIM_BONUS,
    BLATIER_TO_STORAGE_LIMIT,
    BLATHERS_BONUS_LVLS,
    BLATHERS_BONUS_CHANCE,
    MAX_TORT_LVL,
    TORT_NUMERALS,
    GLOBAL_COMMAND_COOLDOWN,
    UPGRADE_THRESHOLDS,
    TORT_PRISMATIC_CHANCE_INTERVAL
};