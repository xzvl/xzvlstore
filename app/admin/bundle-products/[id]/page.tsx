"use client";

import { useParams } from "next/navigation";
import BundleForm from "../_form";

export default function EditBundlePage() {
  const { id } = useParams<{ id: string }>();
  return <BundleForm bundleId={id} />;
}
