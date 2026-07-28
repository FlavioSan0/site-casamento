import type { Metadata } from "next";
import {
  createEventMetadata,
  FALLBACK_COUPLE,
  FALLBACK_TITLE,
} from "../lib/metadata";
import "./globals.css";

const fallbackMetadata = createEventMetadata();

export const metadata: Metadata = {
  ...fallbackMetadata,
  title: {
    default: FALLBACK_TITLE,
    template: `%s | ${FALLBACK_COUPLE}`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
