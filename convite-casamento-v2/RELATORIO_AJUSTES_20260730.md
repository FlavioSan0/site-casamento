# Relatório de ajustes — 30/07/2026

## Implementado

- paleta dinâmica de cores reservadas no painel;
- adicionar e remover até 8 cores;
- seletor visual, nome e código hexadecimal;
- bolinhas acessíveis no convite público;
- fallback com azul-marinho, bordô e verde;
- seção de dress code compactada no mobile;
- redução de cards internos e de espaçamentos;
- presentes com formulário de reserva recolhível;
- animação dos presentes por item, sem transformar o container completo;
- ajustes mobile em hero, contagem regressiva, história, galeria e cards;
- correção de data da metadata em ambientes UTC;
- testes para normalização e validação das cores.

## Banco de dados

Aplicar antes do deploy:

`supabase/migrations/20260730_dress_code_reserved_colors.sql`

A migration adiciona a coluna `dress_code_cores_paleta` sem apagar dados.

## Validação executada neste ambiente

- testes: 14/14 aprovados;
- verificação sintática dos arquivos TypeScript/TSX alterados: aprovada;
- busca por secrets comuns: nenhum encontrado.

O lint, typecheck e build completos não puderam ser executados aqui porque o
registro interno de pacotes não disponibilizou uma dependência durante `npm ci`.
Execute as validações localmente após `npm ci`.
