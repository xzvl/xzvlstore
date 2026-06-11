"use client";

import { useParams } from "next/navigation";
import CustomerForm from "../_form";

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>();
  return <CustomerForm customerId={id} />;
}
