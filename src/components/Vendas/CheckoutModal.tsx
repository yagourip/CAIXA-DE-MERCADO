import React, { useState } from 'react';
import { PaymentMethod, SaleItem, Sale } from '../../types';
import { useSupermarket } from '../../context/SupermarketContext';
import { formatCurrency, playSuccessChime } from '../../utils/formatters';
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  UtensilsCrossed,
  HelpCircle,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: SaleItem[];
  subtotal: number;
  desconto: number;
  total: number;
  onSaleCompleted: (sale: Sale) => void;
}

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; icon: any }[] = [
  { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { id: 'pix', label: 'PIX', icon: QrCode },
  { id: 'cartao_debito', label: 'Cartão Débito', icon: CreditCard },
  { id: 'cartao_credito', label: 'Cartão Crédito', icon: CreditCard },
  { id: 'vale_alimentacao', label: 'Vale Alim./Ref.', icon: UtensilsCrossed },
  { id: 'outro', label: 'Outro', icon: HelpCircle },
];

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  subtotal,
  desconto,
  total,
  onSaleCompleted,
}) => {
  const { createSale } = useSupermarket();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [cashGiven, setCashGiven] = useState<number | string>(total);
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const numCashGiven = typeof cashGiven === 'number' ? cashGiven : parseFloat(cashGiven) || 0;
  const troco = paymentMethod === 'dinheiro' ? Math.max(0, numCashGiven - total) : 0;
  const isCashInsufficient = paymentMethod === 'dinheiro' && numCashGiven < total;

  const handleQuickCash = (amount: number) => {
    setCashGiven(amount);
  };

  const handleAddBill = (val: number) => {
    setCashGiven((prev) => {
      const current = typeof prev === 'number' ? prev : parseFloat(prev) || 0;
      return current + val;
    });
  };

  const handleConfirm = async () => {
    if (cartItems.length === 0 || isSubmitting) return;
    if (isCashInsufficient) return;

    setIsSubmitting(true);
    try {
      const sale = await createSale({
        itens: cartItems,
        subtotal,
        desconto,
        valor_total: total,
        forma_pagamento: paymentMethod,
        valor_pago: paymentMethod === 'dinheiro' ? numCashGiven : total,
        troco: paymentMethod === 'dinheiro' ? troco : 0,
        observacoes: observacoes.trim() || undefined,
      });

      playSuccessChime();
      onSaleCompleted(sale);
    } catch (err) {
      console.error('Erro ao finalizar venda:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 overflow-hidden my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Finalizar Venda</h2>
              <p className="text-xs text-slate-400">Escolha o método de pagamento e confirme</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Total Display */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
            <span className="text-xs uppercase text-slate-400 font-semibold tracking-wider">
              Total da Venda
            </span>
            <div className="text-3xl font-extrabold text-emerald-400 font-mono">
              {formatCurrency(total)}
            </div>
            {desconto > 0 && (
              <span className="text-xs text-rose-400">
                (Desconto aplicado de {formatCurrency(desconto)})
              </span>
            )}
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PAYMENT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = paymentMethod === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(opt.id);
                      if (opt.id === 'dinheiro') {
                        setCashGiven(total);
                      }
                    }}
                    className={`p-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-2 transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/40'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash calculation */}
          {paymentMethod === 'dinheiro' && (
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Valor Recebido em Dinheiro
                </label>
                <button
                  type="button"
                  onClick={() => handleQuickCash(total)}
                  className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                >
                  Valor Exato ({formatCurrency(total)})
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-500">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashGiven}
                  onChange={(e) => setCashGiven(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono font-bold text-base focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Quick Bill shortcuts */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-500 mr-1">+ Cédula:</span>
                {[5, 10, 20, 50, 100].map((bill) => (
                  <button
                    key={bill}
                    type="button"
                    onClick={() => handleAddBill(bill)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono transition cursor-pointer"
                  >
                    +{bill}
                  </button>
                ))}
              </div>

              {/* Troco Result */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <span className="text-xs text-slate-300">Troco a devolver:</span>
                <span
                  className={`text-lg font-bold font-mono ${
                    isCashInsufficient ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {isCashInsufficient ? 'Valor insuficiente' : formatCurrency(troco)}
                </span>
              </div>
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Observação da Venda (Opcional)
            </label>
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Cliente VIP, Entrega no balcão..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              Voltar ao Carrinho
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || isCashInsufficient}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-emerald-950/40 flex items-center gap-2"
            >
              {isSubmitting ? 'Registrando...' : 'Confirmar e Baixar Estoque'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
