import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Product, Sale, StockMovement, SupabaseConfig, PaymentMethod } from '../types';
import {
  getStoredConfig,
  saveStoredConfig,
  getSupabaseClient,
  getLocalProducts,
  saveLocalProducts,
  getLocalSales,
  saveLocalSales,
  getLocalMovements,
  saveLocalMovements,
} from '../lib/supabase';

interface SupermarketContextType {
  products: Product[];
  sales: Sale[];
  movements: StockMovement[];
  isLoading: boolean;
  isSyncing: boolean;
  supabaseConfig: SupabaseConfig;
  lastSyncTime: Date | null;
  syncError: string | null;
  
  // Actions
  addProduct: (product: Omit<Product, 'id' | 'created_at'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustStock: (
    productId: string,
    quantityChange: number,
    tipo: 'entrada' | 'saida' | 'ajuste',
    motivo: string
  ) => Promise<void>;
  createSale: (saleData: {
    itens: { produto_id: string; nome_produto: string; quantidade: number; preco_unitario: number; preco_custo: number; subtotal: number }[];
    subtotal: number;
    desconto: number;
    valor_total: number;
    forma_pagamento: PaymentMethod;
    valor_pago?: number;
    troco?: number;
    observacoes?: string;
  }) => Promise<Sale>;
  cancelSale: (saleId: string) => Promise<void>;
  updateSupabaseCredentials: (url: string, anonKey: string) => Promise<{ success: boolean; message: string; tablesExist: boolean }>;
  syncLocalToSupabase: () => Promise<{ success: boolean; message: string }>;
  fetchFromSupabase: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

const SupermarketContext = createContext<SupermarketContextType | undefined>(undefined);

export const SupermarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(getStoredConfig());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Initialize data (Zero mock data - loads from Supabase or LocalStorage)
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setSyncError(null);

    const client = getSupabaseClient();
    if (client) {
      try {
        // Attempt to fetch from Supabase
        const [prodRes, salesRes, movRes] = await Promise.all([
          client.from('produtos').select('*').order('nome', { ascending: true }),
          client.from('vendas').select('*').order('data', { ascending: false }),
          client.from('movimentacoes_estoque').select('*').order('data', { ascending: false }),
        ]);

        if (prodRes.error || salesRes.error) {
          throw new Error(prodRes.error?.message || salesRes.error?.message);
        }

        // Fetch items for sales
        const salesData: Sale[] = [];
        if (salesRes.data && salesRes.data.length > 0) {
          const { data: itemsData } = await client.from('itens_venda').select('*');
          
          for (const s of salesRes.data) {
            const saleItems = (itemsData || [])
              .filter((it: any) => it.venda_id === s.id)
              .map((it: any) => ({
                produto_id: it.produto_id,
                nome_produto: it.nome_produto,
                quantidade: Number(it.quantidade),
                preco_unitario: Number(it.preco_unitario),
                preco_custo: Number(it.preco_custo || 0),
                subtotal: Number(it.subtotal),
              }));

            salesData.push({
              id: s.id,
              numero_venda: s.numero_venda,
              data: s.data,
              itens: saleItems,
              subtotal: Number(s.subtotal),
              desconto: Number(s.desconto || 0),
              valor_total: Number(s.valor_total),
              forma_pagamento: s.forma_pagamento,
              valor_pago: s.valor_pago ? Number(s.valor_pago) : undefined,
              troco: s.troco ? Number(s.troco) : undefined,
              status: s.status || 'concluida',
              observacoes: s.observacoes,
              created_at: s.created_at,
            });
          }
        }

        const prodsFormatted = (prodRes.data || []).map((p: any) => ({
          ...p,
          preco_custo: Number(p.preco_custo || 0),
          preco_venda: Number(p.preco_venda),
          estoque_atual: Number(p.estoque_atual || 0),
          estoque_minimo: Number(p.estoque_minimo || 0),
        }));

        setProducts(prodsFormatted);
        setSales(salesData);
        setMovements(movRes.data || []);
        saveLocalProducts(prodsFormatted);
        saveLocalSales(salesData);
        saveLocalMovements(movRes.data || []);
        setLastSyncTime(new Date());
        setSupabaseConfig((prev) => ({ ...prev, isConnected: true }));
      } catch (err: any) {
        console.warn('Supabase não respondeu ou tabelas não criadas, carregando dados locais:', err);
        setSyncError(err.message || 'Erro ao sincronizar com Supabase');
        // Fallback to local storage (which starts empty)
        setProducts(getLocalProducts());
        setSales(getLocalSales());
        setMovements(getLocalMovements());
      }
    } else {
      // Local storage fallback
      setProducts(getLocalProducts());
      setSales(getLocalSales());
      setMovements(getLocalMovements());
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Keep localStorage synced whenever state changes
  const updateLocalAndStateProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    saveLocalProducts(newProducts);
  };

  const updateLocalAndStateSales = (newSales: Sale[]) => {
    setSales(newSales);
    saveLocalSales(newSales);
  };

  const updateLocalAndStateMovements = (newMovements: StockMovement[]) => {
    setMovements(newMovements);
    saveLocalMovements(newMovements);
  };

  // Add Product
  const addProduct = async (productData: Omit<Product, 'id' | 'created_at'>): Promise<Product> => {
    const id = `PROD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const newProduct: Product = {
      ...productData,
      id,
      created_at: new Date().toISOString(),
    };

    const nextProducts = [...products, newProduct];
    updateLocalAndStateProducts(nextProducts);

    // If initial stock > 0, log movement
    if (newProduct.estoque_atual > 0) {
      const mov: StockMovement = {
        id: `MOV-${Date.now()}`,
        produto_id: newProduct.id,
        nome_produto: newProduct.nome,
        tipo: 'entrada',
        quantidade: newProduct.estoque_atual,
        estoque_anterior: 0,
        estoque_novo: newProduct.estoque_atual,
        motivo: 'Cadastro inicial de produto',
        data: new Date().toISOString(),
      };
      updateLocalAndStateMovements([mov, ...movements]);

      const client = getSupabaseClient();
      if (client) {
        client.from('movimentacoes_estoque').insert([mov]).then();
      }
    }

    // Supabase Sync
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('produtos').insert([{
          id: newProduct.id,
          nome: newProduct.nome,
          codigo_barras: newProduct.codigo_barras,
          categoria: newProduct.categoria,
          preco_custo: newProduct.preco_custo,
          preco_venda: newProduct.preco_venda,
          estoque_atual: newProduct.estoque_atual,
          estoque_minimo: newProduct.estoque_minimo,
          unidade: newProduct.unidade,
          created_at: newProduct.created_at,
        }]);
      } catch (e) {
        console.error('Erro ao salvar produto no Supabase:', e);
      }
    }

    return newProduct;
  };

  // Update Product
  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const targetProduct = products.find((p) => p.id === id);
    if (!targetProduct) return;

    const updatedProduct = {
      ...targetProduct,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const nextProducts = products.map((p) => (p.id === id ? updatedProduct : p));
    updateLocalAndStateProducts(nextProducts);

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('produtos').update(updates).eq('id', id);
      } catch (e) {
        console.error('Erro ao atualizar produto no Supabase:', e);
      }
    }
  };

  // Delete Product
  const deleteProduct = async (id: string) => {
    const nextProducts = products.filter((p) => p.id !== id);
    updateLocalAndStateProducts(nextProducts);

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('produtos').delete().eq('id', id);
      } catch (e) {
        console.error('Erro ao excluir produto no Supabase:', e);
      }
    }
  };

  // Quick Stock Adjustment
  const adjustStock = async (
    productId: string,
    quantityChange: number,
    tipo: 'entrada' | 'saida' | 'ajuste',
    motivo: string
  ) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    let novoEstoque = prod.estoque_atual;
    if (tipo === 'entrada') {
      novoEstoque += Math.abs(quantityChange);
    } else if (tipo === 'saida') {
      novoEstoque = Math.max(0, novoEstoque - Math.abs(quantityChange));
    } else {
      // ajuste direto
      novoEstoque = Math.max(0, quantityChange);
    }

    const mov: StockMovement = {
      id: `MOV-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      produto_id: prod.id,
      nome_produto: prod.nome,
      tipo,
      quantidade: tipo === 'ajuste' ? Math.abs(novoEstoque - prod.estoque_atual) : Math.abs(quantityChange),
      estoque_anterior: prod.estoque_atual,
      estoque_novo: novoEstoque,
      motivo: motivo || 'Ajuste manual de estoque',
      data: new Date().toISOString(),
    };

    updateLocalAndStateMovements([mov, ...movements]);

    // Update product stock
    await updateProduct(productId, { estoque_atual: novoEstoque });

    const client = getSupabaseClient();
    if (client) {
      client.from('movimentacoes_estoque').insert([mov]).then();
    }
  };

  // Create Sale (PDV)
  const createSale = async (saleData: {
    itens: { produto_id: string; nome_produto: string; quantidade: number; preco_unitario: number; preco_custo: number; subtotal: number }[];
    subtotal: number;
    desconto: number;
    valor_total: number;
    forma_pagamento: PaymentMethod;
    valor_pago?: number;
    troco?: number;
    observacoes?: string;
  }): Promise<Sale> => {
    const saleId = `VENDA-${Date.now()}`;
    const nextNumber = sales.length > 0 ? Math.max(...sales.map((s) => s.numero_venda || 0)) + 1 : 1;
    const nowIso = new Date().toISOString();

    const newSale: Sale = {
      id: saleId,
      numero_venda: nextNumber,
      data: nowIso,
      itens: saleData.itens,
      subtotal: saleData.subtotal,
      desconto: saleData.desconto,
      valor_total: saleData.valor_total,
      forma_pagamento: saleData.forma_pagamento,
      valor_pago: saleData.valor_pago,
      troco: saleData.troco,
      status: 'concluida',
      observacoes: saleData.observacoes,
      created_at: nowIso,
    };

    // 1. Decrement products stock & register movements
    const updatedProductsList = [...products];
    const newMovementsList: StockMovement[] = [...movements];

    for (const item of saleData.itens) {
      const pIndex = updatedProductsList.findIndex((p) => p.id === item.produto_id);
      if (pIndex !== -1) {
        const p = updatedProductsList[pIndex];
        const novoEstoque = Math.max(0, p.estoque_atual - item.quantidade);
        updatedProductsList[pIndex] = {
          ...p,
          estoque_atual: novoEstoque,
          updated_at: nowIso,
        };

        const mov: StockMovement = {
          id: `MOV-VND-${Date.now()}-${item.produto_id.slice(-4)}`,
          produto_id: item.produto_id,
          nome_produto: item.nome_produto,
          tipo: 'venda',
          quantidade: item.quantidade,
          estoque_anterior: p.estoque_atual,
          estoque_novo: novoEstoque,
          motivo: `Venda #${nextNumber}`,
          data: nowIso,
        };
        newMovementsList.unshift(mov);

        // Update individual product in Supabase if online
        const client = getSupabaseClient();
        if (client) {
          client.from('produtos').update({ estoque_atual: novoEstoque }).eq('id', item.produto_id).then();
          client.from('movimentacoes_estoque').insert([mov]).then();
        }
      }
    }

    updateLocalAndStateProducts(updatedProductsList);
    updateLocalAndStateMovements(newMovementsList);

    const nextSales = [newSale, ...sales];
    updateLocalAndStateSales(nextSales);

    // Save sale to Supabase
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('vendas').insert([{
          id: newSale.id,
          numero_venda: newSale.numero_venda,
          data: newSale.data,
          subtotal: newSale.subtotal,
          desconto: newSale.desconto,
          valor_total: newSale.valor_total,
          forma_pagamento: newSale.forma_pagamento,
          valor_pago: newSale.valor_pago,
          troco: newSale.troco,
          status: newSale.status,
          observacoes: newSale.observacoes,
          created_at: newSale.created_at,
        }]);

        const itemsToInsert = newSale.itens.map((it) => ({
          venda_id: newSale.id,
          produto_id: it.produto_id,
          nome_produto: it.nome_produto,
          quantidade: it.quantidade,
          preco_unitario: it.preco_unitario,
          preco_custo: it.preco_custo,
          subtotal: it.subtotal,
        }));

        await client.from('itens_venda').insert(itemsToInsert);
      } catch (err) {
        console.error('Erro ao persistir venda no Supabase:', err);
      }
    }

    return newSale;
  };

  // Cancel Sale (Restores stock)
  const cancelSale = async (saleId: string) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale || sale.status === 'cancelada') return;

    const nowIso = new Date().toISOString();
    const updatedProductsList = [...products];
    const newMovementsList: StockMovement[] = [...movements];

    // Restore stock for all items
    for (const item of sale.itens) {
      const pIndex = updatedProductsList.findIndex((p) => p.id === item.produto_id);
      if (pIndex !== -1) {
        const p = updatedProductsList[pIndex];
        const novoEstoque = p.estoque_atual + item.quantidade;
        updatedProductsList[pIndex] = {
          ...p,
          estoque_atual: novoEstoque,
          updated_at: nowIso,
        };

        const mov: StockMovement = {
          id: `MOV-CANC-${Date.now()}-${item.produto_id.slice(-4)}`,
          produto_id: item.produto_id,
          nome_produto: item.nome_produto,
          tipo: 'cancelamento',
          quantidade: item.quantidade,
          estoque_anterior: p.estoque_atual,
          estoque_novo: novoEstoque,
          motivo: `Cancelamento da Venda #${sale.numero_venda}`,
          data: nowIso,
        };
        newMovementsList.unshift(mov);

        const client = getSupabaseClient();
        if (client) {
          client.from('produtos').update({ estoque_atual: novoEstoque }).eq('id', item.produto_id).then();
          client.from('movimentacoes_estoque').insert([mov]).then();
        }
      }
    }

    updateLocalAndStateProducts(updatedProductsList);
    updateLocalAndStateMovements(newMovementsList);

    const nextSales = sales.map((s) =>
      s.id === saleId ? { ...s, status: 'cancelada' as const } : s
    );
    updateLocalAndStateSales(nextSales);

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('vendas').update({ status: 'cancelada' }).eq('id', saleId);
      } catch (err) {
        console.error('Erro ao atualizar status da venda no Supabase:', err);
      }
    }
  };

  // Configure Supabase Credentials
  const updateSupabaseCredentials = async (
    url: string,
    anonKey: string
  ): Promise<{ success: boolean; message: string; tablesExist: boolean }> => {
    setIsSyncing(true);
    setSyncError(null);

    const newConfig: SupabaseConfig = {
      url: url.trim(),
      anonKey: anonKey.trim(),
      isConnected: false,
      lastChecked: new Date().toISOString(),
    };

    saveStoredConfig(newConfig);
    setSupabaseConfig(newConfig);

    const { testSupabaseConnection } = await import('../lib/supabase');
    const result = await testSupabaseConnection(newConfig.url, newConfig.anonKey);

    if (result.success) {
      newConfig.isConnected = true;
      saveStoredConfig(newConfig);
      setSupabaseConfig(newConfig);
      if (result.tablesExist) {
        await loadInitialData();
      }
    } else {
      setSyncError(result.message);
    }

    setIsSyncing(false);
    return result;
  };

  // Upload Local Data to Supabase
  const syncLocalToSupabase = async (): Promise<{ success: boolean; message: string }> => {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, message: 'Supabase não está configurado.' };
    }

    setIsSyncing(true);
    try {
      // 1. Upload products
      if (products.length > 0) {
        const prodData = products.map((p) => ({
          id: p.id,
          nome: p.nome,
          codigo_barras: p.codigo_barras,
          categoria: p.categoria,
          preco_custo: p.preco_custo,
          preco_venda: p.preco_venda,
          estoque_atual: p.estoque_atual,
          estoque_minimo: p.estoque_minimo,
          unidade: p.unidade,
          created_at: p.created_at,
        }));
        const { error: pErr } = await client.from('produtos').upsert(prodData, { onConflict: 'id' });
        if (pErr) throw pErr;
      }

      // 2. Upload sales
      if (sales.length > 0) {
        const salesData = sales.map((s) => ({
          id: s.id,
          numero_venda: s.numero_venda,
          data: s.data,
          subtotal: s.subtotal,
          desconto: s.desconto,
          valor_total: s.valor_total,
          forma_pagamento: s.forma_pagamento,
          valor_pago: s.valor_pago,
          troco: s.troco,
          status: s.status,
          observacoes: s.observacoes,
          created_at: s.created_at,
        }));
        const { error: sErr } = await client.from('vendas').upsert(salesData, { onConflict: 'id' });
        if (sErr) throw sErr;

        // Upload items
        const allItems: any[] = [];
        for (const s of sales) {
          for (const it of s.itens) {
            allItems.push({
              venda_id: s.id,
              produto_id: it.produto_id,
              nome_produto: it.nome_produto,
              quantidade: it.quantidade,
              preco_unitario: it.preco_unitario,
              preco_custo: it.preco_custo,
              subtotal: it.subtotal,
            });
          }
        }
        if (allItems.length > 0) {
          const { error: itErr } = await client.from('itens_venda').insert(allItems);
          if (itErr) console.warn('Aviso itens:', itErr);
        }
      }

      // 3. Upload movements
      if (movements.length > 0) {
        const { error: mErr } = await client.from('movimentacoes_estoque').upsert(movements, { onConflict: 'id' });
        if (mErr) throw mErr;
      }

      setLastSyncTime(new Date());
      setIsSyncing(false);
      return { success: true, message: 'Dados sincronizados com o Supabase com sucesso!' };
    } catch (err: any) {
      setIsSyncing(false);
      return { success: false, message: `Erro ao sincronizar: ${err.message}` };
    }
  };

  const clearAllData = async () => {
    setProducts([]);
    setSales([]);
    setMovements([]);
    saveLocalProducts([]);
    saveLocalSales([]);
    saveLocalMovements([]);

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('itens_venda').delete().neq('id', 0);
        await client.from('vendas').delete().neq('id', 'NONE');
        await client.from('movimentacoes_estoque').delete().neq('id', 'NONE');
        await client.from('produtos').delete().neq('id', 'NONE');
      } catch (e) {
        console.error('Erro ao limpar Supabase:', e);
      }
    }
  };

  return (
    <SupermarketContext.Provider
      value={{
        products,
        sales,
        movements,
        isLoading,
        isSyncing,
        supabaseConfig,
        lastSyncTime,
        syncError,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        createSale,
        cancelSale,
        updateSupabaseCredentials,
        syncLocalToSupabase,
        fetchFromSupabase: loadInitialData,
        clearAllData,
      }}
    >
      {children}
    </SupermarketContext.Provider>
  );
};

export const useSupermarket = () => {
  const context = useContext(SupermarketContext);
  if (!context) {
    throw new Error('useSupermarket deve ser usado dentro de um SupermarketProvider');
  }
  return context;
};
