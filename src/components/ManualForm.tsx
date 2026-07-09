import React, { useState, useEffect } from "react";
import { X, Plus, Coins, ArrowUpRight, ArrowDownLeft, Settings, Check, ArrowLeftRight } from "lucide-react";
import { TransactionType, Budget, WalletPocket, PaymentMethod } from "../types";

interface ManualFormProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (tx: {
    type: TransactionType;
    amount: number;
    category: string;
    description: string;
    date: string;
    walletId: string;
    method: PaymentMethod;
  }) => void;
  onTransferBalance: (transfer: {
    sourceWalletId: string;
    targetWalletId: string;
    amount: number;
    method: PaymentMethod;
    date: string;
    description: string;
  }) => void;
  categoryBudgets: Budget[];
  onUpdateBudgets: (budgets: Budget[]) => void;
  wallets: WalletPocket[];
  currentModule: string;
}

const getLocalDateTimeLocal = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function ManualForm({ 
  isOpen, 
  onClose, 
  onAddTransaction,
  onTransferBalance,
  categoryBudgets,
  onUpdateBudgets,
  wallets,
  currentModule
}: ManualFormProps) {
  // Tabs: "transaksi" | "pindah" | "anggaran"
  const [activeTab, setActiveTab] = useState<"transaksi" | "pindah" | "anggaran">("transaksi");
  
  // Transaction fields
  const [type, setType] = useState<TransactionType>("pengeluaran");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Makanan & Minuman");
  const [date, setDate] = useState(getLocalDateTimeLocal());
  
  // Multi-wallet fields
  const [walletId, setWalletId] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Cash");

  // Transfer fields
  const [sourceWalletId, setSourceWalletId] = useState("");
  const [targetWalletId, setTargetWalletId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferMethod, setTransferMethod] = useState<PaymentMethod>("Cash");
  const [transferDate, setTransferDate] = useState(getLocalDateTimeLocal());
  const [transferDescription, setTransferDescription] = useState("");

  // Budget fields
  const [localBudgets, setLocalBudgets] = useState<Budget[]>([...categoryBudgets]);

  const activeModuleWallets = wallets.filter((w) => w.module === currentModule);

  // Sync default wallets whenever module or visibility changes
  useEffect(() => {
    if (activeModuleWallets.length > 0) {
      setWalletId(activeModuleWallets[0].id);
      setSourceWalletId(activeModuleWallets[0].id);
      if (activeModuleWallets.length > 1) {
        setTargetWalletId(activeModuleWallets[1].id);
      } else {
        setTargetWalletId("");
      }
    }
  }, [currentModule, isOpen]);

  if (!isOpen) return null;

  // Sync category on type change
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === "pemasukan") {
      setCategory("Pemasukan");
    } else {
      setCategory("Makanan & Minuman");
    }
  };

  const handleSubmitTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    onAddTransaction({
      type,
      amount: parseFloat(amount),
      category: type === "pemasukan" ? "Pemasukan" : category,
      description,
      date,
      walletId: walletId || activeModuleWallets[0]?.id || "",
      method,
    });

    // Reset Form
    setDescription("");
    setAmount("");
    setDate(getLocalDateTimeLocal());
    onClose();
  };

  const handleSubmitTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceWalletId || !targetWalletId || !transferAmount) return;
    if (sourceWalletId === targetWalletId) {
      alert("Dompet sumber dan dompet tujuan tidak boleh sama.");
      return;
    }

    onTransferBalance({
      sourceWalletId,
      targetWalletId,
      amount: parseFloat(transferAmount),
      method: transferMethod,
      date: transferDate,
      description: transferDescription,
    });

    // Reset Form
    setTransferAmount("");
    setTransferDescription("");
    setTransferDate(getLocalDateTimeLocal());
    onClose();
  };

  const handleUpdateBudgetField = (categoryName: string, val: string) => {
    const updated = localBudgets.map((b) => {
      if (b.category === categoryName) {
        return { ...b, limit: parseFloat(val) || 0 };
      }
      return b;
    });
    setLocalBudgets(updated);
  };

  const handleSaveBudgets = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBudgets(localBudgets);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Tabs */}
        <div className="border-b border-slate-100 flex items-center justify-between p-4 bg-slate-50/50">
          <div className="flex gap-1.5 overflow-x-auto max-w-[85%] scrollbar-none">
            <button
              onClick={() => setActiveTab("transaksi")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "transaksi"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> Catat Manual
            </button>
            <button
              onClick={() => setActiveTab("pindah")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "pindah"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" /> Pindah Saldo
            </button>
            <button
              onClick={() => setActiveTab("anggaran")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "anggaran"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Limit Budget
            </button>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "transaksi" ? (
            <form onSubmit={handleSubmitTransaction} className="flex flex-col gap-4">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Tipe Transaksi</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => handleTypeChange("pengeluaran")}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      type === "pengeluaran"
                        ? "bg-white text-rose-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" /> Pengeluaran
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange("pemasukan")}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      type === "pemasukan"
                        ? "bg-white text-emerald-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" /> Pemasukan
                  </button>
                </div>
              </div>

              {/* Pocket Target Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Pilih Dompet / Alokasi Pos</label>
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none bg-slate-50/50 font-bold text-slate-800"
                >
                  {activeModuleWallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Metode Pembayaran</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none bg-slate-50/50 font-bold text-slate-800"
                >
                  <option value="Cash">Cash (Uang Tunai)</option>
                  <option value="TF">TF (Transfer / QRIS / Bank)</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Deskripsi</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={type === "pemasukan" ? "Contoh: Transfer Gaji Bulanan, Jual Barang" : "Contoh: Beli Kopi Susu, Ongkos Gojek"}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none bg-slate-50/50 font-medium"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Nominal (Rupiah)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Contoh: 15000"
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none bg-slate-50/50 font-mono font-bold"
                />
              </div>

              {/* Category (Only if Expense) */}
              {type === "pengeluaran" && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none bg-slate-50/50 font-medium"
                  >
                    <option value="Makanan & Minuman">Makanan & Minuman</option>
                    <option value="Transportasi">Transportasi</option>
                    <option value="Tagihan & Pulsa">Tagihan & Pulsa</option>
                    <option value="Belanja">Belanja</option>
                    <option value="Hiburan">Hiburan</option>
                    <option value="Kesehatan">Kesehatan</option>
                    <option value="Edukasi">Edukasi</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Tanggal & Jam</label>
                <input
                  type="datetime-local"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none bg-slate-50/50 font-medium text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all mt-3 shadow-md shadow-slate-900/10 cursor-pointer"
              >
                Catat Transaksi Sekarang
              </button>
            </form>
          ) : activeTab === "pindah" ? (
            <form onSubmit={handleSubmitTransfer} className="flex flex-col gap-4 animate-fade-in">
              <p className="text-[11px] text-slate-500 leading-relaxed bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/50 flex items-start gap-2 text-indigo-950 font-medium">
                <span className="font-bold text-indigo-700">Info:</span> Memindahkan saldo akan mencatat 1 pengeluaran di dompet asal dan 1 pemasukan di dompet tujuan secara otomatis.
              </p>

              {/* Source Wallet (Dari Dompet) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Dari Dompet (Sumber)</label>
                <select
                  value={sourceWalletId}
                  onChange={(e) => {
                    setSourceWalletId(e.target.value);
                    if (e.target.value === targetWalletId) {
                      const other = activeModuleWallets.find((w) => w.id !== e.target.value);
                      setTargetWalletId(other ? other.id : "");
                    }
                  }}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none bg-slate-50/50 font-bold text-slate-800"
                >
                  {activeModuleWallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Arrow Indicator icon */}
              <div className="flex justify-center -my-2">
                <div className="bg-slate-100 p-2 rounded-full border border-slate-200 text-slate-500 shadow-xs z-10">
                  <ArrowLeftRight className="w-4 h-4 rotate-90 text-indigo-600" />
                </div>
              </div>

              {/* Target Wallet (Ke Dompet) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Ke Dompet (Tujuan)</label>
                <select
                  value={targetWalletId}
                  onChange={(e) => setTargetWalletId(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none bg-slate-50/50 font-bold text-slate-800"
                >
                  {activeModuleWallets
                    .filter((w) => w.id !== sourceWalletId)
                    .map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name}
                      </option>
                    ))}
                  {activeModuleWallets.length <= 1 && (
                    <option value="">(Harap buat dompet lain terlebih dahulu)</option>
                  )}
                </select>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Metode Pemindahan</label>
                <select
                  value={transferMethod}
                  onChange={(e) => setTransferMethod(e.target.value as PaymentMethod)}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none bg-slate-50/50 font-bold text-slate-800"
                >
                  <option value="Cash">Cash (Uang Tunai)</option>
                  <option value="TF">TF (Transfer / QRIS / Bank)</option>
                </select>
              </div>

              {/* Nominal */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Nominal Transfer (Rupiah)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="Contoh: 50000"
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none bg-slate-50/50 font-mono font-bold text-slate-800"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Keterangan / Catatan (Opsional)</label>
                <input
                  type="text"
                  value={transferDescription}
                  onChange={(e) => setTransferDescription(e.target.value)}
                  placeholder="Contoh: Alokasi jajan mingguan, Oper kas"
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none bg-slate-50/50 font-medium text-slate-800"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Tanggal & Jam</label>
                <input
                  type="datetime-local"
                  required
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none bg-slate-50/50 font-medium text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={activeModuleWallets.length <= 1}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all mt-3 shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                Pindahkan Saldo Sekarang
              </button>
            </form>
          ) : (
            <form onSubmit={handleSaveBudgets} className="flex flex-col gap-4">
              <p className="text-xs text-slate-500 mb-1 bg-amber-50 p-3 rounded-2xl border border-amber-100 flex items-start gap-2 text-amber-800 leading-relaxed">
                <span className="font-bold">Info:</span> Anda akan mendapatkan notifikasi/peringatan visual di dasbor jika total pengeluaran per kategori mencapai atau melebihi 80% dari batas limit ini.
              </p>

              <div className="flex flex-col gap-3">
                {localBudgets.map((b) => (
                  <div key={b.category} className="flex items-center justify-between gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-700 truncate">{b.category}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-slate-400 font-bold">Rp</span>
                      <input
                        type="number"
                        min="0"
                        value={b.limit}
                        onChange={(e) => handleUpdateBudgetField(b.category, e.target.value)}
                        className="w-28 p-1.5 text-xs text-right rounded-lg border border-slate-200 focus:border-slate-400 focus:outline-none bg-white font-mono font-bold text-slate-800"
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all mt-3 shadow-md shadow-slate-900/10 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Simpan Konfigurasi Limit
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
