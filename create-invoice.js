/**
 * POST /api/create-invoice — создание инвойса Monobank (Vercel).
 * Body: { amount: number } — сумма в копейках (грн * 100).
 * Returns: { pageUrl, invoiceId }.
 *
 * В Vercel: Project Settings → Environment Variables — добавьте MONOBANK_TOKEN для Production.
 */
const MONOBANK_INVOICE_URL = 'https://api.monobank.ua/api/merchant/invoice/create';

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  if (typeof req.on !== 'function') return {};
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

module.exports = async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const token = (process.env.MONOBANK_TOKEN || '').trim();
    if (!token) {
      return res.status(500).json({
        error: 'MONOBANK_TOKEN not configured',
        hint: 'Add MONOBANK_TOKEN in Vercel → Project Settings → Environment Variables (Production)',
      });
    }

    let body;
    try {
      body = await parseBody(req);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON', message: e.message });
    }
    const amount = Math.round(Number(body.amount));
    const redirectUrl = body.redirectUrl || '';
    if (!Number.isFinite(amount) || amount < 1) {
      return res.status(400).json({ error: 'amount required (kopiykas, positive)', received: body });
    }

    const reference = 'traffyup-' + Date.now();
    const payload = {
      amount,
      ccy: 980,
      merchantPaymInfo: {
        reference,
        destination: 'Оплата SMM-послуг TRAFFYUP',
        comment: 'Замовлення ' + reference,
      },
      redirectUrl: redirectUrl || undefined,
      validity: 86400,
      paymentType: 'debit',
    };

    const response = await fetch(MONOBANK_INVOICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Token': token },
      body: JSON.stringify(payload),
    });
    const rawText = await response.text();
    let data = {};
    try { data = rawText ? JSON.parse(rawText) : {}; } catch (_) {}
    if (!response.ok) return res.status(response.status).json({ error: data.errCode || data.message || 'Monobank API error', details: data });
    if (!data.pageUrl) return res.status(502).json({ error: 'No pageUrl in response', details: data });
    return res.status(200).json({ pageUrl: data.pageUrl, invoiceId: data.invoiceId });
  } catch (err) {
    console.error('create-invoice error:', err);
    return res.status(500).json({
      error: 'Server error',
      message: err.message,
      name: err.name,
    });
  }
};
