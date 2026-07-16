-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  location text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'pre-order', 'confirmed', 'shipped', 'completed', 'cancelled')),
  estimated_total numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  delivery_method text,
  payment_method text,
  items jsonb NOT NULL DEFAULT '[]'
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  name text NOT NULL,
  sku text,
  price numeric NOT NULL DEFAULT 0,
  sale_price numeric,
  cost numeric NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  brands text,
  image text NOT NULL DEFAULT '',
  main_image text,
  gallery_images text[] NOT NULL DEFAULT '{}',
  social_image text,
  brand_id uuid REFERENCES taxonomy(id) ON DELETE SET NULL,
  category_ids uuid[] NOT NULL DEFAULT '{}',
  tag_ids uuid[] NOT NULL DEFAULT '{}',
  pre_order boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Seed existing products
INSERT INTO products (id, name, price, image, status, sort_order) VALUES
  ('prod-01', 'BX-51 String Launcher (Black x Green)', 629, '/assets/string-launcher.webp', 'inactive', 1),
  ('prod-02', 'CX-13 Bahamut Blitz BK1-50I', 999, '/assets/blitz-bahamut.webp', 'active', 2),
  ('prod-03', 'CX-14 Knight Fortress GV8-70UN', 999, '/assets/knigh-fortress.webp', 'active', 3),
  ('prod-04', 'CX15 Ragna Rage FE4-55Y', 649, '/assets/ragna-rage.webp', 'active', 4),
  ('prod-05', 'CX-18 Random Booster Brachio Whip Select', 649, '/assets/brachio-whip.webp', 'inactive', 5),
  ('prod-06', 'G1682 Fort Hornet R7-60T', 1199, '/assets/fort-hornet.webp', 'active', 6),
  ('prod-07', 'G1534 Keel Shark 1-60Q', 899, '/assets/keel-shark-1-60.webp', 'active', 7),
  ('prod-08', 'G2738 Stun Medusa 9-60GB', 1199, '/assets/stun-medusa.webp', 'inactive', 8),
  ('prod-09', 'G1669 Tide Whale 5-80E', 799, '/assets/tide-whale.webp', 'active', 9)
ON CONFLICT (id) DO NOTHING;

-- Taxonomy table (brands, categories, tags)
CREATE TABLE IF NOT EXISTS taxonomy (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('brand', 'category', 'tag')),
  name text NOT NULL,
  description text,
  slug text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (type, slug)
);

-- Customers table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS customers (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text NOT NULL,
  auth_provider text NOT NULL DEFAULT 'email',
  billing_address_1 text NOT NULL DEFAULT '',
  billing_address_2 text NOT NULL DEFAULT '',
  billing_city text NOT NULL DEFAULT '',
  billing_postcode text NOT NULL DEFAULT '',
  billing_region text NOT NULL DEFAULT 'Philippines',
  billing_state text NOT NULL DEFAULT '',
  billing_phone text NOT NULL DEFAULT '',
  shipping_address_1 text NOT NULL DEFAULT '',
  shipping_address_2 text NOT NULL DEFAULT '',
  shipping_city text NOT NULL DEFAULT '',
  shipping_postcode text NOT NULL DEFAULT '',
  shipping_region text NOT NULL DEFAULT 'Philippines',
  shipping_state text NOT NULL DEFAULT '',
  shipping_phone text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_select_own" ON customers FOR SELECT USING (auth.uid() = id);
CREATE POLICY "customers_insert_own" ON customers FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "customers_update_own" ON customers FOR UPDATE USING (auth.uid() = id);

-- Auto-create customer record on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.customers (id, email, auth_provider, first_name, last_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_app_meta_data->>'provider', 'email'),
    COALESCE(
      new.raw_user_meta_data->>'given_name',
      split_part(COALESCE(new.raw_user_meta_data->>'full_name', ''), ' ', 1),
      ''
    ),
    COALESCE(
      new.raw_user_meta_data->>'family_name',
      CASE WHEN position(' ' IN COALESCE(new.raw_user_meta_data->>'full_name', '')) > 0
        THEN split_part(new.raw_user_meta_data->>'full_name', ' ', 2)
        ELSE ''
      END,
      ''
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_customer();

-- Disable RLS (admin uses service role key which bypasses it anyway)
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE taxonomy DISABLE ROW LEVEL SECURITY;

-- ─── If you already ran the old schema, run these ALTER statements instead ───
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS sku text;
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price numeric;
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS pre_order boolean NOT NULL DEFAULT false;
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES taxonomy(id) ON DELETE SET NULL;
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS category_ids uuid[] NOT NULL DEFAULT '{}';
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS tag_ids uuid[] NOT NULL DEFAULT '{}';
-- ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
-- ALTER TABLE products ADD CONSTRAINT products_status_check CHECK (status IN ('active', 'inactive'));
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS cost numeric NOT NULL DEFAULT 0;
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0;
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS brands text;
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS main_image text;
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery_images text[] NOT NULL DEFAULT '{}';
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS social_image text;

-- ─── If you already ran the old orders schema, run these migrations ───────────
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
-- ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'pre-order', 'confirmed', 'shipped', 'completed', 'cancelled'));
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method text;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number text;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes text[] NOT NULL DEFAULT '{}';

-- ─── If taxonomy table is new, just run the CREATE TABLE above ───────────────

-- ─── Admin overhaul additions (official receipt, down payment, taxable) ───────
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS official_receipt text;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS down_payment numeric NOT NULL DEFAULT 0;
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS taxable boolean NOT NULL DEFAULT false;

-- ─── Customer account blocking ─────────────────────────────────────────────────
-- ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;
-- ALTER TABLE customers ADD COLUMN IF NOT EXISTS block_reason text;

-- ─── Per-product maximum purchase limit ────────────────────────────────────────
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS max_purchase_enabled boolean NOT NULL DEFAULT false;
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS max_purchase_limit integer;

-- ─── Supabase Storage ─────────────────────────────────────────────────────────
-- 1. Go to Storage → New bucket
-- 2. Name: product-images
-- 3. Public bucket: YES (toggle on)
-- 4. Click Create bucket
