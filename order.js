/**
 * POST /api/affiliate/order — сохранить заказ перед редиректом на оплату (ref и промо из тела).
 * Body: { monobankInvoiceId, amountKopiykas, ref?, promocode? }
 * Если Supabase не настроен (нет SUPABASE_URL) — всё равно возвращаем 200, чтобы редирект на оплату сработал.
 */
const UAH_TO_USD = Number(process.env.UAH_TO_USD_RATE) || 0.025;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  const { monobankInvoiceId, amountKopiykas, ref, promocode } = body;
  if (!monobankInvoiceId || amountKopiykas == null) return res.status(400).json({ error: 'monobankInvoiceId and amountKopiykas required' });

  const amountUah = Number(amountKopiykas) / 100;
  const amountUsd = amountUah * UAH_TO_USD;
  const refUsername = (ref || '').trim() || null;
  const promo = (promocode || '').trim() || null;

  if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_KEY && !process.env.SUPABASE_ANON_KEY)) {
    return res.status(200).json({ ok: true, skipped: 'Supabase not configured' });
  }

  try {
    const { getSupabase } = require('../../lib/supabase');
    const supabase = getSupabase();
    const { error } = await supabase.from('affiliate_orders').insert({
      monobank_invoice_id: monobankInvoiceId,
      amount_kopiykas: amountKopiykas,
      amount_uah: amountUah,
      amount_usd: amountUsd,
      ref_username: refUsername,
      promocode_used: promo || null,
      status: 'pending',
    });
    if (error) return res.status(500).json({ error: error.message });
  } catch (err) {
    console.error('api/affiliate/order', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
  return res.status(200).json({ ok: true });
};
