import React, { useState, useMemo } from 'react';
import { useSupermarket } from '../../context/SupermarketContext';
import { formatCurrency, formatNumber, formatDate, formatDateTime } from '../../utils/formatters';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  Award,
  CreditCard,
  Banknote,
  QrCode,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  Sparkles,
  PieChart,
  BarChart3,
  Clock,
} from 'lucide-react';

interface DashboardViewProps {
  onGoToEstoque: () => void;
  onGoToPDV: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onGoToEstoque,
  onGoToPDV,
}) => {
  const { products, sales, movements } = useSupermarket();

  const [periodoFiltro, setPeriodoFiltro] = useState<'hoje' | '7dias' | '30dias' | 'tudo'>('tudo');

  // Filter sales according to period
  const filteredSales = useMemo(() => {
    const validSales = sales.filter((s) => s.status === 'concluida');
    if (periodoFiltro === 'tudo') return validSales;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (periodoFiltro === 'hoje') {
      return validSales.filter((s) => new Date(s.data).getTime() >= startOfToday);
    }
    if (periodoFiltro === '7dias') {
      const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      return validSales.filter((s) => new Date(s.data).getTime() >= sevenDaysAgo);
    }
    if (periodoFiltro === '30dias') {
      const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      return validSales.filter((s) => new Date(s.data).getTime() >= thirtyDaysAgo);
    }
    return validSales;
  }, [sales, periodoFiltro]);

  // Overall Financial KPIs
  const faturamentoTotal = filteredSales.reduce((acc, s) => acc + s.valor_total, 0);
  const totalDescontos = filteredSales.reduce((acc, s) => acc + (s.desconto || 0), 0);
  const quantidadeVendas = filteredSales.length;
  const ticketMedio = quantidadeVendas > 0 ? faturamentoTotal / quantidadeVendas : 0;

  // Cost and Gross Profit of sold items
  let custoMercadoriasVendidas = 0;
  filteredSales.forEach((s) => {
    s.itens.forEach((it) => {
      custoMercadoriasVendidas += (it.preco_custo || 0) * it.quantidade;
    });
  });
  const lucroEstimado = faturamentoTotal - custoMercadoriasVendidas;
  const margemLucroGeral =
    faturamentoTotal > 0 ? (lucroEstimado / faturamentoTotal) * 100 : 0;

  // Inventory snapshot KPIs
  const totalProdutosCadastrados = products.length;
  const totalVolumesEstoque = products.reduce((acc, p) => acc + (p.estoque_atual || 0), 0);
  const patrimonioCusto = products.reduce(
    (acc, p) => acc + (p.preco_custo || 0) * (p.estoque_atual || 0),
    0
  );
  const patrimonioVenda = products.reduce(
    (acc, p) => acc + (p.preco_venda || 0) * (p.estoque_atual || 0),
    0
  );

  // Critical stock alert
  const produtosCriticos = products.filter(
    (p) => p.estoque_atual <= p.estoque_minimo
  );

  // Top Selling Products ranking
  const topProdutos = useMemo(() => {
    const map = new Map<string, { nome: string; quantidade: number; receita: number }>();

    filteredSales.forEach((s) => {
      s.itens.forEach((it) => {
        const current = map.get(it.produto_id) || {
          nome: it.nome_produto,
          quantidade: 0,
          receita: 0,
        };
        current.quantidade += it.quantidade;
        current.receita += it.subtotal;
        map.set(it.produto_id, current);
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }, [filteredSales]);

  // Payment Breakdown
  const pagamentosBreakdown = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    filteredSales.forEach((s) => {
      const method = s.forma_pagamento;
      if (!map[method]) map[method] = { total: 0, count: 0 };
      map[method].total += s.valor_total;
      map[method].count += 1;
    });

    return Object.entries(map).map(([metodo, data]) => ({
      metodo,
      total: data.total,
      count: data.count,
      percentual: faturamentoTotal > 0 ? (data.total / faturamentoTotal) * 100 : 0,
    })).sort((a, b) => b.total - a.total);
  }, [filteredSales, faturamentoTotal]);

  // Sales grouped by date (for visual chart)
  const vendasPorDia = useMemo(() => {
    const map = new Map<string, number>();

    // Sort ascending
    const sorted = [...filteredSales].sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
    );

    sorted.forEach((s) => {
      const dia = formatDate(s.data);
      map.set(dia, (map.get(dia) || 0) + s.valor_total);
    });

    return Array.from(map.entries()).map(([dia, total]) => ({ dia, total }));
  }, [filteredSales]);

  const maxVendaDia = Math.max(...vendasPorDia.map((v) => v.total), 1);

  // If absolutely no products and no sales have been registered yet:
  const isCompletelyEmpty = products.length === 0 && sales.length === 0;

  return (
    <div className="space-y-6">
      
      {/* Dashboard Header & Period Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            Dashboard & Relatórios Gerenciais
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Métricas em tempo real calculadas exclusivamente com base nas informações cadastradas por você.
          </p>
        </div>

        {!isCompletelyEmpty && (
          <div className="flex items-center gap-1 bg-slate-900 p-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-[11px] text-slate-500 px-2 font-medium">Período:</span>
            <button
              onClick={() => setPeriodoFiltro('hoje')}
              className={`px-2.5 py-1 rounded-lg transition ${
                periodoFiltro === 'hoje'
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriodoFiltro('7dias')}
              className={`px-2.5 py-1 rounded-lg transition ${
                periodoFiltro === '7dias'
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              7 Dias
            </button>
            <button
              onClick={() => setPeriodoFiltro('30dias')}
              className={`px-2.5 py-1 rounded-lg transition ${
                periodoFiltro === '30dias'
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              30 Dias
            </button>
            <button
              onClick={() => setPeriodoFiltro('tudo')}
              className={`px-2.5 py-1 rounded-lg transition ${
                periodoFiltro === 'tudo'
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos os Tempos
            </button>
          </div>
        )}
      </div>

      {/* Empty State Banner (Clean Slate - No Mock Data) */}
      {isCompletelyEmpty ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/30">
            <Sparkles className="w-8 h-8" />
          </div>

          <div className="max-w-lg mx-auto space-y-2">
            <h2 className="text-xl font-bold text-white">
              Seu Sistema de Supermercado está Pronto!
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Conforme sua instrução, <strong>nenhuma informação de modelo foi criada</strong>. O
              banco está completamente limpo para você cadastrar seus próprios produtos, preços e
              efetuar suas vendas reais.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto pt-2">
            <button
              onClick={onGoToEstoque}
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 text-left transition group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <Boxes className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition" />
                <span className="text-[10px] text-emerald-400 font-semibold">Passo 1</span>
              </div>
              <h3 className="text-sm font-bold text-white">1. Cadastrar Produtos</h3>
              <p className="text-xs text-slate-400 mt-1">
                Adicione produtos com preço de custo, venda, código de barras e estoque inicial.
              </p>
            </button>

            <button
              onClick={onGoToPDV}
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-850 text-left transition group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <ShoppingCart className="w-5 h-5 text-teal-400 group-hover:scale-110 transition" />
                <span className="text-[10px] text-teal-400 font-semibold">Passo 2</span>
              </div>
              <h3 className="text-sm font-bold text-white">2. Frente de Caixa (PDV)</h3>
              <p className="text-xs text-slate-400 mt-1">
                Realize vendas com leitor de código, troco automático e cupom impresso.
              </p>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Main Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Faturamento Total */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Faturamento
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-white font-mono">
                  {formatCurrency(faturamentoTotal)}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                  <span>{quantidadeVendas} vendas no período</span>
                  {totalDescontos > 0 && (
                    <span className="text-rose-400 text-[11px]">
                      (-{formatCurrency(totalDescontos)} desc.)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Lucro Bruto Estimado */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Lucro Estimado
                </span>
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div
                  className={`text-2xl font-black font-mono ${
                    lucroEstimado >= 0 ? 'text-teal-400' : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(lucroEstimado)}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                  <span>Margem líquida:</span>
                  <span className="font-bold text-teal-400 font-mono">
                    {margemLucroGeral.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Ticket Médio */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Ticket Médio
                </span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <ShoppingCart className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-white font-mono">
                  {formatCurrency(ticketMedio)}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Média gasta por cliente/venda
                </div>
              </div>
            </div>

            {/* Card 4: Patrimônio em Estoque */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Estoque em Mercadoria
                </span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Boxes className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-amber-400 font-mono">
                  {formatCurrency(patrimonioCusto)}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                  <span>Venda projetada:</span>
                  <span className="font-bold text-white font-mono">
                    {formatCurrency(patrimonioVenda)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts & Breakdown Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Sales Chart (8 cols) */}
            <div className="lg:col-span-8 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    Vendas por Período
                  </h3>
                  <p className="text-xs text-slate-400">
                    Evolução do faturamento das vendas registradas
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {formatCurrency(faturamentoTotal)}
                </span>
              </div>

              {vendasPorDia.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Nenhuma venda concluída no período selecionado.
                </div>
              ) : (
                <div className="pt-4 space-y-3">
                  <div className="h-44 flex items-end gap-3 pt-4 px-2 border-b border-slate-800">
                    {vendasPorDia.map((item, idx) => {
                      const heightPercent = Math.max(12, (item.total / maxVendaDia) * 100);
                      return (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                        >
                          {/* Tooltip on hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition absolute -top-8 px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-[10px] font-mono text-emerald-400 whitespace-nowrap shadow-lg pointer-events-none z-10">
                            {formatCurrency(item.total)}
                          </div>

                          {/* Bar */}
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className="w-full max-w-[48px] rounded-t-lg bg-gradient-to-t from-emerald-700 to-teal-500 group-hover:from-emerald-600 group-hover:to-teal-400 transition"
                          />
                          <span className="text-[10px] font-mono text-slate-400 truncate w-full text-center">
                            {item.dia.slice(0, 5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 px-1">
                    <span>Valores diários consolidados</span>
                    <span>Fonte: Registros do PDV</span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Methods Breakdown (4 cols) */}
            <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-400" />
                  Formas de Pagamento
                </h3>
                <p className="text-xs text-slate-400">Distribuição do faturamento por método</p>
              </div>

              {pagamentosBreakdown.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Nenhum recebimento registrado.
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {pagamentosBreakdown.map((item) => (
                    <div key={item.metodo} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="capitalize text-slate-300 font-medium">
                          {item.metodo.replace('_', ' ')} ({item.count})
                        </span>
                        <span className="font-mono text-white font-bold">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                        <div
                          style={{ width: `${item.percentual}%` }}
                          className="h-full bg-emerald-500 rounded-full"
                        />
                      </div>
                      <div className="text-right text-[10px] text-slate-500 font-mono">
                        {item.percentual.toFixed(1)}% do total
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ranking Top Products & Low Stock Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Top Products (6 cols) */}
            <div className="lg:col-span-6 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-400" />
                    Produtos Mais Vendidos
                  </h3>
                  <p className="text-xs text-slate-400">Ranking por volume e receita gerada</p>
                </div>
              </div>

              {topProdutos.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  Nenhuma venda realizada ainda para gerar o ranking.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {topProdutos.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs font-mono shrink-0 ${
                            idx === 0
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : idx === 1
                              ? 'bg-slate-700 text-slate-200'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {idx + 1}º
                        </span>
                        <div className="truncate">
                          <p className="font-semibold text-white truncate">{item.nome}</p>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {item.quantidade} unidades vendidas
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono font-bold text-emerald-400 shrink-0">
                        {formatCurrency(item.receita)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Critical Stock Alert (6 cols) */}
            <div className="lg:col-span-6 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Alerta de Reposição de Estoque
                  </h3>
                  <p className="text-xs text-slate-400">
                    Produtos atingindo ou abaixo do estoque mínimo
                  </p>
                </div>
                <button
                  onClick={onGoToEstoque}
                  className="text-xs text-emerald-400 hover:underline cursor-pointer"
                >
                  Ver Estoque Completo
                </button>
              </div>

              {produtosCriticos.length === 0 ? (
                <div className="py-10 text-center text-xs text-emerald-400/80 bg-emerald-950/20 rounded-xl border border-emerald-500/20">
                  ✓ Todos os produtos cadastrados estão com estoque saudável!
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {produtosCriticos.map((p) => {
                    const isEsgotado = p.estoque_atual <= 0;
                    return (
                      <div
                        key={p.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          isEsgotado
                            ? 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                            : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-white">{p.nome}</p>
                          <span className="text-[10px] text-slate-400">
                            Mínimo configurado: {p.estoque_minimo} {p.unidade}
                          </span>
                        </div>

                        <div className="text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full font-mono font-bold text-xs ${
                              isEsgotado ? 'bg-rose-500/30 text-rose-200' : 'bg-amber-500/30 text-amber-200'
                            }`}
                          >
                            {p.estoque_atual} {p.unidade}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Stock Movements Log */}
          {movements.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  Últimas Movimentações de Estoque
                </h3>
                <span className="text-xs text-slate-400">{movements.length} registradas</span>
              </div>

              <div className="divide-y divide-slate-800/80 text-xs">
                {movements.slice(0, 5).map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`p-1.5 rounded-lg ${
                          m.tipo === 'entrada' || m.tipo === 'cancelamento'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : m.tipo === 'venda'
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {m.tipo === 'entrada' || m.tipo === 'cancelamento' ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <div>
                        <span className="font-semibold text-white">{m.nome_produto}</span>
                        <div className="text-[10px] text-slate-400">
                          {m.motivo} &bull; {formatDateTime(m.data)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <span
                        className={`font-bold ${
                          m.tipo === 'entrada' || m.tipo === 'cancelamento'
                            ? 'text-emerald-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {m.tipo === 'entrada' || m.tipo === 'cancelamento' ? '+' : '-'}
                        {m.quantidade}
                      </span>
                      <div className="text-[10px] text-slate-500">
                        {m.estoque_anterior} ➔ {m.estoque_novo}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
