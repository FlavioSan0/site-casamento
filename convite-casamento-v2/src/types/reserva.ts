export type ReservaPresente = {
  id: number;
  evento_id: number;
  presente_id: number;
  reservado_por: string;
  created_at: string;
  presentes: {
    nome: string;
    usa_cotas?: boolean | null;
  } | null;
};
