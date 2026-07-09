export type TransactionType = "pemasukan" | "pengeluaran";
export type PaymentMethod = "Cash" | "TF";
export type ModuleType = string;

export interface WalletPocket {
  id: string;
  name: string;
  initialCash: number;
  initialTf: number;
  module: ModuleType;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO string
  walletId: string; // The specific pocket ID
  method: PaymentMethod;
}

export interface Budget {
  category: string;
  limit: number;
}

export interface ParseExpenseResponse {
  amount: number;
  category: string;
  description: string;
  date: string;
  suggestedWalletId?: string;
  method?: PaymentMethod;
}

export interface AppState {
  balance: number;
  transactions: Transaction[];
  monthlyBudget: number;
  categoryBudgets: Budget[];
}

