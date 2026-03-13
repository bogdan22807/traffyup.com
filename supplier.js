/**
 * Отправка оплаченного заказа поставщику (SMM-панель).
 * Задайте SUPPLIER_URL и SUPPLIER_API_KEY в env.
 * Формат тела запроса настраивается под API вашего поставщика.
 */

async function notifySupplier(order) {
  const url = process.env.SUPPLIER_URL;
  if (!url || !url.startsWith('http')) return;

  const apiKey = process.env.SUPPLIER_API_KEY || '';
  const body = {
    order_id: order.id,
    invoice_id: order.monobank_invoice_id,
    amount_uah: order.amount_uah,
    platform: order.platform || null,
    service: order.service_key || null,
    quantity: order.quantity || null,
    link: order.profile_link || null,
    paid_at: order.paid_at || new Date().toISOString(),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey && { 'Authorization': 'Bearer ' + apiKey }),
      ...(apiKey && { 'X-Api-Key': apiKey }),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('Supplier API ' + res.status + ': ' + text);
  }
  return res;
}

module.exports = { notifySupplier };
