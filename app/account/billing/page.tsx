"use client";

import { SaveBar } from "@/components/account/AccountProvider";
import AddressFields from "@/components/account/AddressFields";
import { CARD, CardHeader } from "@/components/account/ui";

export default function BillingPage() {
  return (
    <>
      <section className={CARD}>
        <CardHeader title="Billing address" />
        <div className="p-5">
          <AddressFields prefix="billing" />
        </div>
      </section>
      <SaveBar />
    </>
  );
}
