import { NextResponse } from "next/server";
import { createClient } from "./server";

function getAllowedAdminEmails() {
  return String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function getAuthenticatedUser() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) return null;

    const allowedEmails = getAllowedAdminEmails();
    const userEmail = data.user.email?.trim().toLowerCase();

    if (allowedEmails.length > 0 && (!userEmail || !allowedEmails.includes(userEmail))) {
      return null;
    }

    if (allowedEmails.length === 0 && process.env.NODE_ENV === "production") {
      console.error("ADMIN_EMAILS não foi configurado no ambiente de produção.");
      return null;
    }

    return data.user;
  } catch (error) {
    console.error("Erro ao validar autenticação administrativa:", error);
    return null;
  }
}

export async function requireAdminApiUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sessão expirada, usuário não autorizado ou ADMIN_EMAILS não configurado." },
      { status: 401 },
    );
  }

  return null;
}
