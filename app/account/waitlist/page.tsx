"use client";

import { useAccount } from "@/components/account/AccountProvider";
import ProductList from "@/components/account/ProductList";

export default function WaitlistPage() {
  const { waitlist, removeFromList } = useAccount();
  return (
    <ProductList
      title="Waitlist"
      subtitle="Sold-out and upcoming products you've asked to be notified about."
      emptyIcon="notifications"
      emptyText="You're not on any waitlists."
      items={waitlist}
      removeLabel="Leave"
      onRemove={(id) => removeFromList("waitlist", id)}
    />
  );
}
