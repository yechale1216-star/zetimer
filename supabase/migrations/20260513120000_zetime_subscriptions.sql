np-- Zetime subscription domain — PostgreSQL / Supabase template
-- Align `school_id` type with your existing `schools.id` (UUID vs TEXT) before applying FKs.

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('starter','standard','premium','enterprise')),
  base_per_student_month NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('volume','coupon','enterprise')),
  value_json JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS add_ons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_flat NUMERIC(10,2) NOT NULL DEFAULT 0,
  per_unit BOOLEAN NOT NULL DEFAULT false,
  unit_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('starter','standard','premium','enterprise')),
  billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly','semester','yearly')),
  student_count INTEGER NOT NULL CHECK (student_count >= 0),
  status TEXT NOT NULL CHECK (status IN (
    'active','trial','expired','suspended','pending_payment','expiring','cancelled','paused'
  )),
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  trial_ends_at DATE,
  billing_start DATE NOT NULL,
  billing_end DATE NOT NULL,
  renewal_date DATE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscription_addons (
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  addon_id TEXT NOT NULL REFERENCES add_ons(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (subscription_id, addon_id)
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  school_id TEXT NOT NULL,
  number TEXT NOT NULL UNIQUE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN ('draft','open','paid','void')),
  issued_at DATE NOT NULL,
  due_at DATE NOT NULL,
  line_item_summary TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_history (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN ('completed','failed','pending')),
  description TEXT,
  occurred_on DATE NOT NULL,
  invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
  school_id TEXT NOT NULL,
  invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN ('completed','failed','pending','refunded')),
  type TEXT NOT NULL CHECK (type IN ('charge','refund','adjustment','credit')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_school ON subscriptions(school_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_billing_subscription ON billing_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_txn_school ON transactions(school_id);

COMMENT ON TABLE subscriptions IS 'Zetime SaaS subscription per school — pairs with lib/pricing-utils.ts';
