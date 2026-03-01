
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  ChevronRight, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  CalendarDays,
  Utensils,
  Home,
  Briefcase,
  ShoppingBag,
  MoreHorizontal,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Loader2,
  BarChart3,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getTransactions } from '../services/db';
import { Transaction } from '../types';
import { useToast } from '../contexts/ToastContext';

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideValues, setHideValues] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  useEffect(() => {
    if (currentUser) {
      loadData();
      
      // Welcome toast (once per session)
      const sessionWelcome = sessionStorage.getItem('welcome_shown');
      if (!sessionWelcome) {
        const userName = currentUser.displayName?.split(' ')[0] || 'Usuário';
        addToast(`Bem-vindo, ${userName}! Que bom ver você de volta.`, "success");
        sessionStorage.setItem('welcome_shown', 'true');
      }
    }
  }, [currentUser]);

  const loadData = async () => {
    try {
      if (!currentUser) return;
      const data = await getTransactions(currentUser.uid);
      setTransactions(data);
    } catch (error) {
      console.error("Error loading dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  const fullMonths = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // Transações do mês selecionado
  const filteredTransactions = transactions.filter(t => {
    const [year, month] = t.dueDate.split('-').map(Number);
    return (month - 1) === currentMonth && year === currentYear;
  });

  const income = filteredTransactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const paidExpenses = filteredTransactions.filter(t => t.type === 'expense' && t.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
  const pendingExpenses = filteredTransactions.filter(t => t.type === 'expense' && t.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0);
  
  const totalExpenses = paidExpenses + pendingExpenses;
  const currentBalance = income - paidExpenses;
  const estimatedBalance = income - totalExpenses;

  // CÁLCULO DE PROJEÇÃO (Próximos 4 meses)
  const projections = Array.from({ length: 4 }).map((_, i) => {
    const projDate = new Date(currentYear, currentMonth + i + 1, 1);
    const m = projDate.getMonth();
    const y = projDate.getFullYear();
    
    const total = transactions
      .filter(t => {
        const [tYear, tMonth] = t.dueDate.split('-').map(Number);
        return (tMonth - 1) === m && tYear === y && t.type === 'expense';
      })
      .reduce((acc, curr) => acc + curr.amount, 0);
      
    return {
      name: fullMonths[m],
      year: y,
      total
    };
  });

  const nextMonthProjection = projections[0];

  const latest = [...filteredTransactions]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10);

  const formatMoney = (val: number) => {
    if (hideValues) return '••••••';
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getCategoryIcon = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('aliment')) return <Utensils size={18} />;
    if (c.includes('contas') || c.includes('aluguel')) return <Home size={18} />;
    if (c.includes('saúde')) return <Briefcase size={18} />;
    if (c.includes('lazer') || c.includes('entretenimento')) return <ShoppingBag size={18} />;
    if (c.includes('salário')) return <CreditCard size={18} />;
    return <MoreHorizontal size={18} />;
  };

  const getCategoryColor = (category: string, type: string) => {
    if (type === 'income') return 'bg-emerald-500';
    const c = category.toLowerCase();
    if (c.includes('aliment')) return 'bg-orange-500';
    if (c.includes('saúde')) return 'bg-teal-500';
    if (c.includes('lazer') || c.includes('entretenimento')) return 'bg-rose-500';
    return 'bg-slate-400';
  };

  const handleMonthOffset = (offset: number) => {
    const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + offset, 1);
    setSelectedDate(newDate);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 relative">
      <div className="bg-emerald-600 pt-10 pb-16 px-6 text-white rounded-b-[40px] shadow-lg">
        <div className="flex justify-between items-center mb-8">
          <button onClick={() => handleMonthOffset(-1)} className="p-2 bg-white/10 rounded-full">
             <ChevronRight className="rotate-180" size={20} />
          </button>
          <div className="flex flex-col items-center">
             <h1 className="text-sm font-black uppercase tracking-[3px] opacity-70">Bem-vindo, {currentUser?.displayName?.split(' ')[0] || 'Usuário'}!</h1>
             <p className="text-xl font-black">{fullMonths[currentMonth]} {currentYear}</p>
          </div>
          <button onClick={() => handleMonthOffset(1)} className="p-2 bg-white/10 rounded-full">
             <ChevronRight size={20} />
          </button>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium opacity-80 uppercase tracking-widest">Saldo Disponível</p>
          <div className="flex items-center gap-3">
            <h2 className="text-4xl font-black tracking-tight">R$ {formatMoney(currentBalance)}</h2>
            <button onClick={() => setHideValues(!hideValues)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
              {hideValues ? <EyeOff size={24} /> : <Eye size={24} />}
            </button>
          </div>
          
          <div className="pt-4 flex flex-wrap gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
              <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">Saldo Previsto</p>
              <p className="text-sm font-black">R$ {formatMoney(estimatedBalance)}</p>
            </div>
            {pendingExpenses > 0 && (
              <div className="bg-orange-500 px-4 py-2 rounded-2xl shadow-lg shadow-orange-900/20">
                <p className="text-[10px] text-orange-100 font-bold uppercase tracking-widest flex items-center gap-1">
                  <AlertTriangle size={10} /> Pendente
                </p>
                <p className="text-sm font-black text-white">R$ {formatMoney(pendingExpenses)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 -mt-8 space-y-6">
        {/* Sumário Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-50 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-emerald-500 mb-1">
              <TrendingUp size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ganhos</span>
            </div>
            <p className="text-xl font-black text-slate-800">R$ {formatMoney(income)}</p>
          </div>

          <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-50 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-rose-500 mb-1">
              <TrendingDown size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Despesas</span>
            </div>
            <p className="text-xl font-black text-slate-800">R$ {formatMoney(totalExpenses)}</p>
          </div>
        </div>

        {/* GASTO PREVISTO PRÓXIMO MÊS (DESTAQUE) */}
        <div className="pt-2">
          <div className="bg-slate-900 text-white p-6 rounded-[35px] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                   <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400">
                      <CalendarDays size={24} />
                   </div>
                   <div>
                      <h3 className="text-xs font-black uppercase tracking-[2px] text-slate-400">Gasto Previsto</h3>
                      <p className="text-lg font-black text-white">{nextMonthProjection.name} {nextMonthProjection.year}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-[28px] font-black text-emerald-400 leading-none">R$ {formatMoney(nextMonthProjection.total)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 bg-white/5 p-2 rounded-xl border border-white/5">
                <AlertTriangle size={12} className="text-orange-400" />
                Soma de todos os lançamentos cadastrados para o próximo mês.
              </div>
            </div>
          </div>
        </div>

        {/* PROJEÇÃO DE GASTOS MENSAL (LISTA) */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-4 px-1">
             <div className="flex items-center gap-2">
                <BarChart3 className="text-slate-400" size={18} />
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Projeção por Mês</h3>
             </div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Geral</span>
          </div>
          
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
             {projections.map((p, idx) => (
               <div key={idx} className="min-w-[160px] bg-white p-5 rounded-[32px] shadow-sm border border-slate-50 flex flex-col justify-between transition-all active:scale-95 group">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[1px] text-slate-400 mb-1">{p.name}</p>
                    <p className="text-lg font-black text-slate-800">R$ {formatMoney(p.total)}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                     <span className="text-[9px] font-bold text-slate-300">{p.year}</span>
                     <div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 group-hover:text-emerald-500 transition-colors">
                        <TrendingUpIcon size={12} />
                     </div>
                  </div>
               </div>
             ))}
          </div>
        </div>

        {/* Lançamentos do Mês */}
        <div className="pt-2 pb-12">
          <h3 className="text-lg font-black text-slate-800 tracking-tight mb-4">Lançamentos de {fullMonths[currentMonth]}</h3>
          <div className="space-y-3">
            {latest.length > 0 ? latest.map(t => (
              <div key={t.id} onClick={() => window.location.hash = `#/expenses?edit=${t.id}`} className="bg-white p-4 rounded-[30px] shadow-sm border border-slate-50 flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${t.status === 'paid' ? 'bg-emerald-50 text-emerald-500' : getCategoryColor(t.category, t.type)} text-white rounded-2xl flex items-center justify-center`}>
                    {t.status === 'paid' ? <CheckCircle size={22} className="text-emerald-500" /> : getCategoryIcon(t.category)}
                  </div>
                  <div>
                    <p className={`text-sm font-black text-slate-800 ${t.status === 'paid' ? 'opacity-40' : ''}`}>{t.description}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      {t.category} • <span className={t.status === 'paid' ? 'text-emerald-600' : 'text-orange-500'}>{t.status === 'paid' ? 'PAGO' : 'PENDENTE'}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className={`text-sm font-black ${t.type === 'income' ? 'text-emerald-600' : t.status === 'paid' ? 'text-rose-500' : 'text-slate-500'}`}>
                      {t.type === 'income' ? '+' : '-'} R$ {formatMoney(t.amount)}
                    </p>
                    <p className="text-[9px] font-black text-slate-300 uppercase">{new Date(t.dueDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-200" />
                </div>
              </div>
            )) : (
              <div className="text-center py-12 bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum registro encontrado.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Link 
        to="/expenses" 
        className="fixed bottom-24 right-6 w-16 h-16 bg-slate-900 text-white rounded-2xl shadow-2xl shadow-slate-900/40 flex items-center justify-center hover:bg-black hover:scale-110 active:scale-90 transition-all z-50"
      >
        <Plus size={32} />
      </Link>
    </div>
  );
};

export default Dashboard;
