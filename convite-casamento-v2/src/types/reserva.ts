export type ReservaPresente = {
  id: number;
  evento_id: number;
  presente_id: number;
  reservado_por: string;
  telefone: string | null;
  telefone_normalizado: string | null;
  nome_normalizado: string | null;
  confirmacao_id: number | null;
  vinculo_origem: "telefone" | "nome" | "manual" | null;
  presente_recebido: boolean;
  presente_recebido_em: string | null;
  created_at: string;
  presentes: {
    nome: string;
    usa_cotas?: boolean | null;
    valor?: string | number | null;
  } | null;
};
