# Atualização: cores reservadas e refinamento mobile

## O que foi alterado

- painel com lista dinâmica de cores reservadas;
- seletor visual, código hexadecimal e nome de cada cor;
- botões para adicionar e remover cores, com limite de 8;
- bolinhas de cores exibidas no convite;
- dress code mais compacto no celular, com menos aparência de cards empilhados;
- presentes com formulário de reserva recolhido até o convidado escolher reservar;
- animação dos cards de presentes por grupo, sem transformar o container inteiro;
- espaçamentos, imagens e tipografia compactados nas telas de 320 a 640 px;
- correção da formatação de datas da metadata em ambientes com fuso UTC.

## Migration obrigatória

Antes de publicar a versão atual, execute no SQL Editor do Supabase:

`supabase/migrations/20260730_dress_code_reserved_colors.sql`

A migration apenas adiciona a coluna JSONB `dress_code_cores_paleta`, preserva os
dados existentes e define três cores iniciais.

## Validação

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Depois, teste no painel:

1. Configurações → Dress code atualizado.
2. Adicione, remova e altere as cores.
3. Salve e recarregue.
4. Abra o convite em uma nova aba e confirme as bolinhas.
