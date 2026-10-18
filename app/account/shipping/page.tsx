"use client";

import { SaveBar, useAccount } from "@/components/account/AccountProvider";
import AddressFields from "@/components/account/AddressFields";
import { CARD, CardHeader } from "@/components/account/ui";

export default function ShippingPage() {
  const { copyBillingToShipping } = useAccount();
  return (
    <>
      <section className={CARD}>
        <CardHeader
          title="Shipping address"
          action={
            <button
              onClick={copyBillingToShipping}
              className="text-[12px] text-accent/70 hover:text-primary transition-colors flex items-center gap-1 px-2 py-1 border border-line/40"
            >
              <span className="material-symbols-outlined text-[15px]">content_copy</span>
              Copy from billing
            </button>
          }
        />
        <div className="p-5">
          <AddressFields prefix="shipping" />
        </div>
      </section>
      <SaveBar />
    </>
  );
}
