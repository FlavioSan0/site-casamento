import assert from "node:assert/strict";
import test from "node:test";
import {
  createEventMetadata,
  FALLBACK_DESCRIPTION,
  FALLBACK_TITLE,
} from "../src/lib/metadata.ts";

test("usa os fallbacks profissionais e bloqueia capa insegura", () => {
  const fallback = createEventMetadata();
  assert.equal(fallback.title.absolute, FALLBACK_TITLE);
  assert.equal(fallback.description, FALLBACK_DESCRIPTION);

  const evento = {
    id: 1,
    slug: "flavio-ana-paula",
    nome_evento: "Casamento Flávio & Ana Paula",
    nome_casal: "Flávio & Ana Paula",
    data_evento: "2026-08-15",
    horario_evento: "17:30",
    local_cerimonia: null,
    link_maps_cerimonia: null,
    local_recepcao: null,
    link_maps_recepcao: null,
    ativo: true,
    created_at: "2026-01-01T00:00:00Z",
  };
  const metadata = createEventMetadata(evento, {
    evento_id: 1,
    hero_background_type: "image",
    hero_background_url: "javascript:alert(1)",
  });

  assert.equal(metadata.title.absolute, "Flávio & Ana Paula | Casamento");
  assert.equal(
    metadata.description,
    "Convite digital do casamento de Flávio e Ana Paula, no dia 15 de agosto de 2026.",
  );
  assert.equal(
    metadata.openGraph.images[0].url,
    "/images/casal-principal.jpg",
  );
});
