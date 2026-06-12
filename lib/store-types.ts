export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  sale_price: number | null;
  pre_order: boolean;
  stock?: number;
  image: string;
  gallery_images: string[];
  social_image: string | null;
  status: "active" | "inactive";
  brand_id: string | null;
  brand_name: string | null;
  category_ids: string[];
  description?: string | null;
};
