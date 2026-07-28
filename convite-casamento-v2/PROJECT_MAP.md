# Mapa técnico

## Stack e comandos

- Next.js 16 App Router, React 19, TypeScript 5 e Tailwind CSS 4.
- Supabase Auth, Postgres, Storage e clientes SSR.
- Ícones: `lucide-react`; utilitários CSS: `clsx` e `tailwind-merge`.
- Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Estrutura

- `src/app/evento/[slug]`: convite público e metadata dinâmica.
- `src/app/admin`: login e módulos protegidos do painel.
- `src/app/api`: RSVP, reservas e APIs administrativas.
- `src/components/event`: hero, abertura, reveal, história, galeria, RSVP, presentes e PIX.
- `src/components/admin`: shell, formulários, gestores, cards e acessibilidade de modais.
- `src/services`: leituras do Supabase separadas por domínio.
- `src/lib/supabase`: clientes anon, SSR, admin e validação de ambiente.
- `src/lib/utils`: mapas, telefone e moeda.
- `src/types`: contratos das entidades.
- `supabase/migrations`: migration V2 existente; não executar sem autorização.

## Rotas

- Pública: `/evento/[slug]`.
- Login: `/admin/login`.
- Painel: `/admin/eventos/[slug]`.
- Módulos: `/configuracoes`, `/convidados`, `/financeiro` e `/layout`.
- Públicas: `POST /api/rsvp` e `POST /api/reservas`.
- Administrativas: `/api/admin/{evento-config,confirmacoes,presentes,reservas,layout-config,historia-config,historia,galeria,upload}`.

## Fluxos críticos

- Configurações usam `PATCH /api/admin/{evento-config,layout-config,historia-config}`.
- `src/lib/utils/config-patch.ts` aplica allowlist: campo ausente não muda; campo desconhecido é rejeitado.
- `src/lib/supabase/patch-event-config.ts` atualiza `updated_at`, retorna o registro completo e detecta conflito entre versões.

- `src/proxy.ts` atualiza sessão; layouts e APIs administrativas validam usuário e allowlist.
- `SUPABASE_SERVICE_ROLE_KEY` é somente servidor. Nunca importar `admin.ts` em Client Components.
- RSVP valida evento ativo, prazo, limites e nomes no servidor.
- Reservas preferem a RPC atômica `reservar_presente`; há fallback compatível com bancos V2 ainda não migrados.
- Uploads passam pela API administrativa autenticada; URLs públicas apontam para Supabase Storage.
- Links de localização passam por `src/lib/utils/maps.ts`, que bloqueia protocolos e hosts inseguros.

## UI e convenções

- Modelos: `classic`, `romantic`, `minimal`, `editorial`, `photographic` e `contemporary`.
- Presets e preview do Layout são locais; só persistem no salvamento explícito.

- Cores e modelos públicos vêm de `configuracoes_evento`; não fixar identidade da agência.
- `EventOpening` coordena a carta (`checking → entering → opening → revealing → closing → complete`), entrada do hero e liberação dos `Reveal`; usa `animationend`, fallback de segurança e a chave `wedding-opening-seen:{slug}` por sessão.
- Todos os `Reveal` compartilham um único `IntersectionObserver`; somente wrappers animam `opacity`/`translate`, enquanto cards preservam suas microinterações internas.
- Imagens públicas usam `next/image`; previews administrativos temporários podem manter `<img>`.
- Inputs móveis usam 16 px, alvos interativos têm no mínimo 44 px e modais usam `100dvh`, trap e retorno de foco.
- Reutilizar componentes existentes e evitar novas dependências para CSS, animação ou formulários.

## Banco e integrações

- Entidades centrais: `eventos`, `configuracoes_evento`, `confirmacoes`, `presentes`, `reservas_presentes`, `galeria_evento` e `historia_momentos`.
- Integrações: Supabase Auth/Postgres/Storage, Google Maps/Waze e Vercel.
- RLS e políticas de Storage pertencem ao Supabase conectado e não devem ser alteradas nesta aplicação sem revisão específica.

## Riscos e restrições

- Não executar migration, apagar dados, alterar RLS, commit, push ou deploy sem autorização explícita.
- O fallback de reserva é menos forte que a RPC; manter a função SQL disponível em produção.
- Há avisos de lint deliberados para `<img>` em previews/listagens administrativas com URLs temporárias ou configuráveis.
- Testes destrutivos de CRUD e uploads exigem ambiente isolado; não usar dados reais para automação.
- Preservar rotas, slugs, metadata, URLs públicas e contratos Supabase existentes.
