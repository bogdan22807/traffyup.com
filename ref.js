/**
 * POST /api/ref — залогировать переход по реф-ссылке.
 * Тело: { ref: "username" }. Реферал сохраняется в куки на клиенте на 30 дней.
 */
const { getSupabase } = require('../lib/supabase');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  const ref = (body.ref || '').trim();
  if (!ref) return res.status(400).json({ error: 'ref required' });

  try {
    const supabase = getSupabase();
    const { data: aff } = await supabase.from('affiliates').select('username').eq('username', ref).single();
    if (!aff) return res.status(404).json({ error: 'Affiliate not found' });

    await supabase.from('referral_clicks').insert({ affiliate_username: ref });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('api/ref', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
