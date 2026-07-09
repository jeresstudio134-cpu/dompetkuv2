import React, { useState, useEffect, useRef } from "react";
import { 
  Wallet, ArrowUpRight, ArrowDownLeft, Plus, Sparkles, 
  Download, Upload, Coins, 
  Clock, Check, Info, ShieldCheck, CreditCard, ChevronRight, Settings,
  GripVertical, ArrowLeftRight, Trash2
} from "lucide-react";
import { Transaction, Budget, TransactionType, WalletPocket, PaymentMethod, ModuleType } from "./types";
import { INITIAL_WALLETS, INITIAL_TRANSACTIONS } from "./data";
import AICatatan from "./components/AICatatan";
import TransactionList, { formatRupiah } from "./components/TransactionList";
import Charts from "./components/Charts";
import ManualForm from "./components/ManualForm";

export default function App() {
  // 1. Core Persistent States
  const [wallets, setWallets] = useState<WalletPocket[]>(() => {
    const saved = localStorage.getItem("dompetku_wallets");
    return saved ? JSON.parse(saved) : INITIAL_WALLETS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem("dompetku_transactions");
    // To match the screenshot exactly on first load, we default to empty transactions
    return saved ? JSON.parse(saved) : [];
  });

  const [categoryBudgets, setCategoryBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem("dompetku_budgets");
    return saved ? JSON.parse(saved) : [
      { category: "Makanan & Minuman", limit: 600000 },
      { category: "Transportasi", limit: 400000 },
      { category: "Tagihan & Pulsa", limit: 1200000 },
      { category: "Belanja", limit: 1500000 },
      { category: "Hiburan", limit: 500000 },
      { category: "Kesehatan", limit: 400000 },
      { category: "Edukasi", limit: 800000 },
      { category: "Lainnya", limit: 300000 },
    ];
  });

  // Active Module State (Pribadi vs Toko)
  const [modules, setModules] = useState<Array<{ id: string; name: string; icon: string }>>(() => {
    const saved = localStorage.getItem("dompetku_modules");
    return saved ? JSON.parse(saved) : [
      { id: "pribadi", name: "Pribadi", icon: "👤" },
      { id: "toko", name: "Toko", icon: "🛒" }
    ];
  });
  const [currentModule, setCurrentModule] = useState<ModuleType>("pribadi");
  
  // UI States for adding custom module
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");
  const [newModuleIcon, setNewModuleIcon] = useState("📁");
  const [editingModule, setEditingModule] = useState<{ id: string; name: string; icon: string } | null>(null);
  
  // Wallet Pocket Filter for the Transaction List
  const [selectedWalletId, setSelectedWalletId] = useState<string>("semua");

  // Active Wallet Detail Page State
  const [activeWalletPageId, setActiveWalletPageId] = useState<string | null>(null);
  const activeWalletPage = wallets.find((w) => w.id === activeWalletPageId) || null;

  // UI States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [systemTime, setSystemTime] = useState("");
  const [alertMessage, setAlertMessage] = useState<{ text: string; type: "success" | "info" } | null>(null);
  const [editingWallet, setEditingWallet] = useState<(WalletPocket & { currentCash?: number; currentTf?: number }) | null>(null);
  const [movingTransaction, setMovingTransaction] = useState<Transaction | null>(null);
  const [targetWalletId, setTargetWalletId] = useState("");
  
  // Custom Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    if (movingTransaction) {
      setTargetWalletId(movingTransaction.walletId);
    }
  }, [movingTransaction]);
  
  // States for adding a new wallet
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [newWalletName, setNewWalletName] = useState("");
  const [newWalletInitialCash, setNewWalletInitialCash] = useState("");
  const [newWalletInitialTf, setNewWalletInitialTf] = useState("");
  const [newWalletModule, setNewWalletModule] = useState<ModuleType>("pribadi");

  const openAddWalletModal = () => {
    setNewWalletName("");
    setNewWalletInitialCash("");
    setNewWalletInitialTf("");
    setNewWalletModule(currentModule);
    setIsAddingWallet(true);
  };
  
  const fileImportRef = useRef<HTMLInputElement>(null);

  // Clear active wallet page when module changes
  useEffect(() => {
    setActiveWalletPageId(null);
  }, [currentModule]);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem("dompetku_wallets", JSON.stringify(wallets));
  }, [wallets]);

  useEffect(() => {
    localStorage.setItem("dompetku_transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("dompetku_budgets", JSON.stringify(categoryBudgets));
  }, [categoryBudgets]);

  useEffect(() => {
    localStorage.setItem("dompetku_modules", JSON.stringify(modules));
  }, [modules]);

  // Keep Clock Updated
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      setSystemTime(now.toLocaleDateString("id-ID", options));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Helper to trigger transient alerts
  const showAlert = (text: string, type: "success" | "info" = "success") => {
    setAlertMessage({ text, type });
    setTimeout(() => setAlertMessage(null), 3500);
  };

  // Cloud Sync States
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error" | "no_connection">("idle");
  const [lastSynced, setLastSynced] = useState<string | null>(() => localStorage.getItem("dompetku_last_synced"));
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);

  const isFirstSyncDone = useRef(false);
  const isSyncingData = useRef(false);

  const performSync = async (
    action: "pull" | "push" | "auto" = "auto",
    customData?: {
      wallets?: WalletPocket[];
      transactions?: Transaction[];
      categoryBudgets?: Budget[];
      modules?: any[];
    }
  ) => {
    setSyncStatus("syncing");
    setSyncErrorMessage(null);
    try {
      if (action === "pull") {
        const response = await fetch("/api/sync");
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned status ${response.status}`);
        }
        const data = await response.json();
        
        isSyncingData.current = true;
        if (data.wallets && data.wallets.length > 0) {
          setWallets(data.wallets);
        }
        if (data.transactions) {
          setTransactions(data.transactions);
        }
        if (data.budgets && data.budgets.length > 0) {
          setCategoryBudgets(data.budgets);
        }
        if (data.modules && data.modules.length > 0) {
          setModules(data.modules);
        }
        
        const nowStr = new Date().toLocaleTimeString("id-ID");
        setLastSynced(nowStr);
        localStorage.setItem("dompetku_last_synced", nowStr);
        setSyncStatus("success");
        showAlert("Berhasil memuat data dari database Neon!", "success");
        setTimeout(() => {
          isSyncingData.current = false;
          isFirstSyncDone.current = true;
        }, 200);
      } else if (action === "push") {
        const payload = {
          wallets: customData?.wallets || wallets,
          transactions: customData?.transactions || transactions,
          budgets: customData?.categoryBudgets || categoryBudgets,
          modules: customData?.modules || modules,
        };
        const response = await fetch("/api/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned status ${response.status}`);
        }
        const resData = await response.json();
        if (resData.success) {
          const nowStr = new Date().toLocaleTimeString("id-ID");
          setLastSynced(nowStr);
          localStorage.setItem("dompetku_last_synced", nowStr);
          setSyncStatus("success");
          // If triggered automatically, avoid annoying alert popups, keeping the sync quiet and seamless
          if (customData) {
            showAlert("Data berhasil disinkronkan ke database Neon!", "success");
          }
        } else {
          throw new Error(resData.message || "Gagal sinkronisasi");
        }
      } else {
        // 'auto' startup checks
        const response = await fetch("/api/sync");
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned status ${response.status}`);
        }
        const data = await response.json();
        
        const isCloudEmpty = (!data.wallets || data.wallets.length === 0) && (!data.transactions || data.transactions.length === 0);
        
        const savedWallets = localStorage.getItem("dompetku_wallets");
        const savedTransactions = localStorage.getItem("dompetku_transactions");
        const hasLocalData = (savedWallets && JSON.parse(savedWallets).length > 0) || (savedTransactions && JSON.parse(savedTransactions).length > 0);
        
        if (isCloudEmpty && hasLocalData) {
          console.log("[Dompetku Sync] Cloud is empty, auto-pushing current local data...");
          const localWallets = savedWallets ? JSON.parse(savedWallets) : wallets;
          const localTransactions = savedTransactions ? JSON.parse(savedTransactions) : transactions;
          const localBudgets = localStorage.getItem("dompetku_budgets") ? JSON.parse(localStorage.getItem("dompetku_budgets")!) : categoryBudgets;
          const localModules = localStorage.getItem("dompetku_modules") ? JSON.parse(localStorage.getItem("dompetku_modules")!) : modules;

          isSyncingData.current = true;
          await performSync("push", {
            wallets: localWallets,
            transactions: localTransactions,
            categoryBudgets: localBudgets,
            modules: localModules,
          });
          setTimeout(() => {
            isSyncingData.current = false;
            isFirstSyncDone.current = true;
          }, 200);
        } else {
          isSyncingData.current = true;
          if (data.wallets && data.wallets.length > 0) {
            setWallets(data.wallets);
          }
          if (data.transactions) {
            setTransactions(data.transactions);
          }
          if (data.budgets && data.budgets.length > 0) {
            setCategoryBudgets(data.budgets);
          }
          if (data.modules && data.modules.length > 0) {
            setModules(data.modules);
          }
          const nowStr = new Date().toLocaleTimeString("id-ID");
          setLastSynced(nowStr);
          localStorage.setItem("dompetku_last_synced", nowStr);
          setSyncStatus("success");
          console.log("[Dompetku Sync] Auto-pulled data from Neon on startup.");
          setTimeout(() => {
            isSyncingData.current = false;
            isFirstSyncDone.current = true;
          }, 200);
        }
      }
    } catch (error: any) {
      console.warn("[Dompetku Sync] Connection or sync error:", error);
      if (error.message && error.message.includes("Neon DATABASE_URL is not set")) {
        setSyncStatus("no_connection");
      } else {
        setSyncStatus("error");
        setSyncErrorMessage(error.message || "Gagal tersambung");
      }
    }
  };

  useEffect(() => {
    performSync("auto");
  }, []);

  // Background Auto-Sync Effect on State Changes
  useEffect(() => {
    if (!isFirstSyncDone.current || isSyncingData.current) return;

    const delayDebounce = setTimeout(() => {
      console.log("[Dompetku Auto-Sync] Local state change detected, auto-saving to Neon database...");
      performSync("push");
    }, 1000);

    return () => clearTimeout(delayDebounce);
  }, [wallets, transactions, categoryBudgets, modules]);

  // 2. Financial Metrics Calculations (Dynamically derived from initial balances + transactions)
  const getWalletBalance = (walletId: string) => {
    const wallet = wallets.find((w) => w.id === walletId);
    if (!wallet) return { cash: 0, tf: 0, total: 0 };
    
    const walletTransactions = transactions.filter((t) => t.walletId === walletId);
    
    let cashChange = 0;
    let tfChange = 0;
    
    walletTransactions.forEach((tx) => {
      const amount = tx.amount;
      if (tx.type === "pemasukan") {
        if (tx.method === "Cash") cashChange += amount;
        else tfChange += amount;
      } else {
        if (tx.method === "Cash") cashChange -= amount;
        else tfChange -= amount;
      }
    });
    
    const cash = wallet.initialCash + cashChange;
    const tf = wallet.initialTf + tfChange;
    const total = cash + tf;
    
    return { cash, tf, total };
  };

  // Filter wallets for the current module
  const moduleWallets = wallets.filter((w) => w.module === currentModule);

  // Calculate totals for active module
  let moduleTotalCash = 0;
  let moduleTotalTf = 0;

  const walletsWithBalances = moduleWallets.map((wallet) => {
    const bal = getWalletBalance(wallet.id);
    moduleTotalCash += bal.cash;
    moduleTotalTf += bal.tf;
    return {
      ...wallet,
      currentCash: bal.cash,
      currentTf: bal.tf,
      currentTotal: bal.total,
    };
  });

  const moduleTotal = moduleTotalCash + moduleTotalTf;

  // Filter transactions associated with the active module's wallets
  const moduleTransactions = transactions.filter((tx) => {
    const wallet = wallets.find((w) => w.id === tx.walletId);
    return wallet && wallet.module === currentModule;
  });

  // 3. Transaction Actions
  const handleAddTransaction = (newTx: {
    type: TransactionType;
    amount: number;
    category: string;
    description: string;
    date: string;
    walletId: string;
    method: PaymentMethod;
  }) => {
    const transaction: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ...newTx,
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [transaction, ...prev]);
    showAlert(
      `Berhasil mencatat ${newTx.type === "pengeluaran" ? "pengeluaran" : "pemasukan"} sebesar ${formatRupiah(newTx.amount)}!`,
      "success"
    );
  };

  const handleTransferBalance = (transfer: {
    sourceWalletId: string;
    targetWalletId: string;
    amount: number;
    method: PaymentMethod;
    date: string;
    description: string;
  }) => {
    const sourceWallet = wallets.find((w) => w.id === transfer.sourceWalletId);
    const targetWallet = wallets.find((w) => w.id === transfer.targetWalletId);
    if (!sourceWallet || !targetWallet) return;

    const timestamp = Date.now();
    const sourceTxId = `tx-${timestamp}-src`;
    const targetTxId = `tx-${timestamp}-tgt`;

    const sourceTx: Transaction = {
      id: sourceTxId,
      type: "pengeluaran",
      amount: transfer.amount,
      category: "Lainnya",
      description: transfer.description.trim() || `Pindah saldo ke ${targetWallet.name}`,
      date: transfer.date,
      walletId: transfer.sourceWalletId,
      method: transfer.method,
      createdAt: new Date().toISOString(),
    };

    const targetTx: Transaction = {
      id: targetTxId,
      type: "pemasukan",
      amount: transfer.amount,
      category: "Pemasukan",
      description: transfer.description.trim() || `Pindah saldo dari ${sourceWallet.name}`,
      date: transfer.date,
      walletId: transfer.targetWalletId,
      method: transfer.method,
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [sourceTx, targetTx, ...prev]);
    showAlert(
      `Berhasil memindahkan saldo ${formatRupiah(transfer.amount)} dari ${sourceWallet.name} ke ${targetWallet.name}!`,
      "success"
    );
  };

  const handleDeleteTransaction = async (id: string) => {
    const txToDelete = transactions.find((t) => t.id === id);
    if (!txToDelete) return;

    const updated = transactions.filter((t) => t.id !== id);
    setTransactions(updated);
    localStorage.setItem("dompetku_transactions", JSON.stringify(updated));
    showAlert(`Berhasil menghapus catatan "${txToDelete.description}"`, "info");

    try {
      await fetch(`/api/sync/transaction/${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Gagal menghapus transaksi dari Neon:", err);
    }
  };

  const handleCreateWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletName.trim()) return;

    const newPocket: WalletPocket = {
      id: "wallet_" + Date.now(),
      name: newWalletName.trim(),
      initialCash: parseFloat(newWalletInitialCash) || 0,
      initialTf: parseFloat(newWalletInitialTf) || 0,
      module: newWalletModule,
    };

    setWallets((prev) => [...prev, newPocket]);
    setIsAddingWallet(false);
    showAlert(`Berhasil membuat dompet baru: ${newPocket.name}`, "success");
  };

  const handleCreateModuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleName.trim()) return;

    const moduleId = newModuleName.trim().toLowerCase().replace(/\s+/g, "_");
    
    // Check if module already exists
    if (modules.some(m => m.id === moduleId)) {
      showAlert(`Kategori pos "${newModuleName}" sudah ada!`, "info");
      return;
    }

    const newModule = {
      id: moduleId,
      name: newModuleName.trim(),
      icon: newModuleIcon
    };

    setModules((prev) => [...prev, newModule]);
    setCurrentModule(moduleId);
    setIsAddingModule(false);
    setNewModuleName("");
    setNewModuleIcon("📁");
    showAlert(`Berhasil membuat kategori pos baru: ${newModule.name}`, "success");
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (moduleId === "pribadi" || moduleId === "toko") {
      showAlert("Kategori bawaan tidak dapat dihapus.", "info");
      return;
    }

    // Get the IDs of all wallets belonging to this module
    const walletsToDelete = wallets.filter((w) => w.module === moduleId);
    const walletIdsToDelete = walletsToDelete.map((w) => w.id);

    // Delete wallets belonging to this module
    const updatedWallets = wallets.filter((w) => w.module !== moduleId);
    setWallets(updatedWallets);
    localStorage.setItem("dompetku_wallets", JSON.stringify(updatedWallets));

    // Delete transactions belonging to the deleted wallets
    const updatedTransactions = transactions.filter((t) => !walletIdsToDelete.includes(t.walletId));
    setTransactions(updatedTransactions);
    localStorage.setItem("dompetku_transactions", JSON.stringify(updatedTransactions));

    // Remove the module
    const updatedModules = modules.filter((m) => m.id !== moduleId);
    setModules(updatedModules);
    localStorage.setItem("dompetku_modules", JSON.stringify(updatedModules));

    setCurrentModule("pribadi");
    setEditingModule(null);
    showAlert("Kategori beserta semua dompet dan transaksi di dalamnya berhasil dihapus.", "success");

    try {
      await fetch(`/api/sync/module/${moduleId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Gagal menghapus kategori dari Neon:", err);
    }
  };

  // 4. Budget Adjustments
  const handleUpdateBudgets = (updatedBudgets: Budget[]) => {
    setCategoryBudgets(updatedBudgets);
    showAlert("Konfigurasi limit anggaran kategori berhasil disimpan!", "success");
  };

  // 5. Backup & Data Management Actions
  const handleExportData = () => {
    const dataStr = JSON.stringify({ transactions, wallets, categoryBudgets }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `backup_dompetku_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showAlert("Backup data berhasil diunduh!", "success");
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (Array.isArray(imported.transactions)) {
            setTransactions(imported.transactions);
          }
          if (Array.isArray(imported.wallets)) {
            setWallets(imported.wallets);
          }
          if (Array.isArray(imported.categoryBudgets)) {
            setCategoryBudgets(imported.categoryBudgets);
          }
          showAlert("Cadangan data berhasil dipulihkan!", "success");
        } catch (err) {
          showAlert("Gagal membaca file backup.", "info");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleResetData = () => {
    setConfirmDialog({
      title: "Kembalikan Data Awal",
      message: "Apakah Anda yakin ingin mengembalikan data awal simulasi? Seluruh catatan tambahan Anda akan terhapus.",
      confirmText: "Ya, Atur Ulang",
      onConfirm: () => {
        setTransactions([]);
        setWallets(INITIAL_WALLETS);
        localStorage.removeItem("dompetku_transactions");
        localStorage.removeItem("dompetku_wallets");
        setSelectedWalletId("semua");
        showAlert("Data dikembalikan ke setingan awal sesuai Excel.", "info");
      }
    });
  };

  const handleFilterByWallet = (walletId: string) => {
    setSelectedWalletId(walletId);
  };

  // States & handlers for drag and drop reordering of wallets
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDraggedOverIndex(index);
  };

  const handleDragLeave = () => {
    setDraggedOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDraggedOverIndex(null);
      return;
    }

    const reorderedModuleWallets = [...moduleWallets];
    const [removed] = reorderedModuleWallets.splice(draggedIndex, 1);
    reorderedModuleWallets.splice(targetIndex, 0, removed);

    let moduleIdx = 0;
    const newWallets = wallets.map((wallet) => {
      if (wallet.module === currentModule) {
        return reorderedModuleWallets[moduleIdx++];
      }
      return wallet;
    });

    setWallets(newWallets);
    setDraggedIndex(null);
    setDraggedOverIndex(null);
    showAlert("Posisi dompet berhasil diubah!", "success");
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDraggedOverIndex(null);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans antialiased">
      
      {/* Upper Utility Navbar */}
      <nav className="border-b border-slate-100 bg-white py-3 px-4 sm:px-6 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center justify-between w-full lg:w-auto gap-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-slate-900 rounded-xl text-white shadow-md shadow-slate-900/10 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-extrabold tracking-tight text-slate-900">Dompetku</h1>
                  <span className="text-[9px] font-extrabold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                    <Sparkles className="w-2 h-2 fill-amber-800/20" /> AI
                  </span>
                </div>
                <p className="text-[9px] font-medium text-slate-400 hidden sm:block">Pencatat Keuangan Multi-Dompet</p>
              </div>
            </div>
          </div>

          {/* Tab Switcher - Now integrated elegantly in Navbar */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl w-full lg:w-auto overflow-x-auto scrollbar-none gap-1 border border-slate-200/40 shrink-0">
            {modules.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setCurrentModule(m.id);
                  setSelectedWalletId("semua");
                }}
                className={`flex-1 lg:flex-initial px-3.5 py-2.5 rounded-xl text-[11px] font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  currentModule === m.id
                    ? "bg-slate-900 text-white shadow-md shadow-slate-950/15 scale-[1.01]"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                }`}
              >
                <span className="text-xs">{m.icon}</span>
                <span className="uppercase">
                  POS {m.name.toLowerCase().startsWith("pos") ? m.name.substring(3).trim().toUpperCase() : m.name.toUpperCase()}
                </span>
                {currentModule === m.id && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingModule(m);
                    }}
                    className="ml-1 p-0.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all cursor-pointer"
                    title="Edit Kategori Ini"
                  >
                    <Settings className="w-2.5 h-2.5" />
                  </span>
                )}
              </button>
            ))}
            
            <button
              onClick={() => setIsAddingModule(true)}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition-all flex items-center justify-center gap-0.5 cursor-pointer border border-dashed border-indigo-200 shrink-0"
              title="Tambah Kategori Pos Baru"
            >
              <Plus className="w-3 h-3" />
              <span>Kategori</span>
            </button>
          </div>

          {/* Dynamic Clock & Sync Status */}
          <div className="flex items-center justify-center lg:justify-end gap-2 w-full lg:w-auto text-slate-500 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-100/60 px-3 py-1.5 rounded-full border border-slate-200/50 font-medium text-[10px] whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{systemTime || "Memuat..."}</span>
            </div>

            {/* Neon DB Sync Badge */}
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border font-bold text-[9px] uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${
                syncStatus === "syncing" 
                  ? "bg-indigo-50 border-indigo-100 text-indigo-700" 
                  : syncStatus === "success" || syncStatus === "idle"
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                  : syncStatus === "error"
                  ? "bg-rose-50 border-rose-100 text-rose-700"
                  : "bg-amber-50 border-amber-100 text-amber-700"
              }`}
              title={
                syncStatus === "syncing" 
                  ? "Sedang menyinkronkan data dengan Neon Postgres..." 
                  : syncStatus === "success" 
                  ? `Berhasil disinkronkan ke Neon Postgres pada pukul ${lastSynced || ""}` 
                  : syncStatus === "error"
                  ? `Gagal sinkronisasi: ${syncErrorMessage || ""}`
                  : syncStatus === "no_connection"
                  ? "Menggunakan database lokal (Offline)"
                  : "Database tersambung."
              }
            >
              <span className="relative flex h-1.5 w-1.5">
                {(syncStatus === "syncing") && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                  syncStatus === "no_connection" 
                    ? "bg-amber-500" 
                    : syncStatus === "error" 
                    ? "bg-rose-500" 
                    : syncStatus === "syncing" 
                    ? "bg-indigo-500" 
                    : "bg-emerald-500"
                }`}></span>
              </span>
              <span>
                {syncStatus === "syncing" && "Menyimpan"}
                {syncStatus === "success" && "Tersinkron"}
                {syncStatus === "idle" && "Neon Aktif"}
                {syncStatus === "error" && "Gagal"}
                {syncStatus === "no_connection" && "Offline"}
              </span>
            </div>
          </div>

        </div>
      </nav>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        
        {/* Alerts banner */}
        {alertMessage && (
          <div className="fixed bottom-6 right-6 p-4 bg-slate-900 text-white text-xs font-bold rounded-2xl shadow-xl flex items-center gap-2.5 z-50 animate-bounce">
            <div className="p-1 bg-emerald-500 rounded-full text-white">
              <Check className="w-3.5 h-3.5 stroke-[3px]" />
            </div>
            <span>{alertMessage.text}</span>
          </div>
        )}

        {activeWalletPage ? (
          /* Render WALLET PAGE DETAIL VIEW */
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Header / Navigation Bar of the Wallet Page */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-xs animate-fade-in">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveWalletPageId(null)}
                  className="p-3 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-2xl transition-colors cursor-pointer flex items-center justify-center border border-slate-100"
                  title="Kembali ke Dashboard"
                >
                  <ArrowUpRight className="w-5 h-5" style={{ transform: "rotate(225deg)" }} />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold bg-indigo-600 text-white px-2 py-1 rounded-md uppercase tracking-wider">
                      {(() => { const m = modules.find(x => x.id === activeWalletPage.module); return m ? `${m.icon} POS ${m.name.toLowerCase().startsWith("pos") ? m.name.substring(3).trim().toUpperCase() : m.name.toUpperCase()}` : activeWalletPage.module; })()}
                    </span>
                    <span className="text-xs font-bold text-slate-400">Halaman Detail Dompet</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
                    {activeWalletPage.name}
                  </h2>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingWallet(activeWalletPage)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" /> Atur Nama & Saldo
                </button>
                <button
                  onClick={() => setActiveWalletPageId(null)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Kembali ke Beranda
                </button>
              </div>
            </div>

            {/* Balances specific to this Wallet */}
            {(() => {
              // Recalculate specific wallet metrics dynamically
              const bal = getWalletBalance(activeWalletPage.id);
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Card 1: Total Saldo Dompet */}
                  <div className="bg-slate-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[140px] border border-slate-900">
                    {/* Background design accents */}
                    <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-40 h-40 bg-gradient-to-br from-indigo-500 to-sky-500 rounded-full opacity-10 blur-xl" />
                    
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                          Total Saldo Dompet
                        </span>
                        <h3 className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight mt-1">
                          {formatRupiah(bal.total)}
                        </h3>
                      </div>
                      <div className="p-3 bg-white/10 rounded-2xl text-white">
                        <CreditCard className="w-5.5 h-5.5" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 border-t border-white/5 pt-3 relative z-10">
                      <span className="text-[10px] font-medium text-slate-300">
                        Pemasukan & Pengeluaran Terhitung
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Saldo Cash Dompet */}
                  <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 flex flex-col justify-between min-h-[140px]">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Saldo Uang Tunai (Cash)</span>
                        <h3 className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight mt-1 ${bal.cash < 0 ? "text-rose-600" : "text-slate-800"}`}>
                          {formatRupiah(bal.cash)}
                        </h3>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-100">
                        <Coins className="w-5.5 h-5.5" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-3 border-t border-slate-50 pt-3">
                      Penyimpanan tunai fisik untuk pos ini.
                    </p>
                  </div>

                  {/* Card 3: Saldo Transfer Dompet */}
                  <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 flex flex-col justify-between min-h-[140px]">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Saldo Transfer / Rekening (TF)</span>
                        <h3 className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight mt-1 ${bal.tf < 0 ? "text-rose-600" : "text-slate-800"}`}>
                          {formatRupiah(bal.tf)}
                        </h3>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-2xl text-purple-600 border border-purple-100">
                        <ArrowUpRight className="w-5.5 h-5.5" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-3 border-t border-slate-50 pt-3">
                      Penyimpanan bank / QRIS / e-wallet untuk pos ini.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Split view: Pre-filled quick entry & Filtered Transactions */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              {/* Left Side: Specific transaction list */}
              <div className="xl:col-span-2">
                <TransactionList 
                  transactions={transactions} 
                  onDeleteTransaction={(id) => handleDeleteTransaction(id)} 
                  wallets={wallets}
                  selectedWalletId={activeWalletPage.id}
                  onSelectWalletId={() => {}} 
                  onMoveTransaction={(tx) => setMovingTransaction(tx)}
                  isWalletPage={true}
                  modules={modules}
                />
              </div>

              {/* Right Side: Quick Add Transaction (Pre-selected to this wallet) */}
              <div className="flex flex-col gap-6">
                
                {/* Specific Quick Form */}
                <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Catat Transaksi Cepat</h3>
                    <p className="text-[10px] text-slate-500">Langsung rekam transaksi untuk dompet {activeWalletPage.name}</p>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const formData = new FormData(form);
                      const type = formData.get("type") as TransactionType;
                      const amount = parseFloat(formData.get("amount") as string) || 0;
                      const category = formData.get("category") as string;
                      const description = formData.get("description") as string;
                      const method = formData.get("method") as PaymentMethod;
                      const date = formData.get("date") as string;

                      if (amount <= 0 || !description || !category) {
                        alert("Harap lengkapi semua isian dengan benar.");
                        return;
                      }

                      handleAddTransaction({
                        type,
                        amount,
                        category,
                        description,
                        walletId: activeWalletPage.id,
                        method,
                        date,
                      });

                      form.reset();
                    }}
                    className="flex flex-col gap-3"
                  >
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Tipe Transaksi</label>
                      <select name="type" className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-slate-400 font-semibold text-slate-700">
                        <option value="pengeluaran">Pengeluaran (Uang Keluar)</option>
                        <option value="pemasukan">Pemasukan (Uang Masuk)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Jumlah (Nominal)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                        <input
                          type="number"
                          name="amount"
                          required
                          min="1"
                          placeholder="Contoh: 50000"
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Kategori</label>
                      <select name="category" className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-slate-400 font-semibold text-slate-700">
                        {categoryBudgets.map((b) => (
                          <option key={b.category} value={b.category}>{b.category}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Deskripsi / Catatan</label>
                      <input
                        type="text"
                        name="description"
                        required
                        placeholder="Contoh: Beli makan siang"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Metode Pembayaran</label>
                      <select name="method" className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-slate-400 font-semibold text-slate-700">
                        <option value="Cash">Cash (Tunai)</option>
                        <option value="TF">Transfer / Rekening / QRIS</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Tanggal & Jam</label>
                      <input
                        type="datetime-local"
                        name="date"
                        required
                        defaultValue={(() => {
                          const d = new Date();
                          const year = d.getFullYear();
                          const month = String(d.getMonth() + 1).padStart(2, "0");
                          const day = String(d.getDate()).padStart(2, "0");
                          const hours = String(d.getHours()).padStart(2, "0");
                          const minutes = String(d.getMinutes()).padStart(2, "0");
                          return `${year}-${month}-${day}T${hours}:${minutes}`;
                        })()}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400"
                      />
                    </div>

                    <button
                      type="submit"
                      className="mt-2 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-md"
                    >
                      + Tambah Transaksi
                    </button>
                  </form>
                </div>

                {/* Categories Breakdown widget for this specific wallet */}
                {(() => {
                  const walletTx = transactions.filter((t) => t.walletId === activeWalletPage.id);
                  const totalSpent = walletTx.filter(t => t.type === "pengeluaran").reduce((s, t) => s + t.amount, 0);

                  return (
                    <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 flex flex-col gap-4 animate-fade-in">
                      <div>
                        <h3 className="text-xs font-extrabold text-slate-900">Distribusi Pengeluaran</h3>
                        <p className="text-[10px] text-slate-500">Maksimal pengeluaran pos ini per kategori</p>
                      </div>

                      <div className="flex flex-col gap-3">
                        {categoryBudgets.map((b) => {
                          const spent = walletTx
                            .filter((t) => t.type === "pengeluaran" && t.category === b.category)
                            .reduce((sum, t) => sum + t.amount, 0);
                          const percent = totalSpent > 0 ? (spent / totalSpent) * 100 : 0;

                          if (spent === 0) return null;

                          return (
                            <div key={b.category} className="flex flex-col gap-1">
                              <div className="flex justify-between items-center text-[10px] font-bold text-slate-700">
                                <span>{b.category}</span>
                                <span className="font-mono text-slate-500">
                                  {formatRupiah(spent)} ({percent.toFixed(0)}%)
                                </span>
                              </div>
                              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-slate-900 rounded-full"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                        {totalSpent === 0 && (
                          <div className="text-center py-4 text-slate-400 text-[11px] font-medium italic">
                            Belum ada pengeluaran dicatat
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Dashboard Title & Backup Tools */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white rounded-3xl p-5 border border-slate-100 shadow-xs">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Pencatat Pengeluaran Dompetku
                </h2>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Kelola pos dana {modules.map(m => m.name).join(', ')} dengan visualisasi amplop anggaran dinamis.
                </p>
              </div>
              
              {/* Export / Seed tools */}
              <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
                <button
                  onClick={handleExportData}
                  className="flex-1 lg:flex-initial px-3.5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Unduh file backup JSON"
                >
                  <Download className="w-3.5 h-3.5" /> Ekspor
                </button>
                <button
                  onClick={() => fileImportRef.current?.click()}
                  className="flex-1 lg:flex-initial px-3.5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Impor file backup JSON"
                >
                  <Upload className="w-3.5 h-3.5" /> Impor
                </button>
                <input
                  type="file"
                  ref={fileImportRef}
                  onChange={handleImportData}
                  accept=".json"
                  className="hidden"
                />
              </div>
            </div>


        {/* FINANCIAL SUMMARY STATUS CARDS (Module-Specific) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: Total Saldo Pos */}
          <div className="bg-slate-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[160px] group border border-slate-900">
            {/* Background design accents */}
            <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-40 h-40 bg-gradient-to-br from-indigo-500 to-sky-500 rounded-full opacity-10 blur-xl group-hover:scale-125 transition-all duration-700" />
            
            <div className="flex items-start justify-between relative z-10">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Total Saldo {modules.find(m => m.id === currentModule)?.name || currentModule} (Preview)
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight mt-1">
                  {formatRupiah(moduleTotal)}
                </h3>
              </div>
              <div className="p-3 bg-white/10 rounded-2xl text-white">
                <CreditCard className="w-5.5 h-5.5" />
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 relative z-10 border-t border-white/5 pt-4">
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-full">
                <Check className="w-3 h-3 stroke-[3px]" /> Saldo Aman
              </span>
              <button
                onClick={() => setIsFormOpen(true)}
                className="text-xs font-bold bg-white text-slate-950 hover:bg-slate-100 px-4 py-2 rounded-xl transition-all flex items-center gap-1 shadow-md shadow-white/5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3px]" /> Catat Manual
              </button>
            </div>
          </div>

          {/* Card 2: Saldo Cash */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 flex flex-col justify-between min-h-[160px]">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Total Cash</span>
                <h3 className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight mt-1 ${moduleTotalCash < 0 ? "text-rose-600" : "text-slate-800"}`}>
                  {formatRupiah(moduleTotalCash)}
                </h3>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-100">
                <Coins className="w-5.5 h-5.5" />
              </div>
            </div>
            
            <div className="text-[10px] text-slate-400 font-medium mt-4 border-t border-slate-50 pt-4 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" /> Akumulasi uang tunai (cash) pada seluruh pos aktif.
            </div>
          </div>

          {/* Card 3: Saldo Transfer */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 flex flex-col justify-between min-h-[160px]">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Total Transfer (TF)</span>
                <h3 className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight mt-1 ${moduleTotalTf < 0 ? "text-rose-600" : "text-slate-800"}`}>
                  {formatRupiah(moduleTotalTf)}
                </h3>
              </div>
              <div className="p-3 bg-purple-50 rounded-2xl text-purple-600 border border-purple-100">
                <ArrowUpRight className="w-5.5 h-5.5" />
              </div>
            </div>
            
            <div className="text-[10px] text-slate-400 font-medium mt-4 border-t border-slate-50 pt-4 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" /> Akumulasi saldo rekening / bank / QRIS pada pos aktif.
            </div>
          </div>

        </div>

        {/* WORKSPACE SECTIONS SPLIT LAYOUT */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          
          {/* Left Columns (Col Span 2): AI Entry + Pockets Table + Financial Analytics */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            
            {/* AI Auto Expense Input */}
            <AICatatan 
              onAddTransaction={(tx) => handleAddTransaction(tx)} 
              wallets={wallets} 
              currentModule={currentModule} 
            />

            {/* High Fidelity Pockets Allocation Table (Dynamic and Matching user's Excel) */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 flex flex-col gap-4 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Tabel Alokasi Pos Dompet</h3>
                  <p className="text-xs text-slate-400">Daftar virtual envelope dan alokasi dana per pos anggaran harian</p>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold bg-slate-900 text-white px-3 py-1.5 rounded-xl uppercase tracking-wider">
                      {(() => { const m = modules.find(x => x.id === currentModule); return m ? `${m.icon} POS ${m.name.toLowerCase().startsWith("pos") ? m.name.substring(3).trim().toUpperCase() : m.name.toUpperCase()}` : currentModule; })()}
                    </span>
                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg hidden md:inline-block">
                      (Klik nama pos untuk detail • Tarik nomor urut ☰ untuk memindah posisi)
                    </span>
                  </div>
                  <button
                    onClick={openAddWalletModal}
                    className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Dompet
                  </button>
                </div>
              </div>

              {/* Pockets Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider bg-slate-50/50">
                      <th className="py-3 px-4 w-16 text-center">Urutan</th>
                      <th className="py-3 px-4">Nama Pos Dompet</th>
                      <th className="py-3 px-4 text-right">Cash</th>
                      <th className="py-3 px-4 text-right">TF (Transfer)</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {walletsWithBalances.map((pocket, idx) => {
                      const isFiltered = selectedWalletId === pocket.id;
                      return (
                        <tr 
                          key={pocket.id} 
                          draggable
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, idx)}
                          onDragEnd={handleDragEnd}
                          className={`text-xs transition-all duration-200 select-none ${
                            draggedIndex === idx ? "opacity-30 bg-slate-100" : ""
                          } ${
                            draggedOverIndex === idx ? "bg-indigo-50/80 border-y border-indigo-200 scale-[0.99]" : "hover:bg-slate-50/50"
                          } ${
                            isFiltered ? "bg-slate-50 font-bold border-l-4 border-slate-900" : ""
                          }`}
                        >
                          <td className="py-3 px-4 text-center text-slate-400 font-mono font-semibold flex items-center justify-center gap-1.5 cursor-grab active:cursor-grabbing group/drag" title="Tarik untuk memindah urutan pos">
                            <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover/drag:text-slate-500 transition-colors shrink-0" />
                            <span>{idx + 1}</span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => setActiveWalletPageId(pocket.id)}
                              className="font-bold text-slate-800 hover:text-indigo-600 hover:underline text-left cursor-pointer flex items-center gap-1.5 transition-colors group/name"
                              title="Masuk Halaman Dompet"
                            >
                              <span>{pocket.name}</span>
                              <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover/name:opacity-100 transition-all text-indigo-600" />
                            </button>
                          </td>
                          <td className={`py-3 px-4 text-right font-mono font-semibold ${pocket.currentCash < 0 ? "text-rose-600" : "text-slate-700"}`}>
                            {formatRupiah(pocket.currentCash)}
                          </td>
                          <td className={`py-3 px-4 text-right font-mono font-semibold ${pocket.currentTf < 0 ? "text-rose-600" : "text-slate-700"}`}>
                            {formatRupiah(pocket.currentTf)}
                          </td>
                          <td className={`py-3 px-4 text-right font-mono font-extrabold ${pocket.currentTotal < 0 ? "text-rose-600" : "text-slate-800"}`}>
                            {formatRupiah(pocket.currentTotal)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center">
                              <button
                                onClick={() => setEditingWallet(pocket)}
                                className="text-[10px] font-bold text-slate-100 bg-slate-900 hover:bg-slate-800 px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Edit Dompet"
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Table Footer with Sum totals */}
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50 font-extrabold text-xs text-slate-800">
                      <td className="py-3 px-4 text-center">Σ</td>
                      <td className="py-3 px-4 uppercase tracking-wider text-[10px] text-slate-500 font-extrabold">Total {modules.find(x => x.id === currentModule)?.name || currentModule}</td>
                      <td className={`py-3 px-4 text-right font-mono ${moduleTotalCash < 0 ? "text-rose-600" : "text-slate-900"}`}>{formatRupiah(moduleTotalCash)}</td>
                      <td className={`py-3 px-4 text-right font-mono ${moduleTotalTf < 0 ? "text-rose-600" : "text-slate-900"}`}>{formatRupiah(moduleTotalTf)}</td>
                      <td className={`py-3 px-4 text-right font-mono ${moduleTotal < 0 ? "text-rose-600" : "text-slate-900"}`}>{formatRupiah(moduleTotal)}</td>
                      <td className="py-3 px-4"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

          </div>

          {/* Right Column (Col Span 1): Transaction Logs + Budget Widgets */}
          <div className="flex flex-col gap-6">
            
            {/* Live Interactive Transaction List with Filters */}
            {(() => {
              const activeModuleWalletIds = moduleWallets.map(w => w.id);
              const moduleTransactions = transactions.filter(t => activeModuleWalletIds.includes(t.walletId));
              return (
                <TransactionList 
                  transactions={moduleTransactions} 
                  onDeleteTransaction={(id) => handleDeleteTransaction(id)} 
                  wallets={moduleWallets}
                  selectedWalletId={selectedWalletId}
                  onSelectWalletId={setSelectedWalletId}
                  onMoveTransaction={(tx) => setMovingTransaction(tx)}
                  modules={modules}
                />
              );
            })()}

          </div>

        </div>

          </>
        )}

      </main>

      {/* Manual Input Modal + Budget Configurations */}
      <ManualForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onAddTransaction={(tx) => handleAddTransaction(tx)}
        onTransferBalance={(transfer) => handleTransferBalance(transfer)}
        categoryBudgets={categoryBudgets}
        onUpdateBudgets={(budgets) => handleUpdateBudgets(budgets)}
        wallets={wallets}
        currentModule={currentModule}
      />

      {/* Edit Initial Wallet Pocket Balances Modal */}
      {editingWallet && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">Edit Dompet - {editingWallet.name}</h3>
              <button onClick={() => setEditingWallet(null)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>
            
            <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
              Ubah nama dompet serta saldo nominal saat ini (termasuk pemasukan dan pengeluaran) di bawah ini sesuai keinginan Anda.
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nama Pos Dompet</label>
                <input
                  type="text"
                  value={editingWallet.name}
                  onChange={(e) => setEditingWallet({ ...editingWallet, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400"
                  placeholder="Nama Dompet"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Kategori Pos</label>
                <select
                  value={editingWallet.module}
                  onChange={(e) => setEditingWallet({ ...editingWallet, module: e.target.value as ModuleType })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.icon} POS {m.name.toLowerCase().startsWith("pos") ? m.name.substring(3).trim().toUpperCase() : m.name.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Saldo Cash Saat Ini (Uang Tunai)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    value={editingWallet.currentCash !== undefined ? editingWallet.currentCash : editingWallet.initialCash}
                    onChange={(e) => setEditingWallet({ ...editingWallet, currentCash: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Saldo TF Saat Ini (Transfer / QRIS / Rekening)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    value={editingWallet.currentTf !== undefined ? editingWallet.currentTf : editingWallet.initialTf}
                    onChange={(e) => setEditingWallet({ ...editingWallet, currentTf: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-2">
              <button
                onClick={() => {
                  const walletTransactions = transactions.filter((t) => t.walletId === editingWallet.id);
                  let cashChange = 0;
                  let tfChange = 0;
                  walletTransactions.forEach((tx) => {
                    const amount = tx.amount;
                    if (tx.type === "pemasukan") {
                      if (tx.method === "Cash") cashChange += amount;
                      else tfChange += amount;
                    } else {
                      if (tx.method === "Cash") cashChange -= amount;
                      else tfChange -= amount;
                    }
                  });

                  const editedCurrentCash = editingWallet.currentCash !== undefined ? editingWallet.currentCash : editingWallet.initialCash;
                  const editedCurrentTf = editingWallet.currentTf !== undefined ? editingWallet.currentTf : editingWallet.initialTf;

                  const updatedWallet: WalletPocket = {
                    id: editingWallet.id,
                    name: editingWallet.name,
                    initialCash: editedCurrentCash - cashChange,
                    initialTf: editedCurrentTf - tfChange,
                    module: editingWallet.module,
                  };

                  setWallets(wallets.map(w => w.id === editingWallet.id ? updatedWallet : w));
                  setEditingWallet(null);
                  showAlert(`Berhasil memperbarui dompet ${editingWallet.name}`, "success");
                }}
                className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Simpan Perubahan
              </button>
              <button
                onClick={() => setEditingWallet(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>

            {/* Hapus Dompet */}
            <div className="border-t border-slate-100 pt-3 mt-1">
              <button
                type="button"
                onClick={() => {
                  setConfirmDialog({
                    title: `Hapus Dompet "${editingWallet.name}"`,
                    message: `Apakah Anda yakin ingin menghapus dompet "${editingWallet.name}"? Semua data transaksi yang menggunakan dompet ini juga akan dihapus permanen.`,
                    onConfirm: async () => {
                      const targetId = editingWallet.id;
                      const targetName = editingWallet.name;

                      // Delete transactions
                      const updatedTransactions = transactions.filter(t => t.walletId !== targetId);
                      setTransactions(updatedTransactions);
                      localStorage.setItem("dompetku_transactions", JSON.stringify(updatedTransactions));

                      // Delete wallet
                      const updatedWallets = wallets.filter(w => w.id !== targetId);
                      setWallets(updatedWallets);
                      localStorage.setItem("dompetku_wallets", JSON.stringify(updatedWallets));

                      // Reset active wallet page if needed
                      if (activeWalletPageId === targetId) {
                        setActiveWalletPageId(null);
                      }
                      setEditingWallet(null);
                      showAlert(`Dompet "${targetName}" beserta seluruh transaksinya telah dihapus.`, "info");

                      try {
                        await fetch(`/api/sync/wallet/${targetId}`, {
                          method: "DELETE",
                        });
                      } catch (err) {
                        console.error("Gagal menghapus dompet dari Neon:", err);
                      }
                    }
                  });
                }}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus Dompet Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pindahkan Transaksi ke Dompet Lain Modal */}
      {movingTransaction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-indigo-500" />
                Pindahkan Pos Dompet Transaksi
              </h3>
              <button 
                onClick={() => setMovingTransaction(null)} 
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 text-xs text-slate-600 flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span className="font-medium text-slate-400">Deskripsi:</span>
                <span className="font-extrabold text-slate-800">{movingTransaction.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-400">Nominal:</span>
                <span className={`font-extrabold font-mono ${movingTransaction.type === "pengeluaran" ? "text-slate-800" : "text-emerald-600"}`}>
                  {movingTransaction.type === "pengeluaran" ? "-" : "+"} {formatRupiah(movingTransaction.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-400">Kategori:</span>
                <span className="font-bold text-slate-700">{movingTransaction.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-400">Dompet Saat Ini:</span>
                <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">
                  {wallets.find(w => w.id === movingTransaction.walletId)?.name || "Tidak Diketahui"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Pilih Dompet Tujuan Baru</label>
              <select
                value={targetWalletId}
                onChange={(e) => setTargetWalletId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {modules.find(m => m.id === w.module)?.icon || "📁"} {w.name} {w.id === movingTransaction.walletId ? "(Dompet Saat Ini)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 justify-end mt-2 border-t border-slate-50 pt-3">
              <button
                onClick={() => {
                  if (targetWalletId === movingTransaction.walletId) {
                    setMovingTransaction(null);
                    return;
                  }
                  
                  // Update the transaction walletId
                  const updatedTransactions = transactions.map((t) => {
                    if (t.id === movingTransaction.id) {
                      return { ...t, walletId: targetWalletId };
                    }
                    return t;
                  });
                  setTransactions(updatedTransactions);
                  
                  const targetWallet = wallets.find((w) => w.id === targetWalletId);
                  showAlert(`Transaksi berhasil dipindahkan ke dompet "${targetWallet?.name}"`, "success");
                  setMovingTransaction(null);
                }}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Pindahkan Sekarang
              </button>
              <button
                onClick={() => setMovingTransaction(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tambah Dompet Baru Modal */}
      {isAddingWallet && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form onSubmit={handleCreateWalletSubmit} className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">Tambah Dompet Baru</h3>
              <button type="button" onClick={() => setIsAddingWallet(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>
            
            <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
              Buat pos dompet virtual baru untuk mengelompokkan anggaran dan melacak pengeluaran secara terpisah.
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nama Pos Dompet</label>
                <input
                  type="text"
                  required
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400"
                  placeholder="Contoh: Dompet Jajan, Kas Kecil"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Kategori Pos</label>
                <select
                  value={newWalletModule}
                  onChange={(e) => setNewWalletModule(e.target.value as ModuleType)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.icon} POS {m.name.toLowerCase().startsWith("pos") ? m.name.substring(3).trim().toUpperCase() : m.name.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Saldo Cash Awal (Uang Tunai)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={newWalletInitialCash}
                    onChange={(e) => setNewWalletInitialCash(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Saldo TF Awal (Transfer / QRIS / Rekening)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={newWalletInitialTf}
                    onChange={(e) => setNewWalletInitialTf(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Buat Dompet
              </button>
              <button
                type="button"
                onClick={() => setIsAddingWallet(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tambah Kategori Pos Baru Modal */}
      {isAddingModule && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form onSubmit={handleCreateModuleSubmit} className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">Tambah Kategori Pos Baru</h3>
              <button type="button" onClick={() => setIsAddingModule(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>
            
            <p className="text-[11px] text-slate-500 leading-relaxed bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/50">
              Kategori Pos Utama mengelompokkan pos-pos dompet Anda secara independen (seperti POS PRIBADI dan POS TOKO).
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nama Kategori Pos</label>
                <input
                  type="text"
                  required
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400"
                  placeholder="Contoh: Bisnis, Tabungan, Investasi"
                  maxLength={20}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Pilih Icon/Emoji</label>
                <div className="grid grid-cols-6 gap-2">
                  {["👤", "🛒", "💼", "🐷", "🏡", "✈️", "🎓", "💸", "🍜", "🚗", "🏠", "🎁"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewModuleIcon(emoji)}
                      className={`py-2 text-lg rounded-xl border transition-all cursor-pointer ${
                        newModuleIcon === emoji
                          ? "bg-slate-900 border-slate-900 text-white scale-110 shadow-sm"
                          : "bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Buat Kategori
              </button>
              <button
                type="button"
                onClick={() => setIsAddingModule(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Kategori Pos Modal */}
      {editingModule && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">Edit Kategori Pos</h3>
              <button type="button" onClick={() => setEditingModule(null)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/50">
              Ubah nama atau emoji untuk kategori pos ini. Jika Anda menghapus kategori, semua dompet di dalamnya akan otomatis dipindahkan ke kategori "Pribadi".
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nama Kategori Pos</label>
                <input
                  type="text"
                  required
                  value={editingModule.name}
                  onChange={(e) => setEditingModule({ ...editingModule, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400"
                  placeholder="Nama Kategori"
                  maxLength={20}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Pilih Icon/Emoji</label>
                <div className="grid grid-cols-6 gap-2">
                  {["👤", "🛒", "💼", "🐷", "🏡", "✈️", "🎓", "💸", "🍜", "🚗", "🏠", "🎁", "📁"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEditingModule({ ...editingModule, icon: emoji })}
                      className={`py-2 text-lg rounded-xl border transition-all cursor-pointer ${
                        editingModule.icon === emoji
                          ? "bg-slate-900 border-slate-900 text-white scale-110 shadow-sm"
                          : "bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!editingModule.name.trim()) return;
                    setModules(modules.map(m => m.id === editingModule.id ? { ...m, name: editingModule.name.trim(), icon: editingModule.icon } : m));
                    setEditingModule(null);
                    showAlert("Kategori berhasil diperbarui", "success");
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  Simpan Perubahan
                </button>
                <button
                  type="button"
                  onClick={() => setEditingModule(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>

              {editingModule.id !== "pribadi" && editingModule.id !== "toko" && (
                <div className="border-t border-slate-100 pt-3 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDialog({
                        title: `Hapus Kategori "${editingModule.name}"`,
                        message: `Apakah Anda yakin ingin menghapus kategori "${editingModule.name}"? Semua dompet dan transaksi di dalamnya akan terhapus.`,
                        onConfirm: () => {
                          handleDeleteModule(editingModule.id);
                        }
                      });
                    }}
                    className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus Kategori Ini
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2.5 text-rose-600 border-b border-slate-100 pb-3">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-extrabold text-slate-900">{confirmDialog.title}</h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              {confirmDialog.message}
            </p>

            <div className="flex gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
              >
                {confirmDialog.confirmText || "Ya, Hapus"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                {confirmDialog.cancelText || "Batal"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
