import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, Sale, StockMovement, SupabaseConfig } from '../types';

const STORAGE_KEY_CONFIG = 'supermercado_supabase_config';
const STORAGE_KEY_PRODUCTS = 'supermercado_produtos';
const STORAGE_KEY_SALES = 'supermercado_vendas';
const STORAGE_KEY_MOVEMENTS = 'supermercado_movimentacoes';

export const SUPABASE_SCHEMA_SQL = `-- ==============================================================================
-- SCRIPT COMPLETO DE BANCO DE DADOS E ARMAZENAMENTO (STORAGE) NO SUPABASE
-- Execute este script no SQL Editor do seu projeto Supabase (supabase.com)
-- ==============================================================================

-- 1. TABELA DE PRODUTOS
create table if not exists public.produtos (
  id text primary key,
  nome text not null,
  codigo_barras text,
  categoria text default 'Geral',
  preco_custo numeric(12, 2) default 0,
  preco_venda numeric(12, 2) not null,
  estoque_atual numeric(12, 3) default 0,
  estoque_minimo numeric(12, 3) default 0,
  unidade text default 'UN',
  foto_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. TABELA DE VENDAS
create table if not exists public.vendas (
  id text primary key,
  numero_venda integer not null,
  data timestamp with time zone default timezone('utc'::text, now()) not null,
  subtotal numeric(12, 2) not null,
  desconto numeric(12, 2) default 0,
  valor_total numeric(12, 2) not null,
  forma_pagamento text not null,
  valor_pago numeric(12, 2),
  troco numeric(12, 2),
  status text default 'concluida',
  observacoes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. TABELA DE ITENS DA VENDA
create table if not exists public.itens_venda (
  id bigint generated always as identity primary key,
  venda_id text references public.vendas(id) on delete cascade,
  produto_id text,
  nome_produto text not null,
  quantidade numeric(12, 3) not null,
  preco_unitario numeric(12, 2) not null,
  preco_custo numeric(12, 2) default 0,
  subtotal numeric(12, 2) not null
);

-- 4. TABELA DE HISTÓRICO DE MOVIMENTAÇÕES DE ESTOQUE
create table if not exists public.movimentacoes_estoque (
  id text primary key,
  produto_id text not null,
  nome_produto text not null,
  tipo text not null,
  quantidade numeric(12, 3) not null,
  estoque_anterior numeric(12, 3) not null,
  estoque_novo numeric(12, 3) not null,
  motivo text,
  data timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 5. ATIVAÇÃO DE POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS) NAS TABELAS
-- ==============================================================================

alter table public.produtos enable row level security;
alter table public.vendas enable row level security;
alter table public.itens_venda enable row level security;
alter table public.movimentacoes_estoque enable row level security;

-- Limpar políticas antigas para evitar duplicidade
drop policy if exists "Permitir leitura de produtos" on public.produtos;
drop policy if exists "Permitir inserção de produtos" on public.produtos;
drop policy if exists "Permitir atualização de produtos" on public.produtos;
drop policy if exists "Permitir exclusão de produtos" on public.produtos;
drop policy if exists "Acesso público aos produtos" on public.produtos;

drop policy if exists "Permitir leitura de vendas" on public.vendas;
drop policy if exists "Permitir inserção de vendas" on public.vendas;
drop policy if exists "Permitir atualização de vendas" on public.vendas;
drop policy if exists "Acesso público às vendas" on public.vendas;

drop policy if exists "Permitir leitura de itens" on public.itens_venda;
drop policy if exists "Permitir inserção de itens" on public.itens_venda;
drop policy if exists "Acesso público aos itens" on public.itens_venda;

drop policy if exists "Permitir leitura de movimentações" on public.movimentacoes_estoque;
drop policy if exists "Permitir inserção de movimentações" on public.movimentacoes_estoque;
drop policy if exists "Acesso público às movimentações" on public.movimentacoes_estoque;

-- Políticas Ativadas: PRODUTOS (SELECT, INSERT, UPDATE, DELETE)
create policy "Permitir leitura de produtos" on public.produtos
  for select using (true);

create policy "Permitir inserção de produtos" on public.produtos
  for insert with check (true);

create policy "Permitir atualização de produtos" on public.produtos
  for update using (true) with check (true);

create policy "Permitir exclusão de produtos" on public.produtos
  for delete using (true);

-- Políticas Ativadas: VENDAS (SELECT, INSERT, UPDATE)
create policy "Permitir leitura de vendas" on public.vendas
  for select using (true);

create policy "Permitir inserção de vendas" on public.vendas
  for insert with check (true);

create policy "Permitir atualização de vendas" on public.vendas
  for update using (true) with check (true);

-- Políticas Ativadas: ITENS DE VENDA (SELECT, INSERT, DELETE)
create policy "Permitir leitura de itens" on public.itens_venda
  for select using (true);

create policy "Permitir inserção de itens" on public.itens_venda
  for insert with check (true);

create policy "Permitir exclusão de itens" on public.itens_venda
  for delete using (true);

-- Políticas Ativadas: MOVIMENTAÇÕES DE ESTOQUE (SELECT, INSERT)
create policy "Permitir leitura de movimentações" on public.movimentacoes_estoque
  for select using (true);

create policy "Permitir inserção de movimentações" on public.movimentacoes_estoque
  for insert with check (true);

-- ==============================================================================
-- 6. POLÍTICAS DE ARMAZENAMENTO (SUPABASE STORAGE BUCKETS & OBJECTS)
-- ==============================================================================

-- Criação do Bucket de Armazenamento para imagens de produtos e comprovantes
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'supermercado-arquivos',
  'supermercado-arquivos',
  true,
  5242880, -- Limite de 5MB por arquivo
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

-- NOTA: storage.objects já possui RLS habilitado por padrão no Supabase.
-- Não execute 'alter table storage.objects', apenas crie as políticas abaixo:

-- Limpa políticas antigas no storage se houverem
drop policy if exists "Acesso público para visualização de arquivos" on storage.objects;
drop policy if exists "Acesso público para upload de arquivos" on storage.objects;
drop policy if exists "Acesso público para atualização de arquivos" on storage.objects;
drop policy if exists "Acesso público para exclusão de arquivos" on storage.objects;

-- Política 1: Leitura/Download público dos arquivos do supermercado
create policy "Acesso público para visualização de arquivos"
on storage.objects for select
using (bucket_id = 'supermercado-arquivos');

-- Política 2: Envio/Upload de arquivos e fotos para o bucket
create policy "Acesso público para upload de arquivos"
on storage.objects for insert
with check (bucket_id = 'supermercado-arquivos');

-- Política 3: Atualização de arquivos existentes
create policy "Acesso público para atualização de arquivos"
on storage.objects for update
using (bucket_id = 'supermercado-arquivos')
with check (bucket_id = 'supermercado-arquivos');

-- Política 4: Exclusão de arquivos
create policy "Acesso público para exclusão de arquivos"
on storage.objects for delete
using (bucket_id = 'supermercado-arquivos');

-- ==============================================================================
-- 7. ÍNDICES DE DESEMPENHO
-- ==============================================================================
create index if not exists idx_produtos_codigo_barras on public.produtos (codigo_barras);
create index if not exists idx_produtos_categoria on public.produtos (categoria);
create index if not exists idx_vendas_data on public.vendas (data desc);
create index if not exists idx_itens_venda_venda_id on public.itens_venda (venda_id);
create index if not exists idx_movimentacoes_produto_id on public.movimentacoes_estoque (produto_id);
`;

let cachedClient: SupabaseClient | null = null;
let currentConfigString = '';

export function getStoredConfig(): SupabaseConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Erro ao ler config do Supabase do localStorage', e);
  }

  // Fallback to env if available
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  return {
    url: envUrl,
    anonKey: envKey,
    isConnected: false,
  };
}

export function saveStoredConfig(config: SupabaseConfig) {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    cachedClient = null; // reset cached instance
  } catch (e) {
    console.error('Erro ao salvar config do Supabase', e);
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  const key = `${config.url}_${config.anonKey}`;
  if (cachedClient && currentConfigString === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: { persistSession: false },
    });
    currentConfigString = key;
    return cachedClient;
  } catch (e) {
    console.error('Falha ao inicializar cliente Supabase:', e);
    return null;
  }
}

export async function testSupabaseConnection(
  url: string,
  anonKey: string,
): Promise<{ success: boolean; message: string; tablesExist: boolean }> {
  if (!url || !anonKey) {
    return {
      success: false,
      message: 'URL e Anon Key do Supabase são obrigatórias.',
      tablesExist: false,
    };
  }

  try {
    const client = createClient(url, anonKey, {
      auth: { persistSession: false },
    });

    // Test querying the produtos table
    const { error } = await client.from('produtos').select('id').limit(1);

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist yet
        return {
          success: true,
          message:
            'Conexão bem sucedida com o Supabase! As tabelas ainda precisam ser criadas. Execute o script SQL no painel do Supabase.',
          tablesExist: false,
        };
      }
      return {
        success: false,
        message: `Erro do Supabase: ${error.message}`,
        tablesExist: false,
      };
    }

    return {
      success: true,
      message: 'Conectado com sucesso ao Supabase! As tabelas estão prontas.',
      tablesExist: true,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Falha na conexão: ${err.message || 'Verifique a URL e a Anon Key informadas'}`,
      tablesExist: false,
    };
  }
}

// Local Storage helpers (for 100% offline fallback and initial state without any mock data)
export function getLocalProducts(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalProducts(products: Product[]) {
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
}

export function getLocalSales(): Sale[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SALES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalSales(sales: Sale[]) {
  localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(sales));
}

export function getLocalMovements(): StockMovement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MOVEMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalMovements(movements: StockMovement[]) {
  localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify(movements));
}
