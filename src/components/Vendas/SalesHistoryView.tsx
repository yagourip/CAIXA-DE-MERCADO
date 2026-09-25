import React, { useState } from 'react';
import { useSupermarket } from '../../context/SupermarketContext';
import { Sale } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { ReceiptModal } from './ReceiptModal';
import {
  Receipt,
  Search,
  Printer,
  Ban,
  CheckCircle,
  XCircle,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  UtensilsCrossed,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const PAYMENT_CONFIG: Record<string, { label: string; icon: any }> = {
  dinheiro: { label: 'Dinheiro', icon: Banknote },
  pix: { label: 'PIX', icon: QrCode },
  cartao_credito: { label: 'Cartão Crédito', icon: CreditCard },
  cartao_debito: { label: 'Cartão Débito', icon: CreditCard },
  vale_alimentacao: { label: 'Vale Alim.', icon: UtensilsCrossed },
  outro: { label: 'Outro', icon: HelpCircle },
};

export const SalesHistoryView: React.FC = () => {
  const { sales, cancelSale } = useSupermarket();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterPayment, setFilterPayment] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<Sale | null>(null);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [cancelModalSale, setCancelModalSale] = useState<Sale | null>(null);

  const filteredSales = sales.filter((s) => {
    const search = searchTerm.toLowerCase().trim();
    const matchSearch =
      !search ||
      s.numero_venda.toString().includes(search) ||
      s.id.toLowerCase().includes(search) ||
      s.itens.some((it) => it.nome_produto.toLowerCase().includes(search));

    const matchPayment = filterPayment === 'todos' || s.forma_pagamento === filterPayment;
    const matchStatus = filterStatus === 'todos' || s.status === filterStatus;

    return matchSearch && matchPayment && matchStatus;
  });

  const totalVendido = sales
    .filter((s) => s.status === 'concluida')
    .reduce((acc, s) => acc + s.valor_total, 0);

  const vendasConcluidas = sales.filter((s) => s.status === 'concluida').length;
  const vendasCanceladas = sales.filter((s) => s.status === 'cancelada').length;

  const handleConfirmCancel = async () => {
    if (cancelModalSale) {
      await cancelSale(cancelModalSale.id);
      setCancelModalSale(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-emerald-400" />
            Histórico de Vendas
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Consulte cupons emitidos, reimprima recibos ou cancele vendas com estorno de estoque.
          </p>
        </div>
      </div>

      {/* Sales Summary Cards */}
      {sales.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-400">Total Faturado</span>
            <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">
              {formatCurrency(totalVendido)}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-400">Vendas Concluídas</span>
            <p className="text-xl font-bold text-white mt-1">
              {vendasConcluidas} <span className="text-xs text-slate-400 font-normal">vendas</span>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-400">Vendas Canceladas</span>
            <p className="text-xl font-bold text-rose-400 mt-1">
              {vendasCanceladas} <span className="text-xs text-slate-400 font-normal">estornadas</span>
            </p>
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      {sales.length > 0 && (
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nº da venda, item vendido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="todos">Todos os Pagamentos</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">PIX</option>
              <option value="cartao_debito">Cartão Débito</option>
              <option value="cartao_credito">Cartão Crédito</option>
              <option value="vale_alimentacao">Vale Alimentação</option>
              <option value="outro">Outro</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="todos">Todos os Status</option>
              <option value="concluida">Concluídas</option>
              <option value="cancelada">Canceladas</option>
            </select>
          </div>
        </div>
      )}

      {/* Sales List or Empty State */}
      {sales.length === 0 ? (
        <div className="py-16 px-6 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Receipt className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">
            Nenhuma venda registrada até o momento
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            As vendas que você realizar na aba "Frente de Caixa (PDV)" serão listadas aqui com todos
            os detalhes de itens, valores e comprovantes para impressão.
          </p>
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="py-10 text-center rounded-2xl border border-slate-800 bg-slate-900/30 text-slate-400 text-xs">
          Nenhuma venda encontrada para os filtros aplicados.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSales.map((sale) => {
            const isCancelada = sale.status === 'cancelada';
            const isExpanded = expandedSaleId === sale.id;
            const PaymentInfo = PAYMENT_CONFIG[sale.forma_pagamento] || {
              label: sale.forma_pagamento,
              icon: HelpCircle,
            };
            const PaymentIcon = PaymentInfo.icon;

            return (
              <div
                key={sale.id}
                className={`rounded-2xl border transition overflow-hidden shadow-sm ${
                  isCancelada
                    ? 'bg-slate-950/60 border-rose-900/30 opacity-75'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Sale Row Header */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs font-mono shrink-0 ${
                        isCancelada
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      #{sale.numero_venda.toString().padStart(3, '0')}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          Venda #{sale.numero_venda}
                        </span>
                        {isCancelada ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Cancelada
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Concluída
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {formatDateTime(sale.data)}
                        </span>
                        <span className="flex items-center gap-1">
                          <PaymentIcon className="w-3.5 h-3.5 text-emerald-400" />
                          {PaymentInfo.label}
                        </span>
                        <span>{sale.itens.length} itens</span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Amount and actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    <div className="text-right">
                      <div
                        className={`text-base font-bold font-mono ${
                          isCancelada ? 'text-slate-400 line-through' : 'text-emerald-400'
                        }`}
                      >
                        {formatCurrency(sale.valor_total)}
                      </div>
                      {sale.desconto > 0 && (
                        <span className="text-[10px] text-rose-400">
                          Desc: {formatCurrency(sale.desconto)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedReceiptSale(sale)}
                        title="Ver / Imprimir Cupom"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {!isCancelada && (
                        <button
                          onClick={() => setCancelModalSale(sale)}
                          title="Cancelar venda e estornar estoque"
                          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-500/30 transition cursor-pointer"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                        title={isExpanded ? 'Recolher detalhes' : 'Ver itens da venda'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Items */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
                    <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Itens desta venda:
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {sale.itens.map((it, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center"
                        >
                          <div>
                            <span className="font-medium text-white">{it.nome_produto}</span>
                            <div className="text-[10px] text-slate-400">
                              {it.quantidade} x {formatCurrency(it.preco_unitario)}
                            </div>
                          </div>
                          <span className="font-mono font-semibold text-slate-200">
                            {formatCurrency(it.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {sale.observacoes && (
                      <p className="text-xs text-slate-400 italic pt-1">
                        Observação: {sale.observacoes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-400" />
              Cancelar Venda #{cancelModalSale.numero_venda}?
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              O cancelamento mudará o status da venda e{' '}
              <strong className="text-emerald-400">
                devolverá automaticamente todos os itens ao estoque
              </strong>
              . Deseja continuar?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelModalSale(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition cursor-pointer"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={!!selectedReceiptSale}
        sale={selectedReceiptSale}
        onClose={() => setSelectedReceiptSale(null)}
      />
    </div>
  );
};
