# Valor automático e baixa de presentes

Esta atualização adiciona:

- valor do presente preenchido automaticamente nas mensagens de reserva;
- resumo com nome e valor para uma ou várias reservas;
- status de entrega por reserva;
- ação **Dar baixa** e **Desfazer baixa**;
- data e hora do recebimento;
- filtros para presentes pendentes e recebidos;
- modelo de agradecimento para presentes já recebidos;
- chave PIX mantida automaticamente no lembrete de reserva.

## Migration obrigatória

Execute no SQL Editor do Supabase:

`supabase/migrations/20260803_gift_delivery_status.sql`

A migration é aditiva e não remove reservas existentes.
