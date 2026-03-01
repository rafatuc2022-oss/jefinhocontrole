
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { 
  getTransactions, 
  addTransaction, 
  deleteTransaction, 
  updateTransaction,
  updateTransactionSeries,
  deleteTransactionSeries
} from '../services/db';
import { 
  Transaction, 
  EXPENSE_CATEGORIES, 
  INCOME_CATEGORIES, 
  TransactionType, 
  RecurrenceFrequency,
  TransactionStatus
} from '../types';
import { 
  Plus, 
  Trash2, 
  Search, 
  X, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle,
  Utensils,
  Home,
  Briefcase,
  ShoppingBag,
  MoreHorizontal,
  CreditCard,
  ArrowUpCircle,
  ArrowDownCircle,
  Repeat,
  CalendarDays,
  AlertTriangle,
  Clock,
  Wallet
} from 'lucide-react';

const Expenses: React.FC = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TransactionType>('expense');
  
  const [selectedDate, setSelectedDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  // Form State
  const initialFormState = {
    description: '',
    amount: '',
    type: 'expense' as TransactionType,
    category: EXPENSE_CATEGORIES[0],
    dueDate: new Date().toISOString().split('T')[0],
    status: 'pending' as TransactionStatus,
    isRecurring: false,
    recurrenceCount: '1',
    observation: ''
  };
  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [originalDescription, setOriginalDescription] = useState('');

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionType: 'delete' | 'update';
    target: 'single' | 'series';
    onConfirm: () => void;
  } | null>(null);

  // Auto-calculate end date for UI display
  const [displayEndDate, setDisplayEndDate] = useState('');

  useEffect(() => {
    if (currentUser) fetchTransactions();
  }, [currentUser, selectedDate]);

  useEffect(() => {
    if (formData.isRecurring && formData.dueDate && formData.recurrenceCount) {
      const start = new Date(formData.dueDate + 'T12:00:00');
      const count = parseInt(formData.recurrenceCount) || 1;
      const end = new Date(start.getTime());
      end.setMonth(start.getMonth() + (count - 1));
      setDisplayEndDate(end.toLocaleDateString('pt-BR'));
    }
  }, [formData.dueDate, formData.recurrenceCount, formData.isRecurring]);

  const fetchTransactions = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await getTransactions(currentUser.uid);
      setTransactions(data);
    } catch (error) {
      addToast("Erro ao carregar dados", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (offset: number) => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + offset, 1));
  };

  const parseCurrencyInput = (val: string): number => {
    let clean = val.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  };

  const handleAmountBlur = () => {
    if (!formData.amount) return;
    const val = parseCurrencyInput(formData.amount);
    setFormData(prev => ({
      ...prev,
      amount: val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }));
  };

  const saveTransaction = async (applyToSeries: boolean = false) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    try {
      const amountValue = parseCurrencyInput(formData.amount);
      const transactionData: any = {
        userId: currentUser.uid,
        description: formData.description,
        amount: amountValue,
        type: formData.type,
        category: formData.category,
        dueDate: formData.dueDate,
        status: formData.status,
        isRecurring: formData.isRecurring,
        observation: formData.observation,
        createdAt: Date.now()
      };

      if (formData.isRecurring) {
        transactionData.recurrence = {
          frequency: 'monthly',
          count: parseInt(formData.recurrenceCount) || 1
        };
      }

      if (editingId) {
        if (applyToSeries) {
          await updateTransactionSeries(currentUser.uid, originalDescription, transactionData);
        } else {
          await updateTransaction(editingId, transactionData);
        }
        addToast("Atualizado com sucesso", "success");
      } else {
        await addTransaction(transactionData);
        addToast("Lançado com sucesso", "success");
      }
      setIsModalOpen(false);
      resetForm();
      fetchTransactions();
    } catch (error: any) {
      addToast("Erro ao salvar", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && formData.isRecurring) {
      setConfirmModal({
        isOpen: true,
        title: 'Atualizar Recorrência',
        message: 'Deseja atualizar apenas esta parcela ou todos os lançamentos futuros com esta descrição?',
        actionType: 'update',
        target: 'single',
        onConfirm: () => {} // handled in the modal buttons
      });
    } else {
      saveTransaction();
    }
  };

  const handleEdit = (t: Transaction) => {
    setEditingId(t.id);
    setOriginalDescription(t.description);
    setFormData({
      description: t.description,
      amount: t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      type: t.type,
      category: t.category,
      dueDate: t.dueDate,
      status: t.status,
      isRecurring: t.isRecurring,
      recurrenceCount: t.recurrence?.count?.toString() || '1',
      observation: t.observation || ''
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (t: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newStatus = t.status === 'paid' ? 'pending' : 'paid';
      await updateTransaction(t.id, { status: newStatus });
      fetchTransactions();
      addToast(newStatus === 'paid' ? "Conta paga!" : "Conta pendente", "info");
    } catch (error) {
      addToast("Erro ao atualizar status", "error");
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setOriginalDescription('');
  };

  const monthlyTransactions = transactions.filter(t => {
    const [year, month] = t.dueDate.split('-').map(Number);
    return (month - 1) === selectedDate.getMonth() && year === selectedDate.getFullYear();
  });

  const filteredTransactions = monthlyTransactions.filter(t => {
    if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (t.type !== activeTab) return false;
    return true;
  });

  const incomeSum = monthlyTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const paidExpenseSum = monthlyTransactions.filter(t => t.type === 'expense' && t.status === 'paid').reduce((acc, t) => acc + t.amount, 0);
  const pendingExpenseSum = monthlyTransactions.filter(t => t.type === 'expense' && t.status === 'pending').reduce((acc, t) => acc + t.amount, 0);
  const balance = incomeSum - paidExpenseSum;

  const getCategoryIcon = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('aliment')) return <Utensils size={20} />;
    if (c.includes('contas') || c.includes('aluguel')) return <Home size={20} />;
    if (c.includes('saúde')) return <Briefcase size={20} />;
    if (c.includes('lazer') || c.includes('entretenimento')) return <ShoppingBag size={20} />;
    if (c.includes('salário')) return <CreditCard size={20} />;
    return <MoreHorizontal size={20} />;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24">
      <div className="bg-emerald-600 pt-10 pb-16 px-6 text-white rounded-b-[40px] shadow-lg">
        <div className="flex justify-between items-center mb-8">
           <button onClick={() => handleMonthChange(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ChevronLeft size={24} /></button>
           <h2 className="text-lg font-black uppercase tracking-widest">{selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
           <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ChevronRight size={24} /></button>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium opacity-80 uppercase tracking-widest">Saldo Atual (Lançamentos Pagos)</p>
          <h2 className="text-3xl font-black">R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
          {pendingExpenseSum > 0 && (
            <p className="text-[10px] text-orange-100 font-bold uppercase mt-1 flex items-center gap-1">
              <Clock size={10} /> Pendente de pagamento: R$ {pendingExpenseSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
      </div>

      <div className="px-6 -mt-10 grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-5 rounded-3xl shadow-sm flex flex-col gap-1 border border-slate-50">
          <div className="flex items-center gap-2 text-emerald-500">
            <ArrowUpCircle size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ganhos</span>
          </div>
          <p className="text-lg font-black text-slate-800">R$ {incomeSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm flex flex-col gap-1 border border-slate-50">
          <div className="flex items-center gap-2 text-rose-500">
            <ArrowDownCircle size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Gastos Pagos</span>
          </div>
          <p className="text-lg font-black text-slate-800">R$ {paidExpenseSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="px-6 space-y-4 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar lançamentos..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-3xl shadow-sm text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {(['expense', 'income'] as TransactionType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
                : 'bg-white text-slate-500 border border-slate-100'
              }`}
            >
              {tab === 'expense' ? 'Gastos' : 'Ganhos'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 space-y-3">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm font-medium">Nenhum lançamento encontrado nesta categoria.</div>
        ) : (
          filteredTransactions.map(t => (
            <div 
              key={t.id} 
              onClick={() => handleEdit(t)}
              className={`p-4 rounded-[32px] shadow-sm border transition-all flex items-center justify-between group active:scale-[0.98] ${
                t.isRecurring 
                ? 'bg-indigo-50/50 border-indigo-100 border-l-4 border-l-indigo-400' 
                : 'bg-white border-slate-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <button 
                  onClick={(e) => handleToggleStatus(t, e)}
                  className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all relative ${
                    t.status === 'paid' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-300'
                  }`}
                >
                  {t.status === 'paid' ? <CheckCircle size={22} /> : getCategoryIcon(t.category)}
                  {t.status === 'pending' && t.type === 'expense' && <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 border-2 border-white rounded-full"></div>}
                </button>
                <div>
                  <div className="flex items-center gap-1.5">
                    {/* Removido o line-through aqui conforme pedido */}
                    <p className={`text-sm font-bold text-slate-800 ${t.status === 'paid' ? 'opacity-40' : ''}`}>{t.description}</p>
                    {t.isRecurring && <Repeat size={12} className="text-indigo-400" />}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    {t.category} • {t.status === 'paid' ? 'Pago' : 'Pendente'}
                  </p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <p className={`text-sm font-black ${t.type === 'income' ? 'text-emerald-600' : t.status === 'paid' ? 'text-rose-500' : 'text-slate-400'}`}>
                  R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                {t.status === 'pending' && t.type === 'expense' && (
                  <button 
                    onClick={(e) => handleToggleStatus(t, e)}
                    className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    <Wallet size={10} /> Pagar
                  </button>
                )}
                <p className="text-[9px] font-bold text-slate-400">{new Date(t.dueDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <button 
        onClick={() => { resetForm(); setIsModalOpen(true); }}
        className="fixed bottom-24 right-6 w-14 h-14 bg-emerald-500 text-white rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center justify-center hover:bg-emerald-600 active:scale-90 transition-all z-50"
      >
        <Plus size={28} />
      </button>

      {/* LANÇAMENTO MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] shadow-2xl p-8 max-h-[90vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 pb-8">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button type="button" onClick={() => setFormData({...formData, type: 'expense'})} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${formData.type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>Despesa</button>
                <button type="button" onClick={() => setFormData({...formData, type: 'income'})} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${formData.type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Receita</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Descrição</label>
                  <input required type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Valor</label>
                  <input required type="text" value={formData.amount} onBlur={handleAmountBlur} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-black text-lg" placeholder="R$ 0,00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Data do Lançamento</label>
                  <input required type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Categoria</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold appearance-none">
                    {(formData.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Status do Pagamento</label>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                  <button type="button" onClick={() => setFormData({...formData, status: 'pending'})} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${formData.status === 'pending' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>Pendente</button>
                  <button type="button" onClick={() => setFormData({...formData, status: 'paid'})} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${formData.status === 'paid' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Pago</button>
                </div>
              </div>

              {/* RECORRÊNCIA */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg">
                      <Repeat size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">Repetir lançamento</p>
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Recorrência mensal</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={formData.isRecurring} onChange={e => setFormData({...formData, isRecurring: e.target.checked})} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {formData.isRecurring && (
                  <div className="bg-indigo-50/50 p-6 rounded-[32px] border border-indigo-100 animate-in fade-in zoom-in duration-200 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarDays size={16} className="text-indigo-400" />
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Configuração da Recorrência</span>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-indigo-400 uppercase ml-2">Quantidade de meses</label>
                        <input 
                          type="number" 
                          min="2" 
                          max="120"
                          required={formData.isRecurring}
                          value={formData.recurrenceCount} 
                          onChange={e => setFormData({...formData, recurrenceCount: e.target.value})} 
                          className="w-full px-5 py-3 bg-white border border-indigo-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-black text-center text-indigo-600" 
                        />
                      </div>
                      <div className="bg-white/60 p-3 rounded-2xl flex justify-between items-center border border-indigo-50">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Data de Término:</span>
                        <span className="text-sm font-black text-indigo-600">{displayEndDate}</span>
                      </div>
                    </div>
                    <p className="text-[9px] text-indigo-400/80 text-center mt-2 italic font-medium">Lançamentos idênticos serão gerados mensalmente até {displayEndDate}.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                {editingId && (
                  <button 
                    type="button" 
                    onClick={() => {
                      if (formData.isRecurring) {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Excluir Lançamento',
                          message: 'Deseja excluir apenas esta parcela ou remover todos os lançamentos com esta descrição?',
                          actionType: 'delete',
                          target: 'single',
                          onConfirm: () => {}
                        });
                      } else {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Excluir Lançamento',
                          message: 'Tem certeza que deseja excluir este lançamento?',
                          actionType: 'delete',
                          target: 'single',
                          onConfirm: async () => {
                            await deleteTransaction(editingId);
                            setIsModalOpen(false);
                            fetchTransactions();
                            addToast('Removido com sucesso', 'success');
                            setConfirmModal(null);
                          }
                        });
                      }
                    }} 
                    className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100"
                  >
                    <Trash2 size={24} />
                  </button>
                )}
                <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">
                  {isSubmitting ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Lançar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center mb-6">
              <div className={`p-4 rounded-3xl mb-4 ${confirmModal.actionType === 'delete' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
                {confirmModal.actionType === 'delete' ? <Trash2 size={32} /> : <AlertTriangle size={32} />}
              </div>
              <h3 className="text-xl font-black text-slate-800">{confirmModal.title}</h3>
              <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">{confirmModal.message}</p>
            </div>

            <div className="space-y-3">
              {editingId && formData.isRecurring ? (
                <>
                  <button 
                    onClick={async () => {
                      if (confirmModal.actionType === 'delete') {
                        await deleteTransaction(editingId);
                        addToast("Parcela removida", "success");
                      } else {
                        await saveTransaction(false);
                      }
                      setConfirmModal(null);
                      setIsModalOpen(false);
                      fetchTransactions();
                    }}
                    className={`w-full py-4 rounded-2xl font-bold text-sm transition-all border-2 ${
                      confirmModal.actionType === 'delete' ? 'border-rose-100 text-rose-600' : 'border-indigo-100 text-indigo-600'
                    }`}
                  >
                    Apenas este
                  </button>
                  <button 
                    onClick={async () => {
                      if (!currentUser) return;
                      if (confirmModal.actionType === 'delete') {
                        await deleteTransactionSeries(currentUser.uid, originalDescription);
                        addToast("Série removida", "success");
                      } else {
                        await saveTransaction(true);
                      }
                      setConfirmModal(null);
                      setIsModalOpen(false);
                      fetchTransactions();
                    }}
                    className={`w-full py-4 rounded-2xl font-bold text-sm text-white shadow-lg transition-all ${
                      confirmModal.actionType === 'delete' ? 'bg-rose-500 shadow-rose-200' : 'bg-indigo-600 shadow-indigo-200'
                    }`}
                  >
                    Toda a série
                  </button>
                </>
              ) : (
                <button 
                  onClick={confirmModal.onConfirm}
                  className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-rose-200"
                >
                  Confirmar Exclusão
                </button>
              )}
              
              <button 
                onClick={() => setConfirmModal(null)}
                className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
