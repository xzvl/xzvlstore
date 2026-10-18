"use client";

import { ProvinceCityNameFields } from "@/components/AreaFields";
import { useAccount, type Profile } from "./AccountProvider";
import { INPUT, LABEL } from "./ui";

type StringProfileKey = { [K in keyof Profile]: Profile[K] extends string ? K : never }[keyof Profile];

export default function AddressFields({ prefix }: { prefix: "billing" | "shipping" }) {
  const { profile, setField } = useAccount();
  const f = (field: string) => `${prefix}_${field}` as StringProfileKey;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className={LABEL}>Address line 1</label>
        <input value={profile[f("address_1")]} onChange={e => setField(f("address_1"), e.target.value)} placeholder="House No., Street" className={INPUT} />
      </div>
      <div className="sm:col-span-2">
        <label className={LABEL}>Address line 2</label>
        <input value={profile[f("address_2")]} onChange={e => setField(f("address_2"), e.target.value)} placeholder="Barangay, Subdivision" className={INPUT} />
      </div>
      <ProvinceCityNameFields
        prefix={prefix}
        state={profile[f("state")]}
        city={profile[f("city")]}
        onChange={({ state, city }) => { setField(f("state"), state); setField(f("city"), city); }}
        inputClass={() => INPUT}
        labelClass={LABEL}
      />
      <div>
        <label className={LABEL}>Postcode / ZIP</label>
        <input value={profile[f("postcode")]} onChange={e => setField(f("postcode"), e.target.value)} placeholder="1234" className={INPUT} />
      </div>
      <div>
        <label className={LABEL}>Region</label>
        <input value={profile[f("region")]} onChange={e => setField(f("region"), e.target.value)} placeholder="Philippines" className={INPUT} />
      </div>
      <div className="sm:col-span-2">
        <label className={LABEL}>Phone</label>
        <input value={profile[f("phone")]} onChange={e => setField(f("phone"), e.target.value)} placeholder="+63 9XX XXX XXXX" className={INPUT} />
      </div>
    </div>
  );
}
