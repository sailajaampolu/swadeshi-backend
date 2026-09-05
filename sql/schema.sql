CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  parent_id   UUID REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS sellers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name   TEXT NOT NULL,
  owner_name      TEXT,
  phone           TEXT NOT NULL,
  whatsapp        TEXT,
  category_id     UUID REFERENCES categories(id),
  description     TEXT,
  location        GEOGRAPHY(POINT, 4326) NOT NULL,
  address_text    TEXT,
  locality        TEXT,
  city            TEXT,
  is_verified     BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  plan            TEXT DEFAULT 'free',
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sellers_location_idx ON sellers USING GIST (location);
CREATE INDEX IF NOT EXISTS sellers_category_idx ON sellers (category_id);
CREATE INDEX IF NOT EXISTS sellers_phone_idx ON sellers (phone);

CREATE TABLE IF NOT EXISTS seller_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID REFERENCES sellers(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  sort_order  INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id      UUID REFERENCES sellers(id),
  customer_phone TEXT,
  source         TEXT CHECK (source IN ('call','whatsapp')),
  distance_km    NUMERIC,
  created_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS leads_seller_idx ON leads (seller_id, created_at);

CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID REFERENCES sellers(id),
  customer_id UUID REFERENCES customers(id),
  rating      INT CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

INSERT INTO categories (name) VALUES
  ('Handicrafts'), ('Textiles & Weaving'), ('Food & Spices'),
  ('Furniture & Woodwork'), ('Pottery & Ceramics'), ('Leather Goods'),
  ('Metal & Brass Work'), ('Agro Products')
ON CONFLICT DO NOTHING;
