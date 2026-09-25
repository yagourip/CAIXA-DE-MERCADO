import React, { useState } from 'react';
import { SupermarketProvider, useSupermarket } from './context/SupermarketContext';
import { Navbar, NavTab } from './components/Navbar';
import { EstoqueView } from './components/Estoque/EstoqueView';
import { PDVView } from './components/Vendas/PDVView';
import { SalesHistoryView } from './components/Vendas/SalesHistoryView';
import { DashboardView } from './components/Dashboard/DashboardView';
import { SupabaseModal } from './components/SupabaseModal';
import { ProductModal } from './components/Estoque/ProductModal';
import { Loader2 } from 'lucide-react';

function SupermarketApp() {
  const { isLoading } = useSupermarket();

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
        <p className="text-sm font-semibold text-white">Carregando Supermercado Gestão Pro...</p>
        <span className="text-xs text-slate-500 mt-1">Conectando aos dados e inicializando</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenNewProductModal={() => setIsProductModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            onGoToEstoque={() => setActiveTab('estoque')}
            onGoToPDV={() => setActiveTab('vendas')}
          />
        )}

        {activeTab === 'estoque' && <EstoqueView />}

        {activeTab === 'vendas' && (
          <PDVView onGoToEstoque={() => setActiveTab('estoque')} />
        )}

        {activeTab === 'historico' && <SalesHistoryView />}
      </main>

      {/* Global Modals */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <SupermarketProvider>
      <SupermarketApp />
    </SupermarketProvider>
  );
}
