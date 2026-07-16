"use client";

import { useParams } from "next/navigation";
import ProductForm from "../_form";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  return <ProductForm productId={id} />;
}
