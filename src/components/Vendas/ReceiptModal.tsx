import React from 'react';
import { Sale } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Printer, X, CheckCircle2, ShoppingBag } from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onNewSale?: () => void;
}

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  vale_alimentacao: 'Vale Alimentação / Refeição',
  outro: 'Outro',
};

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  isOpen,
  onClose,
  onNewSale,
}) => {
  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-sm bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden my-6">
        
        {/* Top Header Actions (hidden in print) */}
        <div className="print:hidden flex items-center justify-between px-4 py-3 bg-slate-100 border-b border-slate-200">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Venda Registrada com Sucesso!
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div id="thermal-receipt" className="p-6 font-mono text-xs space-y-4">
          
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Supermercado Gestão Pro
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5">
              CUPOM NÃO FISCAL DE VENDA
            </p>
            <p className="text-[10px] text-slate-500">
              {formatDateTime(sale.data)}
            </p>
            <p className="text-[10px] font-bold text-slate-700 mt-1">
              VENDA Nº #{sale.numero_venda.toString().padStart(6, '0')}
            </p>
          </div>

          {/* Items Table */}
          <div className="space-y-2 border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
              <span>Item / Qtd x Unit</span>
              <span>Total</span>
            </div>

            {sale.itens.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between font-medium text-slate-800">
                  <span className="truncate pr-2">
                    {idx + 1}. {item.nome_produto}
                  </span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
                <div className="text-[10px] text-slate-500 flex justify-between">
                  <span>
                    {item.quantidade} x {formatCurrency(item.preco_unitario)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>

            {sale.desconto > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Desconto:</span>
                <span>-{formatCurrency(sale.desconto)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>TOTAL A PAGAR:</span>
              <span>{formatCurrency(sale.valor_total)}</span>
            </div>

            <div className="flex justify-between text-slate-600 pt-1">
              <span>Forma de Pagamento:</span>
              <span className="font-semibold">{PAYMENT_LABELS[sale.forma_pagamento] || sale.forma_pagamento}</span>
            </div>

            {sale.forma_pagamento === 'dinheiro' && sale.valor_pago && (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Valor Recebido:</span>
                  <span>{formatCurrency(sale.valor_pago)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Troco:</span>
                  <span>{formatCurrency(sale.troco || 0)}</span>
                </div>
              </>
            )}

            {sale.observacoes && (
              <div className="pt-2 text-[10px] text-slate-500">
                <span className="font-semibold">Obs:</span> {sale.observacoes}
              </div>
            )}
          </div>

          {/* Footer message */}
          <div className="text-center text-[10px] text-slate-500 pt-1">
            <p>Obrigado pela preferência!</p>
            <p>Volte Sempre!</p>
          </div>
        </div>

        {/* Action Buttons (hidden in print) */}
        <div className="print:hidden p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Cupom
          </button>
          
          <button
            onClick={() => {
              onClose();
              if (onNewSale) onNewSale();
            }}
            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Nova Venda
          </button>
        </div>
      </div>
    </div>
  );
};
