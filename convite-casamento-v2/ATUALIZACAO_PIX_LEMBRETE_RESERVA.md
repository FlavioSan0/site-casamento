# Atualização — PIX automático no lembrete de reserva

A mensagem **Lembrar presente reservado** agora utiliza automaticamente a chave PIX cadastrada em **Configurações/Financeiro**.

## Comportamento

- A chave é carregada de `configuracoes_evento.chave_pix`.
- O bloco PIX é inserido apenas no modelo de lembrete de reserva.
- Caso a chave não esteja cadastrada, o bloco é omitido e a mensagem permanece legível.
- A mensagem continua editável antes do envio.
- Nenhuma migration é necessária.

## Variáveis disponíveis

- `{chave_pix}`: somente o valor da chave.
- `{pix_reserva}`: bloco completo de orientação para pagamento.
