"use client";

import { useAccount } from "@/components/account/AccountProvider";
import ProductList from "@/components/account/ProductList";

export default function FavoritesPage() {
  const { favorites, removeFromList } = useAccount();
  return (
    <ProductList
      title="Favorites"
      subtitle="Products you've favorited. Tap the heart on a product page to add more."
      emptyIcon="favorite"
      emptyText="You haven't favorited anything yet."
      items={favorites}
      removeLabel="Remove"
      onRemove={(id) => removeFromList("favorites", id)}
    />
  );
}
