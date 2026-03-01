
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { saveNotificationSettings, getNotificationSettings } from '../services/db';
import { NotificationSettings } from '../types';
import { Bell, Shield, Save, Loader2, Info, User, Download, Share } from 'lucide-react';

const Settings: React.FC = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>({ alertDaysBefore: 1, enabled: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (currentUser) {
      getNotificationSettings(currentUser.uid).then(data => {
        setSettings(data);
        setLoading(false);
      });
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // PWA Install Prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [currentUser]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      await saveNotificationSettings(currentUser.uid, settings);
      addToast("Configurações salvas!", "success");
    } catch (error) {
      addToast('Erro ao salvar.', "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24">
      {/* Header Emerald */}
      <div className="bg-emerald-600 pt-16 pb-20 px-8 text-white rounded-b-[50px] shadow-lg">
        <h2 className="text-3xl font-black tracking-tight mb-2">Ajustes</h2>
        <p className="text-sm font-medium opacity-70 tracking-wide uppercase">Gerencie sua conta e notificações</p>
      </div>

      <div className="px-6 -mt-10 space-y-6 max-w-2xl mx-auto">
        {/* Bloco Perfil */}
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-50 flex items-center gap-4">
           <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center"><User size={32} /></div>
           <div>
              <p className="text-lg font-black text-slate-800">{currentUser?.email?.split('@')[0]}</p>
              <p className="text-xs font-bold text-slate-400">{currentUser?.email}</p>
           </div>
        </div>

        {/* Bloco Instalação */}
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-50 overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center gap-4">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Download size={24} /></div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Instalar App</h3>
              <p className="text-xs font-bold text-slate-400">Use como um aplicativo nativo</p>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {isIOS ? (
              <div className="bg-amber-50 p-6 rounded-3xl space-y-4">
                <div className="flex gap-4">
                  <Share className="text-amber-600 shrink-0" size={24} />
                  <p className="text-sm font-bold text-amber-900 leading-relaxed">
                    No iOS, toque no ícone de <span className="underline">Compartilhar</span> e selecione <span className="underline">"Adicionar à Tela de Início"</span> para instalar.
                  </p>
                </div>
              </div>
            ) : isInstallable ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-slate-600">
                  Instale o MeuControle no seu dispositivo para acesso rápido e melhor performance.
                </p>
                <button 
                  onClick={handleInstall}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95"
                >
                  <Download size={20} /> Instalar Agora
                </button>
              </div>
            ) : (
              <div className="bg-slate-50 p-6 rounded-3xl">
                <p className="text-xs font-bold text-slate-500 text-center">
                  O aplicativo já está instalado ou seu navegador não suporta instalação automática.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bloco Notificações */}
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-50 overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center gap-4">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Bell size={24} /></div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Notificações</h3>
              <p className="text-xs font-bold text-slate-400">Controle seus alertas de vencimento</p>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <span className="block font-bold text-slate-800">Alertas Ativos</span>
                <p className="text-xs font-medium text-slate-400 mt-1">Exibir avisos de contas a pagar</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={settings.enabled} onChange={e => setSettings({...settings, enabled: e.target.checked})} className="sr-only peer" />
                <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className={`space-y-6 transition-all ${settings.enabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Notificar com antecedência:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[0, 1, 3, 7].map(days => (
                    <button key={days} onClick={() => setSettings({...settings, alertDaysBefore: days})} className={`py-4 rounded-2xl text-xs font-bold border-2 transition-all ${settings.alertDaysBefore === days ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-50 text-slate-400 hover:border-slate-200'}`}>
                      {days === 0 ? 'No dia' : `${days} dias`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-blue-50 p-5 rounded-3xl flex gap-4">
                 <Info className="text-blue-500 shrink-0" size={20} />
                 <p className="text-xs font-bold text-blue-700 leading-relaxed">Você será alertado pelo sistema {settings.alertDaysBefore === 0 ? 'exatamente no dia' : `com ${settings.alertDaysBefore} dias de antecedência`} do vencimento.</p>
              </div>
            </div>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100">
             <button onClick={handleSave} disabled={saving} className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95">
               {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Salvar Configurações
             </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-50 flex items-center gap-4">
            <div className="p-3 bg-slate-100 text-slate-400 rounded-xl"><Shield size={24} /></div>
            <div>
              <h3 className="font-bold text-slate-800">Privacidade e Dados</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Armazenamento seguro via Firebase</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
