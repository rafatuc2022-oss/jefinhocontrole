
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wallet, 
  PieChart, 
  LogOut,
  Bell,
  Settings,
  X,
  Target
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getTransactions, getNotificationSettings } from '../services/db';
import { Transaction, NotificationSettings } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { logout, currentUser } = useAuth();
  const location = useLocation();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Transaction[]>([]);

  useEffect(() => {
    if (currentUser) {
      loadNotifications();
    }
  }, [currentUser, location.pathname]);

  const loadNotifications = async () => {
    if (!currentUser) return;
    const [txs, userSettings] = await Promise.all([
      getTransactions(currentUser.uid),
      getNotificationSettings(currentUser.uid)
    ]);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alerts = txs.filter(t => {
      if (t.type !== 'expense' || t.status === 'paid') return false;
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= userSettings.alertDaysBefore;
    });

    setNotifications(alerts.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
  };

  const navItems = [
    { name: 'Home', path: '/', icon: LayoutDashboard },
    { name: 'Gastos', path: '/expenses', icon: Wallet },
    { name: 'Metas', path: '/goals', icon: Target },
    { name: 'Relatórios', path: '/reports', icon: PieChart },
    { name: 'Ajustes', path: '/settings', icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;
  const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      
      {/* Sidebar Desktop (Esquerda) */}
      <aside className="hidden md:flex fixed h-full w-64 bg-white text-slate-800 flex-col top-0 left-0 z-20 border-r border-slate-100 shadow-sm">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-emerald-200">
            $
          </div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">MeuControle</h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3.5 transition-all rounded-2xl ${active ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <Icon size={20} />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-50">
          <button onClick={() => logout()} className="flex items-center gap-3 px-4 py-3 w-full text-rose-500 hover:bg-rose-50 rounded-2xl text-sm font-bold transition-colors">
            <LogOut size={20} /> <span>Sair da conta</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 md:ml-64 min-h-screen relative">
        {children}
      </main>

      {/* Mobile Tab Bar (Bottom) - Estilo iOS/Moderno */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-[60] safe-area-bottom">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`flex flex-col items-center justify-center w-full h-full transition-all ${active ? 'text-emerald-600 scale-110' : 'text-slate-400'}`}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                <span className={`text-[10px] mt-1 font-bold ${active ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Notifications Side Drawer */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsNotifOpen(false)} />
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col border-l border-slate-100 animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h2 className="font-black text-lg text-slate-900">Notificações</h2>
              <button onClick={() => setIsNotifOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="py-20 text-center space-y-2">
                  <Bell className="mx-auto text-slate-200" size={48} />
                  <p className="text-sm font-bold text-slate-400">Nenhum alerta pendente.</p>
                </div>
              ) : notifications.map(t => (
                <div key={t.id} className="p-4 bg-rose-50 border border-rose-100 rounded-3xl">
                   <p className="font-bold text-sm text-slate-900">{t.description}</p>
                   <p className="text-xs font-medium text-rose-600 mt-1">Vence dia {new Date(t.dueDate).toLocaleDateString()}</p>
                   <p className="text-xs font-black text-rose-700 mt-1">R$ {formatMoney(t.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Layout;
