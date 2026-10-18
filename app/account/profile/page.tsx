"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabase-client";
import { SaveBar, useAccount, validateFacebook } from "@/components/account/AccountProvider";
import { CARD, CardHeader, INPUT, LABEL, PRIMARY_BTN } from "@/components/account/ui";

export default function ProfilePage() {
  const { profile, setField, facebookError, setFacebookError } = useAccount();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { setPwError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setPwError("Passwords do not match."); return; }
    setPwSaving(true); setPwError(""); setPwMsg("");
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    if (error) {
      setPwError(error.message);
    } else {
      setPwMsg("Password updated.");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwMsg(""), 3000);
    }
    setPwSaving(false);
  };

  return (
    <>
      <section className={CARD}>
        <CardHeader title="Personal information" />
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>First name</label>
            <input value={profile.first_name} onChange={e => setField("first_name", e.target.value)} placeholder="Juan" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Last name</label>
            <input value={profile.last_name} onChange={e => setField("last_name", e.target.value)} placeholder="Dela Cruz" className={INPUT} />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL}>Email</label>
            <input value={profile.email} disabled placeholder="—" className={`${INPUT} opacity-50 cursor-not-allowed`} />
            <p className="text-[11px] text-accent/60 mt-1">Email cannot be changed here.</p>
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL}>Facebook link <span className="text-red-400">*</span></label>
            <input
              value={profile.facebook_url}
              onChange={e => { setField("facebook_url", e.target.value); if (facebookError) setFacebookError(""); }}
              onBlur={() => setFacebookError(validateFacebook(profile.facebook_url))}
              placeholder="https://facebook.com/username"
              className={`${INPUT} ${facebookError ? "border-red-500/70" : ""}`}
            />
            {facebookError && <p className="text-[11px] text-red-400 mt-1">{facebookError}</p>}
          </div>
        </div>
      </section>

      <section className={CARD}>
        <CardHeader title="Change password" />
        <form onSubmit={changePassword} className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className={INPUT}
            />
          </div>
          {pwError && <p className="sm:col-span-2 text-[12px] text-red-400">{pwError}</p>}
          {pwMsg && <p className="sm:col-span-2 text-[12px] text-emerald-400">{pwMsg}</p>}
          <div className="sm:col-span-2">
            <button type="submit" disabled={pwSaving} className={PRIMARY_BTN}>
              {pwSaving && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
              {pwSaving ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </section>

      <SaveBar />
    </>
  );
}
