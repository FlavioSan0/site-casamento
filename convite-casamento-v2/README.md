# Convite digital — Flávio & Ana Paula

Convite de casamento com site público e painel administrativo, construído com Next.js, React, TypeScript e Supabase.

## Funcionalidades

- informações da cerimônia e recepção com rotas seguras do Google Maps;
- história, galeria, dress code e contagem regressiva;
- confirmação de presença com acompanhantes;
- presentes, cotas e reservas concorrentes via função SQL;
- PIX e QR Code;
- painel protegido por Supabase Auth e allowlist de e-mails.

## Executar localmente

Requisitos: Node.js 20 ou superior e npm.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`. A página inicial redireciona para o convite ativo.

## Variáveis de ambiente

| Variável | Visibilidade | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Pública | URL canônica, Open Graph e compartilhamento. Localmente use `http://localhost:3000`; na Vercel use a URL de produção sem barra final. |
| `NEXT_PUBLIC_SUPABASE_URL` | Pública | URL do projeto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública | Chave `anon` usada com RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Secreta, somente servidor | APIs administrativas, RSVP, reservas e uploads. Nunca use prefixo `NEXT_PUBLIC_`. |
| `ADMIN_EMAILS` | Somente servidor | E-mails autorizados no painel, separados por vírgula. Obrigatória em produção. |

Não versione `.env.local`. Na Vercel, cadastre as cinco variáveis em **Project Settings → Environment Variables** para Production e Preview.

### URL após o primeiro deploy

1. Faça o primeiro deploy com `NEXT_PUBLIC_SITE_URL` apontando provisoriamente para a URL esperada ou deixe a Vercel usar `VERCEL_PROJECT_PRODUCTION_URL`.
2. Copie a URL estável exibida pela Vercel, por exemplo `https://convite-exemplo.vercel.app`.
3. Defina esse valor em `NEXT_PUBLIC_SITE_URL` nas variáveis de Production e Preview.
4. Faça um novo deploy para que a variável pública seja incorporada ao build.
5. Ao configurar domínio próprio, troque `NEXT_PUBLIC_SITE_URL` pelo domínio final e faça novo deploy.

## Supabase

O projeto conectado já usa a estrutura multi-evento e não requer migration nova para a alteração de metadata.

Para um projeto Supabase novo, faça backup e execute uma única vez no SQL Editor:

```text
supabase/migrations/20260728_v2_full_migration.sql
```

O script existente é idempotente e preserva os dados legados. Não foi criada migration adicional. Confirme também no painel do Supabase:

- cadastro público desabilitado;
- somente os usuários listados em `ADMIN_EMAILS` criados no Auth;
- bucket `event-assets` e políticas RLS existentes;
- URL e chaves copiadas do projeto correto.

Consulte [`MIGRACAO_V2.md`](./MIGRACAO_V2.md) antes de preparar outro banco.

## Validação e build

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Depois do build, teste em celular: compartilhamento no WhatsApp, cerimônia, recepção, RSVP, reserva de presente, login, upload e remoção de reserva.

## Enviar ao GitHub

O repositório Git atual tem este projeto em uma subpasta. A partir da raiz do repositório:

```powershell
git status --short
git add convite-casamento-v2/src convite-casamento-v2/public convite-casamento-v2/supabase convite-casamento-v2/test convite-casamento-v2/.env.example convite-casamento-v2/.gitignore convite-casamento-v2/AGENTS.md convite-casamento-v2/eslint.config.mjs convite-casamento-v2/MIGRACAO_V2.md convite-casamento-v2/next.config.ts convite-casamento-v2/package.json convite-casamento-v2/package-lock.json convite-casamento-v2/postcss.config.mjs convite-casamento-v2/README.md convite-casamento-v2/RELATORIO_MIGRACAO.md convite-casamento-v2/tsconfig.json
git diff --cached
git commit -m "prepare wedding invite metadata and Vercel deploy"
git push -u origin HEAD
```

O arquivo `convite-casamento-v2.zip` não é necessário no repositório e não deve ser incluído no commit.

## Importar na Vercel

1. Acesse **Vercel → Add New → Project**.
2. Importe o repositório do GitHub.
3. Em **Root Directory**, selecione `convite-casamento-v2`.
4. Mantenha **Framework Preset: Next.js** e os comandos detectados (`npm run build`).
5. Cadastre as cinco variáveis da tabela acima.
6. Clique em **Deploy**.
7. Atualize `NEXT_PUBLIC_SITE_URL` com a URL estável e faça um novo deploy.

Não é necessário criar `vercel.json`.
