
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTransactions } from '../services/db';
import { Transaction } from '../types';
import { Printer, ArrowUpCircle, ArrowDownCircle, PieChart as PieChartIcon, Loader2, Clock, FileDown, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from '../contexts/ToastContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const Reports: React.FC = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  useEffect(() => {
    if (currentUser) {
      getTransactions(currentUser.uid).then(data => {
        setTransactions(data);
        setLoading(false);
      });
    }
  }, [currentUser]);

  const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  // Filtragem para o mês selecionado
  const filteredTxs = transactions.filter(t => {
    const [year, month] = t.dueDate.split('-').map(Number);
    return (month - 1) === selectedMonth && year === selectedYear;
  });

  // Totais do período selecionado
  const periodIncome = filteredTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const periodPaidExpense = filteredTxs.filter(t => t.type === 'expense' && t.status === 'paid').reduce((acc, t) => acc + t.amount, 0);
  const periodPendingExpense = filteredTxs.filter(t => t.type === 'expense' && t.status === 'pending').reduce((acc, t) => acc + t.amount, 0);
  const periodBalance = periodIncome - periodPaidExpense;

  // Dados do gráfico (histórico geral por categoria)
  const categoryData = transactions
    .filter(t => t.type === 'expense' && t.status === 'paid')
    .reduce((acc, curr) => {
      const existing = acc.find(item => item.name === curr.category);
      if (existing) existing.value += curr.amount;
      else acc.push({ name: curr.category, value: curr.amount });
      return acc;
    }, [] as {name: string, value: number}[]);

  const handleGeneratePDF = async () => {
    if (filteredTxs.length === 0) {
      addToast("Não há transações no período selecionado.", "info");
      return;
    }

    setExporting(true);
    try {
      const doc = new jsPDF();
      const margin = 14;
      const primaryColor = [5, 150, 105]; // Emerald 600

      // Cabeçalho
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório Mensal de Gastos', margin, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Competência: ${months[selectedMonth]} / ${selectedYear}`, margin, 30);
      doc.text(`Exportado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 210 - margin, 30, { align: 'right' });

      // Resumo Financeiro
      let currentY = 55;
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo Financeiro', margin, currentY);
      
      currentY += 10;
      const summaryData = [
        ['Ganhos Totais', `R$ ${formatMoney(periodIncome)}`],
        ['Despesas Pagas', `R$ ${formatMoney(periodPaidExpense)}`],
        ['Despesas Pendentes', `R$ ${formatMoney(periodPendingExpense)}`],
        ['Saldo (Pagas)', `R$ ${formatMoney(periodBalance)}`]
      ];

      (doc as any).autoTable({
        startY: currentY,
        head: [['Descrição', 'Valor']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillStyle: primaryColor, textColor: 255 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;

      // Lista de Transações - ORDENADA COM RECEITA NO TOPO
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Detalhamento de Transações', margin, currentY);

      const sortedForPdf = [...filteredTxs].sort((a, b) => {
        // Primeiro Ganhos (income), depois Despesas (expense)
        if (a.type === 'income' && b.type === 'expense') return -1;
        if (a.type === 'expense' && b.type === 'income') return 1;
        // Dentro do mesmo tipo, ordena por data
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

      const tableBody = sortedForPdf.map(t => [
        new Date(t.dueDate + 'T12:00:00').toLocaleDateString('pt-BR'),
        t.description,
        t.category,
        t.status === 'paid' ? 'Pago' : 'Pendente',
        `${t.type === 'income' ? '+' : '-'} R$ ${formatMoney(t.amount)}`
      ]);

      (doc as any).autoTable({
        startY: currentY + 5,
        head: [['Data', 'Descrição', 'Categoria', 'Status', 'Valor']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85], textColor: 255 },
        columnStyles: { 
          4: { halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 4) {
             const rowValue = sortedForPdf[data.row.index].type;
             data.cell.styles.textColor = rowValue === 'income' ? [5, 150, 105] : [225, 29, 72];
          }
        }
      });

      doc.save(`Relatorio_${months[selectedMonth]}_${selectedYear}.pdf`);
      addToast("Relatório PDF gerado com sucesso!", "success");
    } catch (err) {
      console.error(err);
      addToast("Erro ao gerar PDF.", "error");
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24">
      {/* Header Emerald */}
      <div className="bg-emerald-600 pt-16 pb-20 px-8 text-white rounded-b-[50px] shadow-lg flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Relatórios</h2>
          <p className="text-sm font-medium opacity-70 tracking-wide uppercase">Visão geral histórica</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => window.print()} className="p-4 bg-white/20 hover:bg-white/30 rounded-2xl transition-all border border-white/20 print:hidden"><Printer size={20} /></button>
        </div>
      </div>

      <div className="px-6 -mt-10 space-y-6">
        {/* Seletor de Período e Exportação PDF */}
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-50">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Calendar size={20} /></div>
                <div>
                   <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Relatório por Período</h3>
                   <p className="text-[10px] font-bold text-slate-400">FILTRE E EXPORTE PARA PDF</p>
                </div>
             </div>
             <div className="flex gap-2 w-full sm:w-auto">
                <select 
                   value={selectedMonth} 
                   onChange={e => setSelectedMonth(Number(e.target.value))}
                   className="flex-1 sm:flex-none px-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                >
                   {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select 
                   value={selectedYear} 
                   onChange={e => setSelectedYear(Number(e.target.value))}
                   className="flex-1 sm:flex-none px-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                >
                   {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button 
                   onClick={handleGeneratePDF}
                   disabled={exporting}
                   className="bg-slate-900 text-white p-3 rounded-xl hover:bg-black transition-all disabled:opacity-50"
                >
                   {exporting ? <Loader2 className="animate-spin" size={20} /> : <FileDown size={20} />}
                </button>
             </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
             <div className="text-center p-3 bg-emerald-50/50 rounded-2xl">
                <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Ganhos</p>
                <p className="text-sm font-black text-emerald-700">R$ {formatMoney(periodIncome)}</p>
             </div>
             <div className="text-center p-3 bg-rose-50/50 rounded-2xl">
                <p className="text-[10px] font-bold text-rose-600 uppercase mb-1">Gastos</p>
                <p className="text-sm font-black text-rose-700">R$ {formatMoney(periodPaidExpense)}</p>
             </div>
             <div className="text-center p-3 bg-orange-50/50 rounded-2xl">
                <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">Pendente</p>
                <p className="text-sm font-black text-orange-700">R$ {formatMoney(periodPendingExpense)}</p>
             </div>
             <div className="text-center p-3 bg-slate-100 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Saldo</p>
                <p className="text-sm font-black text-slate-800">R$ {formatMoney(periodBalance)}</p>
             </div>
          </div>
        </div>

        {/* Gráfico Histórico */}
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50">
           <h3 className="text-lg font-black text-slate-800 mb-8 uppercase tracking-widest text-center">Despesas Totais por Categoria</h3>
           <div className="h-80 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={categoryData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                 <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                 <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                 <Bar dataKey="value" fill="#10b981" radius={[10, 10, 10, 10]} barSize={40} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Lista Detalhada Geral */}
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-50 overflow-hidden">
           <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Extrato Geral (Todos os Lançamentos)</h3>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50/50 text-[10px] uppercase font-black text-slate-400">
                    <tr>
                       <th className="px-6 py-4">Data</th>
                       <th className="px-6 py-4">Descrição</th>
                       <th className="px-6 py-4">Status</th>
                       <th className="px-6 py-4 text-right">Valor</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {transactions.slice(0, 50).map(t => (
                       <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-500">
                            {new Date(t.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800">{t.description}</td>
                          <td className="px-6 py-4 font-bold">
                             <span className={`px-2 py-1 rounded-full text-[10px] uppercase ${t.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                {t.status === 'paid' ? 'Pago' : 'Pendente'}
                             </span>
                          </td>
                          <td className={`px-6 py-4 text-right font-black ${t.type === 'income' ? 'text-emerald-600' : t.status === 'paid' ? 'text-rose-500' : 'text-slate-400'}`}>
                             {t.type === 'income' ? '+' : '-'} R$ {formatMoney(t.amount)}
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
              {transactions.length > 50 && <div className="p-4 text-center text-[10px] text-slate-400 font-bold uppercase">Exibindo apenas as 50 transações mais recentes.</div>}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
