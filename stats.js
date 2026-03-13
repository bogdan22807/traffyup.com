/**
 * GET /api/affiliate/stats — клики, регистрации (пока 0), баланс, статус.
 */
const { getSupabase } = require('../../lib/supabase');
const { calculateAffiliateLevel } = require('../../lib/affiliate');

function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  const m = raw.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const username = getCookie(req, 'affiliate_id');
  if (!username) return res.status(401).json({ error: 'No affiliate_id cookie' });

  try {
    const supabase = getSupabase();
    const { count: clicks } = await supabase.from('referral_clicks').select('*', { count: 'exact', head: true }).eq('affiliate_username', username);
    const { data: aff } = await supabase.from('affiliates').select('balance_usd, total_referral_turnover_usd').eq('username', username).single();
    if (!aff) return res.status(404).json({ error: 'Affiliate not found' });

    const level = calculateAffiliateLevel(aff.total_referral_turnover_usd);
    return res.status(200).json({
      clicks: clicks || 0,
      registrations: 0,
      balanceUsd: Number(aff.balance_usd) || 0,
      status: level.level,
      totalTurnoverUsd: Number(aff.total_referral_turnover_usd) || 0,
    });
  } catch (err) {
    console.error('api/affiliate/stats', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
