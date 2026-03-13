/**
 * Сервер TRAFFYUP.com — раздаёт сайт и создаёт інвойси Monobank.
 * Запуск: npm start  или  двойной клик по ЗАПУСТИТЬ_СЕРВЕР.command
 */

try { require('dotenv').config(); } catch (_) {}

const path = require('path');
const express = require('express');
const createInvoiceHandler = require('./api/create-invoice.js');

const app = express();
const PORT = process.env.PORT || 3000;

function corsMiddleware(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
}
app.use(corsMiddleware);
app.use(express.json());
app.use(function (req, res, next) {
  if (req.method === 'POST' && (req.path === '/api/create-invoice' || req.path === '/api/payments/monobank/create')) {
    console.log('[Backend]', req.method, req.path, 'body:', JSON.stringify(req.body));
  }
  next();
});
app.use(express.static(path.join(__dirname)));

app.post('/api/create-invoice', createInvoiceHandler);
app.post('/api/payments/monobank/create', createInvoiceHandler);

app.listen(PORT, function () {
  console.log('Сервер: http://localhost:' + PORT);
  console.log('Сайт:   http://localhost:' + PORT + '/');
  console.log('Оплата: http://localhost:' + PORT + '/pricing.html');
  if (!process.env.MONOBANK_TOKEN) {
    console.warn('Предупреждение: MONOBANK_TOKEN не задан в .env');
  }
});
