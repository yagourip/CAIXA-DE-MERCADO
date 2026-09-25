import React, { useState, useRef, useEffect } from 'react';
import { useSupermarket } from '../../context/SupermarketContext';
import { Product, SaleItem, Sale } from '../../types';
import { formatCurrency, playBeep } from '../../utils/formatters';
import { CheckoutModal } from './CheckoutModal';
import { ReceiptModal } from './ReceiptModal';
import {
  ShoppingCart,
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  Package,
  AlertCircle,
  Percent,
  CheckCircle2,
  Layers,
} from 'lucide-react';

interface PDVViewProps {
  onGoToEstoque?: () => void;
}

export const PDVView: React.FC<PDVViewProps> = ({ onGoToEstoque }) => {
  const { products } = useSupermarket();

  const [cart, setCart] = useState<SaleItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [descontoTipo, setDescontoTipo] = useState<'reais' | 'porcentagem'>('reais');
  const [descontoValor, setDescontoValor] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [searchWarning, setSearchWarning] = useState<string | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus barcode input
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Distinct categories
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categoria) set.add(p.categoria);
    });
    return Array.from(set).sort();
  }, [products]);

  // Catalog filtered by category and search
  const visibleProducts = React.useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'todos' || p.categoria === selectedCategory;
      const search = barcodeInput.toLowerCase().trim();
      const matchSearch =
        !search ||
        p.nome.toLowerCase().includes(search) ||
        (p.codigo_barras && p.codigo_barras.toLowerCase().includes(search));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, barcodeInput]);

  // Add product to cart
  const addToCart = (product: Product, quantity = 1) => {
    setSearchWarning(null);

    // Check available stock
    const currentInCart = cart.find((i) => i.produto_id === product.id)?.quantidade || 0;
    if (product.estoque_atual <= currentInCart) {
      setSearchWarning(
        `Atenção: Estoque insuficiente de "${product.nome}". Disponível: ${product.estoque_atual} ${product.unidade}`
      );
    }

    setCart((prev) => {
      const existsIndex = prev.findIndex((i) => i.produto_id === product.id);
      if (existsIndex > -1) {
        const next = [...prev];
        const newQty = next[existsIndex].quantidade + quantity;
        next[existsIndex] = {
          ...next[existsIndex],
          quantidade: newQty,
          subtotal: newQty * next[existsIndex].preco_unitario,
        };
        return next;
      } else {
        return [
          ...prev,
          {
            produto_id: product.id,
            nome_produto: product.nome,
            quantidade: quantity,
            preco_unitario: product.preco_venda,
            preco_custo: product.preco_custo,
            subtotal: quantity * product.preco_venda,
          },
        ];
      }
    });

    playBeep(920, 60);
  };

  // Barcode / Enter submission
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    // Search exact barcode
    let found = products.find((p) => p.codigo_barras && p.codigo_barras === query);

    // If not found by exact barcode, search by exact name or first matching item
    if (!found) {
      found = products.find((p) => p.nome.toLowerCase() === query.toLowerCase());
    }
    if (!found) {
      const candidates = products.filter(
        (p) =>
          p.nome.toLowerCase().includes(query.toLowerCase()) ||
          (p.codigo_barras && p.codigo_barras.includes(query))
      );
      if (candidates.length === 1) {
        found = candidates[0];
      }
    }

    if (found) {
      addToCart(found, 1);
      setBarcodeInput('');
      setSearchWarning(null);
    } else {
      setSearchWarning(`Produto com código ou termo "${query}" não encontrado.`);
    }
  };

  // Change Item Quantity
  const updateQuantity = (produto_id: string, delta: number) => {
    const prod = products.find((p) => p.id === produto_id);

    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.produto_id === produto_id) {
            const nextQty = item.quantidade + delta;
            if (nextQty <= 0) return null;

            if (prod && nextQty > prod.estoque_atual) {
              setSearchWarning(
                `Aviso: Quantidade (${nextQty}) excede o estoque atual de ${prod.estoque_atual} ${prod.unidade}`
              );
            }

            return {
              ...item,
              quantidade: nextQty,
              subtotal: nextQty * item.preco_unitario,
            };
          }
          return item;
        })
        .filter(Boolean) as SaleItem[];
    });
  };

  // Remove Item
  const removeItem = (produto_id: string) => {
    setCart((prev) => prev.filter((i) => i.produto_id !== produto_id));
  };

  // Calculations
  const subtotal = cart.reduce((acc, it) => acc + it.subtotal, 0);
  const totalVolumes = cart.reduce((acc, it) => acc + it.quantidade, 0);

  let discountInReais = 0;
  if (descontoTipo === 'reais') {
    discountInReais = Math.min(subtotal, Math.max(0, descontoValor || 0));
  } else {
    const pct = Math.min(100, Math.max(0, descontoValor || 0));
    discountInReais = (subtotal * pct) / 100;
  }

  const finalTotal = Math.max(0, subtotal - discountInReais);

  const handleClearCart = () => {
    if (cart.length > 0) {
      setCart([]);
      setDescontoValor(0);
      setSearchWarning(null);
    }
  };

  const handleSaleSuccess = (sale: Sale) => {
    setIsCheckoutOpen(false);
    setCompletedSale(sale);
    setIsReceiptOpen(true);
    setCart([]);
    setDescontoValor(0);
  };

  return (
    <div className="space-y-4">
      {/* Top Warning Banner if product database is empty */}
      {products.length === 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Você ainda não cadastrou produtos no estoque. Cadastre seus produtos para começar
              a registrar vendas no caixa.
            </span>
          </div>
          {onGoToEstoque && (
            <button
              onClick={onGoToEstoque}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition shrink-0 cursor-pointer"
            >
              Ir para Estoque
            </button>
          )}
        </div>
      )}

      {/* Main Grid: Catalog / Quick Barcode (Left 60%) + POS Cart (Right 40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Barcode & Catalog (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Barcode scanner input */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <form onSubmit={handleBarcodeSubmit} className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Barcode className="w-4 h-4" />
                  Leitor de Código de Barras / Busca Rápida
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Pressione Enter para bipar direto no caixa
                </span>
              </label>

              <div className="relative">
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Bipe com o leitor ou digite o código/nome do produto..."
                  value={barcodeInput}
                  onChange={(e) => {
                    setBarcodeInput(e.target.value);
                    if (searchWarning) setSearchWarning(null);
                  }}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer"
                >
                  Adicionar
                </button>
              </div>

              {searchWarning && (
                <div className="p-2 bg-amber-950/40 border border-amber-500/30 rounded-lg text-amber-300 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {searchWarning}
                </div>
              )}
            </form>
          </div>

          {/* Quick Categories Filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setSelectedCategory('todos')}
                className={`px-3 py-1.5 rounded-xl border transition whitespace-nowrap cursor-pointer ${
                  selectedCategory === 'todos'
                    ? 'bg-emerald-600 border-emerald-500 text-white font-medium'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Todas ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl border transition whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 border-emerald-500 text-white font-medium'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Quick Selection Product Cards */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                Catálogo Rápido de Produtos
              </span>
              <span>{visibleProducts.length} itens encontrados</span>
            </div>

            {visibleProducts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Nenhum produto cadastrado para exibir no catálogo rápido.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[480px] overflow-y-auto pr-1">
                {visibleProducts.map((p) => {
                  const isEsgotado = p.estoque_atual <= 0;
                  const inCartQty = cart.find((i) => i.produto_id === p.id)?.quantidade || 0;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addToCart(p, 1)}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between group cursor-pointer relative ${
                        isEsgotado
                          ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                          : 'bg-slate-950 border-slate-800 hover:border-emerald-500/60 hover:bg-slate-850'
                      }`}
                    >
                      {inCartQty > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] shadow">
                          {inCartQty} no carrinho
                        </span>
                      )}

                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                          {p.categoria || 'Geral'}
                        </span>
                        <h4 className="font-semibold text-xs text-white line-clamp-2 mt-0.5">
                          {p.nome}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 font-mono">
                          {formatCurrency(p.preco_venda)}
                        </span>
                        <span
                          className={`text-[10px] font-mono ${
                            isEsgotado
                              ? 'text-rose-400'
                              : p.estoque_atual <= p.estoque_minimo
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          Estoque: {p.estoque_atual}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Checkout Cart Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Carrinho da Venda</h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {cart.length} itens ({totalVolumes} volumes)
                  </span>
                </div>
              </div>

              {cart.length > 0 && (
                <button
                  onClick={handleClearCart}
                  className="text-xs text-slate-400 hover:text-rose-400 transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                  Carrinho vazio. Bipe o código ou clique nos produtos para adicionar.
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={item.produto_id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate">
                        {idx + 1}. {item.nome_produto}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {formatCurrency(item.preco_unitario)} cada
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
                      <button
                        onClick={() => updateQuantity(item.produto_id, -1)}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-bold font-mono text-white text-xs">
                        {item.quantidade}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.produto_id, 1)}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div className="text-right min-w-[70px]">
                      <div className="font-bold text-white font-mono">
                        {formatCurrency(item.subtotal)}
                      </div>
                      <button
                        onClick={() => removeItem(item.produto_id)}
                        className="text-[10px] text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Discount Section */}
            {cart.length > 0 && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-emerald-400" />
                    Desconto:
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDescontoTipo('reais')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                        descontoTipo === 'reais'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-950 text-slate-400'
                      }`}
                    >
                      R$
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescontoTipo('porcentagem')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                        descontoTipo === 'porcentagem'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-950 text-slate-400'
                      }`}
                    >
                      %
                    </button>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={descontoValor === 0 ? '' : descontoValor}
                      onChange={(e) => setDescontoValor(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-16 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-right font-mono text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Financial Summary */}
            <div className="pt-3 border-t border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="font-mono text-white">{formatCurrency(subtotal)}</span>
              </div>

              {discountInReais > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>Desconto:</span>
                  <span className="font-mono">-{formatCurrency(discountInReais)}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-slate-800">
                <span>Total a Pagar:</span>
                <span className="text-xl text-emerald-400 font-mono">
                  {formatCurrency(finalTotal)}
                </span>
              </div>
            </div>

            {/* Finalize Button */}
            <button
              onClick={() => setIsCheckoutOpen(true)}
              disabled={cart.length === 0}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-950/60 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              Finalizar Venda ({formatCurrency(finalTotal)})
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cart}
        subtotal={subtotal}
        desconto={discountInReais}
        total={finalTotal}
        onSaleCompleted={handleSaleSuccess}
      />

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        sale={completedSale}
        onClose={() => setIsReceiptOpen(false)}
        onNewSale={() => {
          setIsReceiptOpen(false);
          setCompletedSale(null);
          barcodeInputRef.current?.focus();
        }}
      />
    </div>
  );
};
