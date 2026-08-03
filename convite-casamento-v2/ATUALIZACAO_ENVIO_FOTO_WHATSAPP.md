# Atualização — envio de foto no WhatsApp

A composição de mensagens deixou de inserir o link público da imagem no texto.

## Novo comportamento

- A foto selecionada permanece como arquivo local no navegador.
- Em celulares e navegadores com Web Share API para arquivos, o botão **Enviar foto e mensagem** abre o compartilhamento nativo com a imagem anexada e o texto da mensagem.
- O usuário escolhe o WhatsApp na folha de compartilhamento do aparelho.
- Em navegadores que não suportam compartilhamento de arquivos, a foto é baixada e o WhatsApp é aberto apenas com a mensagem, para anexação manual.
- A opção **Abrir só a mensagem** permanece disponível quando há uma foto selecionada.
- O link da imagem não é mais incluído na mensagem.

## Arquivo alterado

- `src/components/admin/confirmations-manager.tsx`

## Banco de dados

Esta atualização não exige migration e não altera o Supabase.
