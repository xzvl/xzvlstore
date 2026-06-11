"use client";

import { useParams } from "next/navigation";
import OrderForm from "../_form";

export default function EditOrderPage() {
  const { id } = useParams<{ id: string }>();
  return <OrderForm orderId={id} />;
}
