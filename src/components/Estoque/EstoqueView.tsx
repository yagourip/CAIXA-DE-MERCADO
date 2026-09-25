import React, { useState, useMemo } from 'react';
import { useSupermarket } from '../../context/SupermarketContext';
import { Product } from '../../types';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { ProductModal } from './ProductModal';
import { StockAdjustModal } from './StockAdjustModal';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Sliders,
  Edit2,
  Trash2,
  AlertTriangle,
  Download,
  Barcode,
  PackageX,
  TrendingUp,
  Tag,
} from 'lucide-react';

export const EstoqueView: React.FC = () => {
  const { products, deleteProduct } = useSupermarket();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'baixo' | 'zerado' | 'normal'>('todos');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Distinct categories from existing products
  const existingCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.categoria) cats.add(p.categoria);
    });
    return Array.from(cats).sort();
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      const search = searchTerm.toLowerCase().trim();
      const matchSearch =
        !search ||
        p.nome.toLowerCase().includes(search) ||
        (p.codigo_barras && p.codigo_barras.toLowerCase().includes(search)) ||
        (p.categoria && p.categoria.toLowerCase().includes(search));

      // Category
      const matchCat = selectedCategory === 'todas' || p.categoria === selectedCategory;

      // Status
      let matchStatus = true;
      if (statusFilter === 'zerado') {
        matchStatus = p.estoque_atual <= 0;
      } else if (statusFilter === 'baixo') {
        matchStatus = p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo;
      } else if (statusFilter === 'normal') {
        matchStatus = p.estoque_atual > p.estoque_minimo;
      }

      return matchSearch && matchCat && matchStatus;
    });
  }, [products, searchTerm, selectedCategory, statusFilter]);

  // Inventory stats
  const totalItems = products.reduce((acc, p) => acc + (p.estoque_atual || 0), 0);
  const totalCusto = products.reduce((acc, p) => acc + (p.preco_custo || 0) * (p.estoque_atual || 0), 0);
  const totalVenda = products.reduce((acc, p) => acc + (p.preco_venda || 0) * (p.estoque_atual || 0), 0);
  const produtosBaixoEstoque = products.filter(
    (p) => p.estoque_atual <= p.estoque_minimo
  ).length;

  const handleEdit = (prod: Product) => {
    setEditingProduct(prod);
    setIsProductModalOpen(true);
  };

  const handleOpenAdjust = (prod?: Product) => {
    setAdjustProduct(prod || null);
    setIsAdjustModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
    setDeleteConfirmId(null);
  };

  // CSV Export
  const exportToCSV = () => {
    if (products.length === 0) return;
    const headers = [
      'ID',
      'Nome',
      'Codigo_Barras',
      'Categoria',
      'Preco_Custo',
      'Preco_Venda',
      'Estoque_Atual',
      'Estoque_Minimo',
      'Unidade',
    ];
    const rows = products.map((p) => [
      `"${p.id}"`,
      `"${p.nome.replace(/"/g, '""')}"`,
      `"${p.codigo_barras || ''}"`,
      `"${p.categoria || ''}"`,
      p.preco_custo.toFixed(2),
      p.preco_venda.toFixed(2),
      p.estoque_atual,
      p.estoque_minimo,
      `"${p.unidade}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `estoque_supermercado_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-emerald-400" />
            Controle de Estoque & Produtos
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerencie itens, preços, custos, códigos de barras e níveis de inventário.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {products.length > 0 && (
            <>
              <button
                onClick={exportToCSV}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                title="Exportar tabela para CSV"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar CSV
              </button>
              <button
                onClick={() => handleOpenAdjust()}
                className="px-3.5 py-2 bg-teal-900/40 hover:bg-teal-900/60 text-teal-300 border border-teal-500/30 text-xs font-medium rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                Ajustar Estoque
              </button>
            </>
          )}

          <button
            onClick={() => {
              setEditingProduct(null);
              setIsProductModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-950/40 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Produto
          </button>
        </div>
      </div>

      {/* KPI Cards for Inventory */}
      {products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[11px] text-slate-400">Total de Produtos</span>
            <p className="text-lg font-bold text-white mt-1">
              {formatNumber(products.length)}{' '}
              <span className="text-xs font-normal text-slate-400">cadastrados</span>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[11px] text-slate-400">Volumes em Estoque</span>
            <p className="text-lg font-bold text-teal-400 mt-1">
              {formatNumber(totalItems, 1)}{' '}
              <span className="text-xs font-normal text-slate-400">unidades</span>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[11px] text-slate-400">Custo Total Imobilizado</span>
            <p className="text-lg font-bold text-amber-400 mt-1">{formatCurrency(totalCusto)}</p>
            <span className="text-[10px] text-slate-500">
              Venda estimada: {formatCurrency(totalVenda)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[11px] text-slate-400">Alerta de Estoque Baixo</span>
            <p
              className={`text-lg font-bold mt-1 ${
                produtosBaixoEstoque > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {produtosBaixoEstoque}{' '}
              <span className="text-xs font-normal text-slate-400">produtos</span>
            </p>
          </div>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      {products.length > 0 && (
        <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-2xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nome, código de barras ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="todas">Todas as Categorias</option>
              {existingCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80 text-xs">
            <button
              onClick={() => setStatusFilter('todos')}
              className={`px-2.5 py-1 rounded-lg transition ${
                statusFilter === 'todos'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              onClick={() => setStatusFilter('baixo')}
              className={`px-2.5 py-1 rounded-lg transition ${
                statusFilter === 'baixo'
                  ? 'bg-amber-500/20 text-amber-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Baixo
            </button>
            <button
              onClick={() => setStatusFilter('zerado')}
              className={`px-2.5 py-1 rounded-lg transition ${
                statusFilter === 'zerado'
                  ? 'bg-rose-500/20 text-rose-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Zerado
            </button>
          </div>
        </div>
      )}

      {/* Main Table or Empty State */}
      {products.length === 0 ? (
        <div className="py-16 px-6 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Boxes className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">
            Nenhum produto cadastrado no estoque ainda
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
            Como solicitado, o sistema não contém produtos de exemplo ou fictícios. Todas as
            informações serão inseridas por você. Cadastre seus produtos abaixo para começar a
            gerenciar o estoque e realizar vendas no PDV.
          </p>
          <button
            onClick={() => {
              setEditingProduct(null);
              setIsProductModalOpen(true);
            }}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-950/40 transition inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Meu Primeiro Produto
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-12 text-center rounded-2xl border border-slate-800 bg-slate-900/30 text-slate-400 text-xs">
          Nenhum produto encontrado com os filtros aplicados.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg shadow-black/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Código / EAN</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-right">Preço Custo</th>
                  <th className="py-3 px-4 text-right">Preço Venda</th>
                  <th className="py-3 px-4 text-right">Margem</th>
                  <th className="py-3 px-4 text-center">Estoque Atual</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {filteredProducts.map((p) => {
                  const lucro = p.preco_venda - p.preco_custo;
                  const margem = p.preco_custo > 0 ? (lucro / p.preco_custo) * 100 : 0;
                  const isZerado = p.estoque_atual <= 0;
                  const isBaixo = !isZerado && p.estoque_atual <= p.estoque_minimo;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-850/60 transition group"
                    >
                      {/* Código de Barras */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        {p.codigo_barras ? (
                          <span className="flex items-center gap-1">
                            <Barcode className="w-3.5 h-3.5 text-slate-500" />
                            {p.codigo_barras}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Nome */}
                      <td className="py-3.5 px-4 font-medium text-white">
                        <div>{p.nome}</div>
                        <span className="text-[10px] text-slate-500">ID: {p.id.slice(-6)}</span>
                      </td>

                      {/* Categoria */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] border border-slate-700/60">
                          {p.categoria || 'Geral'}
                        </span>
                      </td>

                      {/* Preço Custo */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                        {p.preco_custo > 0 ? formatCurrency(p.preco_custo) : '-'}
                      </td>

                      {/* Preço Venda */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                        {formatCurrency(p.preco_venda)}
                      </td>

                      {/* Margem */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <span
                          className={`text-[11px] ${
                            margem >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {margem.toFixed(0)}%
                        </span>
                      </td>

                      {/* Estoque Atual */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono border ${
                              isZerado
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                : isBaixo
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            {p.estoque_atual} {p.unidade}
                          </span>
                          {isBaixo && (
                            <span
                              title={`Estoque baixo (mínimo: ${p.estoque_minimo})`}
                              className="text-amber-400"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {isZerado && (
                            <span title="Esgotado!" className="text-rose-400">
                              <PackageX className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenAdjust(p)}
                            title="Ajustar estoque (+/-)"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-teal-950/40 border border-transparent hover:border-teal-500/30 transition cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEdit(p)}
                            title="Editar produto"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(p.id)}
                            title="Excluir produto"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 space-y-4">
            <h3 className="font-bold text-sm text-white">Confirmar exclusão?</h3>
            <p className="text-xs text-slate-400">
              Esta ação removerá permanentemente o produto do seu catálogo e do estoque.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Create/Edit Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        productToEdit={editingProduct}
      />

      {/* Stock Adjust Modal */}
      <StockAdjustModal
        isOpen={isAdjustModalOpen}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setAdjustProduct(null);
        }}
        preselectedProduct={adjustProduct}
      />
    </div>
  );
};
