-- Партнёрская система TRAFFYUP
-- Выполни в Supabase SQL Editor

-- Партнёры (реселлеры)
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  referrer_username TEXT REFERENCES affiliates(username),
  total_referral_turnover_usd DECIMAL(12,2) DEFAULT 0,
  balance_usd DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Переходы по реф-ссылке (клики)
CREATE TABLE IF NOT EXISTS referral_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_username TEXT NOT NULL REFERENCES affiliates(username),
  visited_at TIMESTAMPTZ DEFAULT now()
);

-- Промокоды (1 на партнёра)
CREATE TABLE IF NOT EXISTS promocodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  affiliate_username TEXT NOT NULL REFERENCES affiliates(username),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(affiliate_username)
);

-- Заказы (для начисления комиссий после оплаты)
CREATE TABLE IF NOT EXISTS affiliate_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monobank_invoice_id TEXT UNIQUE,
  amount_kopiykas BIGINT NOT NULL,
  amount_uah DECIMAL(12,2) NOT NULL,
  amount_usd DECIMAL(12,2),
  ref_username TEXT,
  promocode_used TEXT,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Начисления комиссий (уровень 1 и 2)
CREATE TABLE IF NOT EXISTS commission_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES affiliate_orders(id),
  affiliate_username TEXT NOT NULL,
  level INT NOT NULL,
  percent_used DECIMAL(5,2) NOT NULL,
  amount_usd DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_affiliates_username ON affiliates(username);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_aff ON referral_clicks(affiliate_username);
CREATE INDEX IF NOT EXISTS idx_promocodes_code ON promocodes(code);
CREATE INDEX IF NOT EXISTS idx_affiliate_orders_status ON affiliate_orders(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_orders_invoice ON affiliate_orders(monobank_invoice_id);

-- RLS (опционально): отключить для доступа через service role из API
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE promocodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON affiliates FOR ALL USING (true);
CREATE POLICY "Service role full access" ON promocodes FOR ALL USING (true);
CREATE POLICY "Service role full access" ON affiliate_orders FOR ALL USING (true);
CREATE POLICY "Service role full access" ON commission_events FOR ALL USING (true);
CREATE POLICY "Service role full access" ON referral_clicks FOR ALL USING (true);
