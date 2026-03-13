/**
 * Уровни реселлера по обороту (USD)
 * Starter $0+: 10%, Bronze $200+: 13%, Silver $600+: 16%, Gold $1500+: 20%, Platinum $4000+: 23%, Leader $8000+: 25%
 */
const LEVELS = [
  { name: 'Leader', minTurnover: 8000, percent: 25 },
  { name: 'Platinum', minTurnover: 4000, percent: 23 },
  { name: 'Gold', minTurnover: 1500, percent: 20 },
  { name: 'Silver', minTurnover: 600, percent: 16 },
  { name: 'Bronze', minTurnover: 200, percent: 13 },
  { name: 'Starter', minTurnover: 0, percent: 10 },
];

const LEVEL_2_PERCENT = 5;

function calculateAffiliateLevel(totalReferralTurnoverUsd) {
  const turnover = Number(totalReferralTurnoverUsd) || 0;
  for (const level of LEVELS) {
    if (turnover >= level.minTurnover) {
      return { level: level.name, percent: level.percent };
    }
  }
  return { level: 'Starter', percent: 10 };
}

function getNextLevel(currentTurnover) {
  const curr = Number(currentTurnover) || 0;
  for (let i = 0; i < LEVELS.length - 1; i++) {
    if (curr < LEVELS[i].minTurnover && (i === LEVELS.length - 1 || curr >= LEVELS[i + 1].minTurnover)) {
      const next = LEVELS[i];
      return {
        name: next.name,
        minTurnover: next.minTurnover,
        percent: next.percent,
        leftUsd: Math.max(0, next.minTurnover - curr),
      };
    }
  }
  return { name: 'Leader', minTurnover: 8000, percent: 25, leftUsd: 0 };
}

/**
 * Рассчитать комиссию 1-го уровня (прямой партнёр) и 2-го (кто пригласил).
 * orderAmountUsd — сумма заказа в USD.
 * Возвращает { level1: { username, amountUsd, percent }, level2: { username, amountUsd } | null }.
 */
function calculateCommissions(orderAmountUsd, directAffiliateUsername, directAffiliateTurnoverUsd, referrerUsername) {
  const amount = Number(orderAmountUsd) || 0;
  const { percent } = calculateAffiliateLevel(directAffiliateTurnoverUsd);
  const level1Amount = (amount * percent) / 100;
  const level2Amount = referrerUsername ? (amount * LEVEL_2_PERCENT) / 100 : 0;
  return {
    level1: { username: directAffiliateUsername, amountUsd: level1Amount, percent },
    level2: referrerUsername ? { username: referrerUsername, amountUsd: level2Amount } : null,
  };
}

module.exports = {
  LEVELS,
  LEVEL_2_PERCENT,
  calculateAffiliateLevel,
  getNextLevel,
  calculateCommissions,
};
