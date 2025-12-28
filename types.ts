
export type TransactionType = 'CREDIT' | 'DEBIT'; // CREDIT: Paisa Liya (You Got), DEBIT: Paisa Diya (You Gave)

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  date: string;
  note: string;
  attachments?: string[];
}

export type PartyType = 'CUSTOMER' | 'SUPPLIER';

export interface Party {
  id: string;
  name: string;
  phone: string;
  type: PartyType;
  transactions: Transaction[];
  createdAt: string;
  lastReminderSent?: string;
}

export interface User {
  id: string;
  shopName: string;
  phone: string;
  role: 'USER' | 'ADMIN';
  isBlocked: boolean;
}

export type AppState = 'LOGIN' | 'DASHBOARD' | 'PARTY_LIST' | 'PARTY_DETAIL' | 'RECOVERY' | 'ADMIN' | 'REPORTS';

export interface DashboardStats {
  totalYouGave: number;
  totalYouGot: number;
  netBalance: number;
}
