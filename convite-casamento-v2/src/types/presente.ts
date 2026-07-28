export type Presente = {
  id: number;
  evento_id: number;
  nome: string;
  valor: string | null;
  descricao: string | null;
  imagem_url: string | null;
  usa_cotas: boolean;
  quantidade_total: number;
  quantidade_reservada: number;
  status: string | null;
  created_at?: string;
};