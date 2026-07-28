"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setFeedback("Preencha e-mail e senha.");
      return;
    }

    try {
      setLoading(true);
      setFeedback("");

      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        throw new Error(error.message);
      }

      const params = new URLSearchParams(window.location.search);
      const eventoSlug = params.get("evento") || "flavio-ana-paula";
      const requestedRedirect = params.get("redirect");
      const safeRedirect =
        requestedRedirect?.startsWith("/admin/eventos/") &&
        !requestedRedirect.startsWith("//")
          ? requestedRedirect
          : `/admin/eventos/${encodeURIComponent(eventoSlug)}`;

      router.replace(safeRedirect);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível entrar.";
      setFeedback(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-auth-page">
      <div className="admin-auth-card">
        <span className="section-badge">Painel administrativo</span>
        <h1 className="admin-auth-title">Entrar no painel</h1>
        <p className="admin-auth-description">
          Acesse o painel para editar as informações do evento, RSVP, PIX e
          demais configurações.
        </p>

        <form className="admin-auth-form" onSubmit={handleLogin}>
          <div className="form-field">
            <label htmlFor="admin-email">E-mail</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="admin-password">Senha</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {feedback ? (
            <p className="form-feedback form-feedback--error" role="alert" aria-live="polite">{feedback}</p>
          ) : null}
        </form>
      </div>
    </main>
  );
}
