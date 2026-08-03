"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import styles from "./admin-shell.module.css";

export function AdminLogoutButton({
  eventoSlug,
  compact = false,
}: {
  eventoSlug: string;
  compact?: boolean;
}) {
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
      className={`${styles.logoutButton} ${
        compact ? styles.logoutButtonCompact : ""
      }`}
      onClick={handleLogout}
      disabled={loading}
      aria-label={loading ? "Saindo do painel" : "Sair do painel"}
    >
      <LogOut className={styles.publicLinkIcon} />
      <span>{loading ? "Saindo..." : compact ? "Sair" : "Sair do painel"}</span>
    </button>
  );
}
