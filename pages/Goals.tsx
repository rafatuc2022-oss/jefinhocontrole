
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { addGoal, getGoals, deleteGoal, updateGoal, addTransaction } from '../services/db';
import { Goal, EXPENSE_CATEGORIES } from '../types';
import { 
  Plus, 
  Trash2, 
  ExternalLink, 
  ShoppingCart, 
  X,
  Loader2,
  Target,
  ChevronRight
} from 'lucide-react';

const Goals: React.FC = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [purchaseModal, setPurchaseModal] = useState<{isOpen: boolean, goal: Goal | null}>({ isOpen: false, goal: null });
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  const [formData, setFormData] = useState({ title: '', amount: '', productLink: '' });

  useEffect(() => {
    if (currentUser) fetchGoals();
  }, [currentUser]);

  const fetchGoals = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await getGoals(currentUser.uid);
      setGoals(data);
    } catch (error) {
      addToast("Erro ao carregar objetivos", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAmountBlur = () => {
    if (!formData.amount) return;
    const clean = formData.amount.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const val = parseFloat(clean) || 0;
    setFormData(prev => ({
      ...prev,
      amount: val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSubmitting(true);
    try {
      const clean = formData.amount.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
      const amountValue = parseFloat(clean) || 0;
      await addGoal({
        userId: currentUser.uid,
        title: formData.title,
        amount: amountValue,
        productLink: formData.productLink || undefined,
        status: 'active',
        createdAt: Date.now()
      });
      setIsModalOpen(false);
      setFormData({ title: '', amount: '', productLink: '' });
      fetchGoals();
      addToast("Objetivo salvo", "success");
    } catch (error) {
      addToast("Erro ao salvar", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const activeGoals = goals.filter(g => g.status === 'active');

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24">
      <div className="bg-emerald-600 pt-16 pb-20 px-8 text-white rounded-b-[50px] shadow-lg">
        <h2 className="text-3xl font-black tracking-tight mb-2">Meus Objetivos</h2>
        <p className="text-sm font-medium opacity-70 tracking-wide uppercase">Planeje suas conquistas</p>
      </div>

      <div className="px-6 -mt-10 space-y-6">
        {loading ? (
          <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>
        ) : activeGoals.length === 0 ? (
          <div className="bg-white p-12 rounded-[40px] text-center border-2 border-dashed border-slate-200">
             <Target className="mx-auto text-slate-200 mb-4" size={48} />
             <p className="text-slate-400 font-bold">Nenhum objetivo ativo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGoals.map(goal => (
              <div key={goal.id} className="bg-white p-6 rounded-[40px] shadow-sm border border-slate-50 flex flex-col justify-between group hover:shadow-xl transition-all duration-500">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-[20px] flex items-center justify-center">
                    <Target size={28} />
                  </div>
                  <button onClick={() => deleteGoal(goal.id).then(fetchGoals)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 size={20} /></button>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">{goal.title}</h3>
                  <p className="text-2xl font-black text-emerald-600 mb-6">R$ {formatMoney(goal.amount)}</p>
                </div>
                <div className="flex gap-3">
                   {goal.productLink && (
                     <a href={goal.productLink} target="_blank" className="flex-1 bg-slate-50 text-slate-600 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2"><ExternalLink size={14} /> Ver</a>
                   )}
                   <button onClick={() => setPurchaseModal({isOpen: true, goal})} className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl font-bold text-xs shadow-lg shadow-emerald-200 flex items-center justify-center gap-2">Comprar <ChevronRight size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => setIsModalOpen(true)} className="fixed bottom-24 right-6 w-16 h-16 bg-slate-900 text-white rounded-2xl shadow-xl flex items-center justify-center hover:scale-105 active:scale-90 transition-all z-50">
        <Plus size={32} />
      </button>

      {/* MODAL AJUSTADO PARA TECLADO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 max-h-[90vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-300">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-black text-slate-800">Novo Objetivo</h3>
               <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
             </div>
             <form onSubmit={handleSubmit} className="space-y-6 pb-8">
                <input required type="text" placeholder="Nome do objetivo" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                <input required type="text" placeholder="Valor R$ 0,00" value={formData.amount} onBlur={handleAmountBlur} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl font-black text-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                <input type="url" placeholder="Link do produto (opcional)" value={formData.productLink} onChange={e => setFormData({...formData, productLink: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-emerald-600 text-white font-black rounded-3xl shadow-xl shadow-emerald-200 uppercase tracking-widest text-xs">Adicionar Conquista</button>
             </form>
          </div>
        </div>
      )}

      {purchaseModal.isOpen && purchaseModal.goal && (
         <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
               <div className="text-center mb-8">
                  <h3 className="text-2xl font-black text-slate-800">Confirmar Compra</h3>
                  <p className="text-slate-400 font-medium text-sm mt-2">Deseja converter esse objetivo em uma despesa paga?</p>
               </div>
               <div className="space-y-4 mb-8">
                  <div className="bg-slate-50 p-4 rounded-3xl text-center">
                     <p className="text-xs font-bold text-slate-400 uppercase mb-1">{purchaseModal.goal.title}</p>
                     <p className="text-xl font-black text-emerald-600">R$ {formatMoney(purchaseModal.goal.amount)}</p>
                  </div>
                  <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold" />
               </div>
               <div className="flex gap-3">
                  <button onClick={() => setPurchaseModal({isOpen: false, goal: null})} className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl">Voltar</button>
                  <button onClick={async () => {
                    setIsSubmitting(true);
                    await addTransaction({
                      userId: currentUser!.uid,
                      description: purchaseModal.goal!.title,
                      amount: purchaseModal.goal!.amount,
                      type: 'expense',
                      category: 'Objetivos',
                      dueDate: purchaseDate,
                      status: 'paid',
                      isRecurring: false,
                      createdAt: Date.now()
                    });
                    await updateGoal(purchaseModal.goal!.id, { status: 'completed', completedAt: Date.now() });
                    addToast("Compra realizada!", "success");
                    setPurchaseModal({isOpen: false, goal: null});
                    fetchGoals();
                    setIsSubmitting(false);
                  }} className="flex-[2] py-4 bg-emerald-600 text-white font-bold rounded-2xl">Confirmar</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Goals;
