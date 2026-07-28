import { redirect } from "next/navigation";
import { FALLBACK_SLUG } from "../lib/metadata";

export default function HomePage() {
  redirect(`/evento/${FALLBACK_SLUG}`);
}
