export type Product = {
  id: string;
  name: string;
  price: number;
  sale_price?: number | null;
  pre_order?: boolean;
  image: string;
  status: "active" | "inactive";
};

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "prod-01",
    name: "BX-51 String Launcher (Black x Green)",
    price: 629,
    image: "/assets/string-launcher.webp",
    status: "inactive",
  },
  {
    id: "prod-02",
    name: "CX-13 Bahamut Blitz BK1-50I",
    price: 999,
    image: "/assets/blitz-bahamut.webp",
    status: "active",
  },
  {
    id: "prod-03",
    name: "CX-14 Knight Fortress GV8-70UN",
    price: 999,
    image: "/assets/knigh-fortress.webp",
    status: "active",
  },
  {
    id: "prod-04",
    name: "CX15 Ragna Rage FE4-55Y",
    price: 649,
    image: "/assets/ragna-rage.webp",
    status: "active",
  },
  {
    id: "prod-05",
    name: "CX-18 Random Booster Brachio Whip Select",
    price: 649,
    image: "/assets/brachio-whip.webp",
    status: "inactive",
  },
  {
    id: "prod-06",
    name: "G1682 Fort Hornet R7-60T",
    price: 1199,
    image: "/assets/fort-hornet.webp",
    status: "active",
  },
  {
    id: "prod-07",
    name: "G1534 Keel Shark 1-60Q",
    price: 899,
    image: "/assets/keel-shark-1-60.webp",
    status: "active",
  },
  {
    id: "prod-08",
    name: "G2738 Stun Medusa 9-60GB",
    price: 1199,
    image: "/assets/stun-medusa.webp",
    status: "inactive",
  },
  {
    id: "prod-09",
    name: "G1669 Tide Whale 5-80E",
    price: 799,
    image: "/assets/tide-whale.webp",
    status: "active",
  },
];

function parseProducts(): Product[] {
  const raw = process.env.NEXT_PUBLIC_PRODUCTS;
  if (!raw) return DEFAULT_PRODUCTS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    console.warn("NEXT_PUBLIC_PRODUCTS is invalid JSON — using defaults.");
  }
  return DEFAULT_PRODUCTS;
}

export const PRODUCTS: Product[] = parseProducts();
