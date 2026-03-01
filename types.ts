
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  notificationSettings?: NotificationSettings;
}

export interface NotificationSettings {
  alertDaysBefore: number; // 0 for "on the day", 1, 3, 7 etc.
  enabled: boolean;
}

export type TransactionType = 'expense' | 'income';

export type PaymentMethod = 'credit_card' | 'debit_card' | 'cash' | 'pix' | 'boleto' | 'transfer';

export type TransactionStatus = 'paid' | 'pending';

export type RecurrenceFrequency = 'monthly' | 'weekly' | 'yearly' | 'one_time';

export interface Transaction {
  id: string;
  userId: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  dueDate: string; // ISO Date string
  contractStartDate?: string; // ISO Date string (Opcional)
  contractEndDate?: string;   // ISO Date string (Opcional)
  paymentMethod?: PaymentMethod;
  status: TransactionStatus;
  isRecurring: boolean;
  recurrence?: {
    frequency: RecurrenceFrequency;
    count?: number; // How many times to repeat. undefined = indefinite
  };
  observation?: string;
  createdAt: number;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  amount: number;
  productLink?: string;
  status: 'active' | 'completed';
  createdAt: number;
  completedAt?: number;
}

export const EXPENSE_CATEGORIES = [
  'Contas Fixas',
  'Saúde',
  'Alimentação',
  'Lazer',
  'Construção',
  'Eletrônicos',
  'Roupas',
  'Transporte',
  'Educação',
  'Outros'
];

export const INCOME_CATEGORIES = [
  'Salário',
  'Freelance',
  'Investimentos',
  'Presente',
  'Outros'
];
