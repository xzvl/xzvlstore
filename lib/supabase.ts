import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(url, key);

export type OrderStatus = "pending" | "pre-order" | "processing" | "confirmed" | "shipped" | "completed" | "cancelled";

export type OrderItem = {
  product_id?: string | null;
  product: string;
  qty: number;
  unit_price: number;
  subtotal: number;
};

export type Order = {
  id: string;
  order_number: number | null;
  created_at: string;
  customer_id: string | null;
  name: string;
  email: string;
  phone: string;
  location: string;
  status: OrderStatus;
  estimated_total: number;
  discount: number;
  delivery_method: string | null;
  payment_method: string | null;
  tracking_number: string | null;
  official_receipt: string | null;
  down_payment: number;
  items: OrderItem[];
  billing_address_1: string;
  billing_address_2: string;
  billing_city: string;
  billing_state: string;
  billing_postcode: string;
  billing_region: string;
  billing_phone: string;
  shipping_address_1: string;
  shipping_address_2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postcode: string;
  shipping_region: string;
  shipping_phone: string;
  notes: string[];
};

export type TaxonomyType = "brand" | "category" | "tag";

export type Taxonomy = {
  id: string;
  type: TaxonomyType;
  name: string;
  description: string | null;
  slug: string;
  created_at: string;
};

export type DbProduct = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  sale_price: number | null;
  cost: number;
  stock: number;
  brands: string | null;
  brand_id: string | null;
  category_ids: string[];
  tag_ids: string[];
  image: string;
  main_image: string | null;
  gallery_images: string[];
  social_image: string | null;
  pre_order: boolean;
  pre_order_note: string | null;
  taxable: boolean;
  max_purchase_enabled: boolean;
  max_purchase_limit: number | null;
  status: "active" | "inactive";
  slug: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
