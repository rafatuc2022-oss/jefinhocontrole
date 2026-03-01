
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc,
  writeBatch,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction, NotificationSettings, Goal } from '../types';

const TRANSACTIONS_COLLECTION = 'transactions';
const SETTINGS_COLLECTION = 'userSettings';
const GOALS_COLLECTION = 'goals';

const handleFirebaseError = (error: any, action: string) => {
  console.error(`Error ${action}: `, error);
  throw error;
};

export const saveNotificationSettings = async (userId: string, settings: NotificationSettings) => {
  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, userId), settings);
  } catch (error) {
    handleFirebaseError(error, "saving settings");
  }
};

export const getNotificationSettings = async (userId: string): Promise<NotificationSettings> => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as NotificationSettings;
    }
    return { alertDaysBefore: 1, enabled: true };
  } catch (error) {
    console.error("Error fetching settings", error);
    return { alertDaysBefore: 1, enabled: true };
  }
};

export const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
  try {
    if (!transaction.userId) {
      throw new Error("Usuário não autenticado.");
    }

    // Lógica para transações recorrentes baseada em contador (quantidade de meses)
    if (transaction.isRecurring && transaction.recurrence?.count && transaction.recurrence.count > 1) {
      const count = Math.min(transaction.recurrence.count, 120);
      const baseDate = new Date(transaction.dueDate + 'T12:00:00');
      const batch = writeBatch(db);
      const transactionsCreated = [];

      for (let i = 0; i < count; i++) {
        const newDocRef = doc(collection(db, TRANSACTIONS_COLLECTION));
        const nextDate = new Date(baseDate.getTime());
        
        nextDate.setMonth(baseDate.getMonth() + i);
        const dateStr = nextDate.toISOString().split('T')[0];
        
        let obs = transaction.observation || '';
        const installmentInfo = `(${i + 1}/${count})`;
        obs = obs ? `${obs} ${installmentInfo}` : installmentInfo;

        const newTransaction = {
          ...transaction,
          dueDate: dateStr,
          observation: obs,
          // Apenas a primeira parcela herda o status enviado, as demais ficam pendentes
          status: (i === 0 ? transaction.status : 'pending'), 
          createdAt: Date.now()
        };

        batch.set(newDocRef, newTransaction);
        transactionsCreated.push({ ...newTransaction, id: newDocRef.id });
      }

      await batch.commit();
      return transactionsCreated[0];
    } 

    const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), transaction);
    return { ...transaction, id: docRef.id };

  } catch (error) {
    handleFirebaseError(error, "adding transaction");
  }
};

export const getTransactions = async (userId: string) => {
  try {
    const q = query(
      collection(db, TRANSACTIONS_COLLECTION), 
      where("userId", "==", userId)
    );
    
    const querySnapshot = await getDocs(q);
    const transactions: Transaction[] = [];
    querySnapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() } as Transaction);
    });
    
    return transactions.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  } catch (error) {
    handleFirebaseError(error, "fetching transactions");
    return []; 
  }
};

export const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
  try {
    const transactionRef = doc(db, TRANSACTIONS_COLLECTION, id);
    await updateDoc(transactionRef, updates);
  } catch (error) {
    handleFirebaseError(error, "updating transaction");
  }
};

export const updateTransactionSeries = async (userId: string, oldDescription: string, updates: Partial<Transaction>) => {
  try {
    const q = query(
      collection(db, TRANSACTIONS_COLLECTION),
      where("userId", "==", userId),
      where("description", "==", oldDescription),
      where("isRecurring", "==", true)
    );
    
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    querySnapshot.docs.forEach(d => {
      // Atualizamos apenas campos genéricos, mantendo as datas originais de cada parcela
      const syncUpdates: any = {};
      if (updates.description) syncUpdates.description = updates.description;
      if (updates.amount !== undefined) syncUpdates.amount = updates.amount;
      if (updates.category) syncUpdates.category = updates.category;
      if (updates.type) syncUpdates.type = updates.type;
      if (updates.observation !== undefined) syncUpdates.observation = updates.observation;
      
      batch.update(d.ref, syncUpdates);
    });
    
    await batch.commit();
  } catch (error) {
    handleFirebaseError(error, "updating transaction series");
  }
};

export const deleteTransaction = async (id: string) => {
  try {
    await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, id));
  } catch (error) {
    handleFirebaseError(error, "deleting transaction");
  }
};

export const deleteTransactionSeries = async (userId: string, description: string) => {
  try {
    const q = query(
      collection(db, TRANSACTIONS_COLLECTION),
      where("userId", "==", userId),
      where("description", "==", description),
      where("isRecurring", "==", true)
    );
    
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    querySnapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    handleFirebaseError(error, "deleting transaction series");
  }
};

export const deleteAllTransactions = async (userId: string) => {
  try {
    const q = query(
      collection(db, TRANSACTIONS_COLLECTION), 
      where("userId", "==", userId)
    );
    
    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs;
    
    if (docs.length === 0) return 0;

    for (let i = 0; i < docs.length; i += 500) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + 500);
      chunk.forEach(d => {
        batch.delete(d.ref);
      });
      await batch.commit();
    }
    
    return docs.length;
  } catch (error) {
    handleFirebaseError(error, "deleting all transactions");
  }
};

export const addGoal = async (goal: Omit<Goal, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, GOALS_COLLECTION), goal);
    return { ...goal, id: docRef.id };
  } catch (error) {
    handleFirebaseError(error, "adding goal");
  }
};

export const getGoals = async (userId: string) => {
  try {
    const q = query(
      collection(db, GOALS_COLLECTION),
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    const goals: Goal[] = [];
    querySnapshot.forEach((doc) => {
      goals.push({ id: doc.id, ...doc.data() } as Goal);
    });
    return goals.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirebaseError(error, "fetching goals");
    return [];
  }
};

export const updateGoal = async (id: string, updates: Partial<Goal>) => {
  try {
    const goalRef = doc(db, GOALS_COLLECTION, id);
    await updateDoc(goalRef, updates);
  } catch (error) {
    handleFirebaseError(error, "updating goal");
  }
};

export const deleteGoal = async (id: string) => {
  try {
    await deleteDoc(doc(db, GOALS_COLLECTION, id));
  } catch (error) {
    handleFirebaseError(error, "deleting goal");
  }
};
