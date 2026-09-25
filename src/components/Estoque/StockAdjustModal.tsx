import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { useSupermarket } from '../../context/SupermarketContext';
import { X, ArrowUpRight, ArrowDownLeft, Sliders, CheckCircle2 } from 'lucide-react';

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedProduct?: Product | null;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  isOpen,
  onClose,
  preselectedProduct,
}) => {
  const { products, adjustStock } = useSupermarket();

  const [selectedId, setSelectedId] = useState<string>('');
  const [tipo, setTipo] = useState<'entrada' | 'saida' | 'ajuste'>('entrada');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [motivo, setMotivo] = useState<string>('Reposição de estoque / Compra');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedProduct) {
      setSelectedId(preselectedProduct.id);
    } else if (products.length > 0 && !selectedId) {
      setSelectedId(products[0].id);
    }
  }, [preselectedProduct, products]);

  if (!isOpen) return null;

  const currentProduct = products.find((p) => p.id === selectedId);
  const estoqueAtual = currentProduct?.estoque_atual || 0;

  let estoqueResultante = estoqueAtual;
  if (tipo === 'entrada') {
    estoqueResultante = estoqueAtual + (quantidade || 0);
  } else if (tipo === 'saida') {
    estoqueResultante = Math.max(0, estoqueAtual - (quantidade || 0));
  } else {
    estoqueResultante = Math.max(0, quantidade || 0);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct || quantidade < 0) return;

    setIsSubmitting(true);
    try {
      await adjustStock(currentProduct.id, quantidade, tipo, motivo);
      onClose();
    } catch (err) {
      console.error('Erro ao ajustar estoque:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Ajuste de Estoque</h2>
              <p className="text-xs text-slate-400">Entrada, saída ou balanço de inventário</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Produto Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Selecione o Produto
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={!!preselectedProduct}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-teal-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} (Atual: {p.estoque_atual} {p.unidade})
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Movimentação */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Tipo de Operação
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTipo('entrada');
                  setMotivo('Reposição / Compra de Fornecedor');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  tipo === 'entrada'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                + Entrada
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipo('saida');
                  setMotivo('Avaria / Quebra / Validade');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  tipo === 'saida'
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400" />
                - Saída
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipo('ajuste');
                  setMotivo('Contagem / Balanço de Inventário');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  tipo === 'ajuste'
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                Balanço
              </button>
            </div>
          </div>

          {/* Quantidade */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {tipo === 'ajuste' ? 'Novo Estoque Total' : 'Quantidade da Movimentação'}
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0"
                value={quantidade}
                onChange={(e) => setQuantidade(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-teal-500"
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-slate-500">
                {currentProduct?.unidade || 'UN'}
              </span>
            </div>
          </div>

          {/* Preview do Saldo */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Estoque Atual:</span>
            <span className="text-white font-mono">{estoqueAtual} {currentProduct?.unidade}</span>
            <span className="text-slate-500">➔</span>
            <span className="text-slate-400">Após ajuste:</span>
            <span className="font-bold text-emerald-400 font-mono">
              {estoqueResultante} {currentProduct?.unidade}
            </span>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Motivo ou Observação
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Compra NF-e 4521, Quebra, Vencimento..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition cursor-pointer shadow-lg shadow-teal-950/40"
            >
              {isSubmitting ? 'Salvando...' : 'Confirmar Ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
