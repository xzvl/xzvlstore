export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  sale_price: number | null;
  pre_order: boolean;
  pre_order_note?: string | null;
  down_payment_required?: boolean;
  down_payment_price?: number | null;
  /** Announced but not purchasable yet — never addable to cart or orderable. */
  sneak_peek?: boolean;
  sneak_peek_note?: string | null;
  /** Only sold as part of a bundle — can't be added to the cart on its own. */
  bundle_only?: boolean;
  stock?: number;
  max_purchase_enabled?: boolean;
  max_purchase_limit?: number | null;
  image: string;
  gallery_images: string[];
  social_image: string | null;
  status: "active" | "inactive";
  brand_id: string | null;
  brand_name: string | null;
  category_ids: string[];
  tag_ids?: string[];
  description?: string | null;
};

/** Per-unit down payment a pre-order product requires upfront, or 0 when none. */
export function downPaymentPerUnit(p: {
  pre_order?: boolean;
  down_payment_required?: boolean;
  down_payment_price?: number | null;
}): number {
  return p.pre_order && p.down_payment_required ? Math.max(0, Number(p.down_payment_price) || 0) : 0;
}
