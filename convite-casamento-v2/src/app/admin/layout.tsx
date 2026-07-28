import type { Metadata } from "next";
import { FALLBACK_COUPLE } from "../../lib/metadata";

export const metadata: Metadata = {
  title: { absolute: `Painel | ${FALLBACK_COUPLE}` },
  description: "Painel administrativo do casamento de Flávio e Ana.",
  alternates: { canonical: null },
  openGraph: null,
  twitter: null,
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
