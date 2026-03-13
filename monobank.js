/**
 * POST /api/webhook/monobank — колбэк Monobank при смене статуса инвойса.
 * Начисление комиссий только при status === 'success'.
 * Документация: https://api.monobank.ua/docs/acquiring.html (webhook)
 */
const { getSupabase } = require('../../lib/supabase');
const { calculateCommissions } = require('../../lib/affiliate');
const { notifySupplier } = require('../../lib/supplier');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).end();
  }
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch (e) {
    return res.status(400).send('Invalid JSON');
  }

  const { invoiceId, status } = body;
  if (!invoiceId) return res.status(400).send('invoiceId required');
  if (status !== 'success') {
    return res.status(200).send('OK');
  }

  try {
    const supabase = getSupabase();
    const { data: order, error: ordErr } = await supabase
      .from('affiliate_orders')
      .select('id, amount_usd, amount_uah, monobank_invoice_id, ref_username, promocode_used')
      .eq('monobank_invoice_id', invoiceId)
      .single();

    if (ordErr || !order) {
      return res.status(200).send('OK');
    }

    await supabase.from('affiliate_orders').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', order.id);

    let directUsername = order.ref_username;
    if (!directUsername && order.promocode_used) {
      const { data: promo } = await supabase.from('promocodes').select('affiliate_username').eq('code', order.promocode_used).single();
      if (promo) directUsername = promo.affiliate_username;
    }
    if (!directUsername) return res.status(200).send('OK');

    const { data: directAff } = await supabase.from('affiliates').select('total_referral_turnover_usd, referrer_username').eq('username', directUsername).single();
    if (!directAff) return res.status(200).send('OK');

    const amountUsd = Number(order.amount_usd) || 0;
    const commissions = calculateCommissions(
      amountUsd,
      directUsername,
      Number(directAff.total_referral_turnover_usd) || 0,
      directAff.referrer_username || null
    );

    await supabase.from('commission_events').insert([
      { order_id: order.id, affiliate_username: commissions.level1.username, level: 1, percent_used: commissions.level1.percent, amount_usd: commissions.level1.amountUsd },
      ...(commissions.level2 ? [{ order_id: order.id, affiliate_username: commissions.level2.username, level: 2, percent_used: 5, amount_usd: commissions.level2.amountUsd }] : []),
    ]);

    const { data: l1 } = await supabase.from('affiliates').select('balance_usd').eq('username', directUsername).single();
    await supabase.from('affiliates').update({
      balance_usd: (Number(l1?.balance_usd) || 0) + commissions.level1.amountUsd,
      total_referral_turnover_usd: (Number(directAff.total_referral_turnover_usd) || 0) + amountUsd,
      updated_at: new Date().toISOString(),
    }).eq('username', directUsername);

    if (commissions.level2) {
      const { data: l2 } = await supabase.from('affiliates').select('balance_usd').eq('username', commissions.level2.username).single();
      await supabase.from('affiliates').update({
        balance_usd: (Number(l2?.balance_usd) || 0) + commissions.level2.amountUsd,
        updated_at: new Date().toISOString(),
      }).eq('username', commissions.level2.username);
    }

    const paidAt = new Date().toISOString();
    await notifySupplier({ ...order, paid_at: paidAt }).catch((err) => console.error('Supplier notify:', err));

    return res.status(200).send('OK');
  } catch (err) {
    console.error('webhook/monobank', err);
    return res.status(500).send('Error');
  }
};
