# Atualização — convidados, reservas e mensagens

Esta versão relaciona confirmações e reservas pelo telefone normalizado e reúne os dados no painel de convidados.

## Recursos incluídos

- telefone obrigatório no RSVP e na reserva de presentes;
- relacionamento automático entre confirmação e reserva;
- atualização da confirmação existente quando o mesmo telefone envia novo RSVP;
- indicadores de reservas relacionadas e pendentes;
- filtros por presença e reserva;
- visualização de presentes dentro do card do convidado;
- botão para preparar mensagem no WhatsApp;
- modelos de lembrete, confirmação recebida, presente reservado, reserva sem confirmação, proximidade do casamento e atualização de local;
- mensagem editável antes do envio;
- foto/arte opcional enviada ao Storage e incluída na mensagem por link;
- painel financeiro com telefone, vínculo ao RSVP e ação de mensagem.

## Migration obrigatória

Execute no SQL Editor do Supabase:

`supabase/migrations/20260730_guest_reservations_and_messages.sql`

A migration preserva registros existentes e tenta relacionar dados antigos que já possuem o mesmo telefone.

## Observação sobre fotos no WhatsApp

O link `wa.me` não permite pré-anexar um arquivo. A imagem enviada pelo painel recebe uma URL pública, que é incluída na mensagem. O painel também permite abrir a imagem para anexá-la manualmente no WhatsApp.

## Complemento de 01/08/2026 — reservas antigas por nome

Reservas anteriores à coleta de telefone agora podem ser relacionadas pelo nome normalizado do convidado principal ou acompanhante. A associação só ocorre quando existe uma única confirmação compatível no evento; homônimos permanecem pendentes. Execute `supabase/migrations/20260801_match_legacy_reservations_by_name.sql` antes do deploy.
