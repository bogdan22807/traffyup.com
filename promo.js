/**
 * GET /api/affiliate/promo?code=XXX — проверка промокода. Клиенту -5%, заказ засчитывается партнёру.
 * Запрет: нельзя применять свой промокод (передаём affiliateId в cookie или query).
 * POST /api/affiliate/promo — создание промо (1 на партнёра). Body: { code: "MYCODE" }
 */
const { getSupabase } = require('../../lib/supabase');

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

  try {
    const supabase = getSupabase();

    if (req.method === 'GET') {
      const code = (req.query.code || '').trim().toUpperCase();
      if (!code) return res.status(400).json({ error: 'code required' });
      const currentAffiliateId = getCookie(req, 'affiliate_id');

      const { data: promo, error } = await supabase.from('promocodes').select('code, affiliate_username').eq('code', code).single();
      if (error || !promo) return res.status(404).json({ valid: false, error: 'Промокод не найден' });

      if (currentAffiliateId && currentAffiliateId === promo.affiliate_username) {
        return res.status(400).json({ valid: false, error: 'Нельзя применить свой промокод' });
      }
      return res.status(200).json({ valid: true, discountPercent: 5, affiliateUsername: promo.affiliate_username });
    }

    if (req.method === 'POST') {
      const username = getCookie(req, 'affiliate_id');
      if (!username) return res.status(401).json({ error: 'No affiliate_id cookie' });

      let body;
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON' });
      }
      const code = (body.code || '').trim().toUpperCase().replace(/\s/g, '');
      if (!code || code.length < 3) return res.status(400).json({ error: 'code min 3 symbols' });

      const { data: existing } = await supabase.from('promocodes').select('id').eq('affiliate_username', username).single();
      if (existing) return res.status(400).json({ error: 'У вас уже есть промокод (1 на партнёра)' });

      const { error: ins } = await supabase.from('promocodes').insert({ code, affiliate_username: username });
      if (ins) {
        if (ins.code === '23505') return res.status(400).json({ error: 'Этот промокод уже занят' });
        return res.status(500).json({ error: ins.message });
      }
      return res.status(200).json({ ok: true, code });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('api/affiliate/promo', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
