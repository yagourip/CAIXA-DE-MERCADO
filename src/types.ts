export type UnitType = 'UN' | 'KG' | 'G' | 'L' | 'ML' | 'PCT' | 'CX' | 'FD';

export interface Product {
  id: string;
  nome: string;
  codigo_barras: string;
  categoria: string;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  unidade: UnitType;
  created_at: string;
  updated_at?: string;
}

export interface SaleItem {
  produto_id: string;
  nome_produto: string;
  quantidade: number;
  preco_unitario: number;
  preco_custo: number;
  subtotal: number;
}

export type PaymentMethod =
  | 'dinheiro'
  | 'pix'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'vale_alimentacao'
  | 'outro';

export interface Sale {
  id: string;
  numero_venda: number;
  data: string;
  itens: SaleItem[];
  subtotal: number;
  desconto: number;
  valor_total: number;
  forma_pagamento: PaymentMethod;
  valor_pago?: number;
  troco?: number;
  status: 'concluida' | 'cancelada';
  observacoes?: string;
  created_at: string;
}

export interface StockMovement {
  id: string;
  produto_id: string;
  nome_produto: string;
  tipo: 'entrada' | 'saida' | 'ajuste' | 'venda' | 'cancelamento';
  quantidade: number;
  estoque_anterior: number;
  estoque_novo: number;
  motivo: string;
  data: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  lastChecked?: string;
}
