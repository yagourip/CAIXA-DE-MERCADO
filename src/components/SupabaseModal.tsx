import React, { useState } from 'react';
import { useSupermarket } from '../context/SupermarketContext';
import { SUPABASE_SCHEMA_SQL } from '../lib/supabase';
import {
  Database,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Server,
} from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const {
    supabaseConfig,
    updateSupabaseCredentials,
    syncLocalToSupabase,
    products,
    sales,
  } = useSupermarket();

  const [url, setUrl] = useState(supabaseConfig.url || '');
  const [anonKey, setAnonKey] = useState(supabaseConfig.anonKey || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    tablesExist?: boolean;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'sql' | 'guide'>('config');

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);

    const res = await updateSupabaseCredentials(url, anonKey);
    setTesting(false);
    setTestResult(res);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSyncData = async () => {
    setSyncing(true);
    setSyncMessage(null);
    const res = await syncLocalToSupabase();
    setSyncing(false);
    setSyncMessage(res.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Conexão com o Supabase
                {supabaseConfig.isConnected ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                    Conectado
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium">
                    Aguardando Credenciais
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Seus dados serão gravados em nuvem diretamente no seu banco Supabase.
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 pt-2 bg-slate-950/40 gap-2">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'config'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Configuração de Chaves
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'sql'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Script SQL do Banco
            <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded text-[10px]">
              Tabelas
            </span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'guide'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Passo a Passo
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {activeTab === 'config' && (
            <form onSubmit={handleTestAndSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Project URL do Supabase
                </label>
                <input
                  type="url"
                  placeholder="https://sua-instancia.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Encontrado em: Configurações do Projeto Supabase &gt; API &gt; Project URL
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Anon / Public API Key
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Chave pública anônima (anon public key).
                </span>
              </div>

              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  )}
                  <div>
                    <p className="font-semibold">{testResult.message}</p>
                    {testResult.success && !testResult.tablesExist && (
                      <p className="mt-1 text-slate-300">
                        Clique na aba <strong>"Script SQL do Banco"</strong> acima, copie o
                        código e execute no SQL Editor do seu projeto Supabase para criar as tabelas!
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  disabled={testing}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer"
                >
                  {testing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Testando conexão...
                    </>
                  ) : (
                    <>
                      <Server className="w-4 h-4" />
                      Testar e Salvar Conexão
                    </>
                  )}
                </button>

                {supabaseConfig.isConnected && (
                  <button
                    type="button"
                    onClick={handleSyncData}
                    disabled={syncing}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition flex items-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    Sincronizar Dados Locais ({products.length} produtos / {sales.length} vendas)
                  </button>
                )}
              </div>

              {syncMessage && (
                <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-300">
                  {syncMessage}
                </div>
              )}
            </form>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-emerald-400">Script pronto:</span> Criação das
                  tabelas <code className="text-white">produtos</code>,{' '}
                  <code className="text-white">vendas</code>,{' '}
                  <code className="text-white">itens_venda</code> e{' '}
                  <code className="text-white">movimentacoes_estoque</code> com RLS.
                </div>
                <button
                  onClick={handleCopySql}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition flex items-center gap-1.5 shrink-0"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar SQL
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-72 select-all">
                  {SUPABASE_SCHEMA_SQL}
                </pre>
              </div>

              <p className="text-xs text-slate-400">
                Como usar: No Supabase, abra o menu lateral &gt; <strong>SQL Editor</strong> &gt;
                Novo Query &gt; Cole o código acima &gt; Clique no botão <strong>Run</strong>.
              </p>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Como conectar seu Supabase em 3 passos:
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-slate-300 leading-relaxed">
                  <li>
                    Acesse{' '}
                    <a
                      href="https://supabase.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 underline inline-flex items-center gap-1"
                    >
                      supabase.com <ExternalLink className="w-3 h-3 inline" />
                    </a>{' '}
                    e crie ou abra seu projeto gratuito.
                  </li>
                  <li>
                    Vá em <strong>SQL Editor</strong>, copie o script da aba{' '}
                    <strong>"Script SQL do Banco"</strong> e execute (clique em Run) para criar a
                    estrutura das tabelas.
                  </li>
                  <li>
                    Vá em <strong>Project Settings &gt; API</strong>, copie a{' '}
                    <strong>Project URL</strong> e a chave <strong>anon public</strong>, e cole na aba
                    de Configuração deste aplicativo.
                  </li>
                </ol>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-slate-300">
                <p className="font-medium text-slate-200 mb-1">
                  💡 Armazenamento local inteligente ativo:
                </p>
                <p>
                  Mesmo enquanto você não conecta o Supabase, o sistema guarda com segurança tudo o
                  que você cadastrar no navegador e sincroniza para a nuvem quando você inserir suas
                  chaves.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Pronto para armazenar suas vendas e estoque em nuvem.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
