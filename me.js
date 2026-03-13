/**
 * GET /api/affiliate/me — данные текущего партнёра.
 * Cookie: affiliate_id (username). Если нет — создаём нового и возвращаем Set-Cookie.
 */
const { getSupabase } = require('../../lib/supabase');
const { calculateAffiliateLevel, getNextLevel } = require('../../lib/affiliate');

function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  const m = raw.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function randomUsername() {
  return 'aff_' + Math.random().toString(36).slice(2, 10);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = getSupabase();
    let username = getCookie(req, 'affiliate_id');

    if (!username) {
      username = randomUsername();
      const { error } = await supabase.from('affiliates').insert({
        username,
        total_referral_turnover_usd: 0,
        balance_usd: 0,
      });
      if (error) {
        if (error.code === '23505') username = randomUsername();
        const { error: err2 } = await supabase.from('affiliates').insert({ username, total_referral_turnover_usd: 0, balance_usd: 0 });
        if (err2) return res.status(500).json({ error: err2.message });
      }
      res.setHeader('Set-Cookie', 'affiliate_id=' + encodeURIComponent(username) + '; Path=/; Max-Age=' + (30 * 24 * 60 * 60) + '; SameSite=Lax');
    }

    const { data: aff, error } = await supabase.from('affiliates').select('*').eq('username', username).single();
    if (error || !aff) return res.status(404).json({ error: 'Affiliate not found' });

    const level = calculateAffiliateLevel(aff.total_referral_turnover_usd);
    const next = getNextLevel(aff.total_referral_turnover_usd);
    const baseUrl = process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : (req.headers['x-forwarded-host'] ? 'https://' + req.headers['x-forwarded-host'] : '');
    const refLink = baseUrl ? baseUrl + '/?ref=' + encodeURIComponent(username) : '/?ref=' + encodeURIComponent(username);

    return res.status(200).json({
      username: aff.username,
      refLink,
      totalReferralTurnoverUsd: Number(aff.total_referral_turnover_usd) || 0,
      balanceUsd: Number(aff.balance_usd) || 0,
      level: level.level,
      percent: level.percent,
      nextLevel: next.name,
      nextLevelLeftUsd: next.leftUsd,
      nextLevelPercent: next.percent,
    });
  } catch (err) {
    console.error('api/affiliate/me', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
