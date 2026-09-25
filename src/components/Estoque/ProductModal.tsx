import React, { useState, useEffect } from 'react';
import { Product, UnitType } from '../../types';
import { useSupermarket } from '../../context/SupermarketContext';
import { X, Barcode, DollarSign, Package, AlertTriangle, Sparkles } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

const CATEGORIAS_SUGERIDAS = [
  'Mercearia',
  'Bebidas',
  'Laticínios & Frios',
  'Hortifrúti',
  'Açougue & Carnes',
  'Padaria & Confeitaria',
  'Higiene & Beleza',
  'Limpeza Doméstica',
  'Enlatados & Conservas',
  'Snacks & Doces',
  'Congelados',
  'Pet Shop',
  'Bazar & Utilidades',
  'Outros',
];

const UNIDADES: { value: UnitType; label: string }[] = [
  { value: 'UN', label: 'Unidade (UN)' },
  { value: 'KG', label: 'Quilograma (KG)' },
  { value: 'G', label: 'Grama (G)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'ML', label: 'Mililitro (ML)' },
  { value: 'PCT', label: 'Pacote (PCT)' },
  { value: 'CX', label: 'Caixa (CX)' },
  { value: 'FD', label: 'Fardo (FD)' },
];

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
}) => {
  const { addProduct, updateProduct, products } = useSupermarket();

  const [nome, setNome] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [categoria, setCategoria] = useState('Mercearia');
  const [precoCusto, setPrecoCusto] = useState<number>(0);
  const [precoVenda, setPrecoVenda] = useState<number>(0);
  const [estoqueAtual, setEstoqueAtual] = useState<number>(0);
  const [estoqueMinimo, setEstoqueMinimo] = useState<number>(5);
  const [unidade, setUnidade] = useState<UnitType>('UN');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setNome(productToEdit.nome);
      setCodigoBarras(productToEdit.codigo_barras || '');
      setCategoria(productToEdit.categoria || 'Mercearia');
      setPrecoCusto(productToEdit.preco_custo || 0);
      setPrecoVenda(productToEdit.preco_venda || 0);
      setEstoqueAtual(productToEdit.estoque_atual || 0);
      setEstoqueMinimo(productToEdit.estoque_minimo || 5);
      setUnidade(productToEdit.unidade || 'UN');
    } else {
      setNome('');
      setCodigoBarras('');
      setCategoria('Mercearia');
      setPrecoCusto(0);
      setPrecoVenda(0);
      setEstoqueAtual(0);
      setEstoqueMinimo(5);
      setUnidade('UN');
    }
    setErrors({});
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const generateBarcode = () => {
    // Generate 12 digits + random code
    const rand = Math.floor(100000000000 + Math.random() * 900000000000);
    setCodigoBarras(rand.toString());
  };

  const lucroUnitario = precoVenda - precoCusto;
  const margemLucro = precoCusto > 0 ? (lucroUnitario / precoCusto) * 100 : 0;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!nome.trim()) {
      errs.nome = 'Nome do produto é obrigatório.';
    }
    if (precoVenda <= 0) {
      errs.precoVenda = 'Preço de venda deve ser maior que zero.';
    }
    if (estoqueAtual < 0) {
      errs.estoqueAtual = 'Estoque não pode ser negativo.';
    }
    // Check barcode duplication
    if (codigoBarras.trim()) {
      const duplicate = products.find(
        (p) => p.codigo_barras === codigoBarras.trim() && p.id !== productToEdit?.id
      );
      if (duplicate) {
        errs.codigoBarras = `Código já cadastrado no produto "${duplicate.nome}".`;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (productToEdit) {
        await updateProduct(productToEdit.id, {
          nome: nome.trim(),
          codigo_barras: codigoBarras.trim(),
          categoria,
          preco_custo: Number(precoCusto),
          preco_venda: Number(precoVenda),
          estoque_atual: Number(estoqueAtual),
          estoque_minimo: Number(estoqueMinimo),
          unidade,
        });
      } else {
        await addProduct({
          nome: nome.trim(),
          codigo_barras: codigoBarras.trim(),
          categoria,
          preco_custo: Number(precoCusto),
          preco_venda: Number(precoVenda),
          estoque_atual: Number(estoqueAtual),
          estoque_minimo: Number(estoqueMinimo),
          unidade,
        });
      }
      onClose();
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 overflow-hidden my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {productToEdit ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h2>
              <p className="text-xs text-slate-400">
                Preencha os dados do item para o seu controle de estoque e PDV.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Nome */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Nome do Produto <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Arroz Tipo 1 5kg, Leite Integral 1L..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              autoFocus
            />
            {errors.nome && <p className="text-rose-400 text-xs mt-1">{errors.nome}</p>}
          </div>

          {/* Código de Barras & Unidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span>Código de Barras / SKU</span>
                <button
                  type="button"
                  onClick={generateBarcode}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" /> Gerar código
                </button>
              </label>
              <div className="relative">
                <Barcode className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Ex: 7891234567890"
                  value={codigoBarras}
                  onChange={(e) => setCodigoBarras(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              {errors.codigoBarras && (
                <p className="text-rose-400 text-xs mt-1">{errors.codigoBarras}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Unidade de Medida
              </label>
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value as UnitType)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                {UNIDADES.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Categoria
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                list="categorias-list"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Selecione ou digite..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
              />
              <datalist id="categorias-list">
                {CATEGORIAS_SUGERIDAS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Preços e Margem */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Preços & Lucratividade
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Preço de Custo (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={precoCusto === 0 ? '' : precoCusto}
                    onChange={(e) => setPrecoCusto(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Preço de Venda (R$) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={precoVenda === 0 ? '' : precoVenda}
                    onChange={(e) => setPrecoVenda(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                {errors.precoVenda && (
                  <p className="text-rose-400 text-xs mt-1">{errors.precoVenda}</p>
                )}
              </div>
            </div>

            {/* Margem Preview */}
            <div className="flex items-center justify-between text-xs pt-1 px-1 text-slate-400">
              <span>
                Lucro estimado:{' '}
                <strong
                  className={lucroUnitario >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                >
                  R$ {lucroUnitario.toFixed(2)}
                </strong>
              </span>
              <span>
                Markup:{' '}
                <strong
                  className={margemLucro >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                >
                  {margemLucro.toFixed(1)}%
                </strong>
              </span>
            </div>
          </div>

          {/* Estoques */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {productToEdit ? 'Estoque Atual' : 'Estoque Inicial'}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={estoqueAtual}
                onChange={(e) => setEstoqueAtual(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
              {errors.estoqueAtual && (
                <p className="text-rose-400 text-xs mt-1">{errors.estoqueAtual}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Estoque Mínimo (Alerta)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={estoqueMinimo}
                onChange={(e) => setEstoqueMinimo(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Dispara aviso quando atingir essa quantia
              </span>
            </div>
          </div>

          {/* Buttons */}
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition cursor-pointer shadow-lg shadow-emerald-950/40"
            >
              {isSubmitting ? 'Salvando...' : productToEdit ? 'Atualizar Produto' : 'Cadastrar Produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
