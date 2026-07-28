"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import styles from "./admin-shell.module.css";

export function AdminLogoutButton({ eventoSlug }: { eventoSlug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    try {
      setLoading(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace(`/admin/login?evento=${encodeURIComponent(eventoSlug)}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className={styles.logoutButton}
      onClick={handleLogout}
      disabled={loading}
    >
      <LogOut className={styles.publicLinkIcon} />
      <span>{loading ? "Saindo..." : "Sair do painel"}</span>
    </button>
  );
}
