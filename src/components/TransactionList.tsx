import React, { useState } from "react";
import { 
  Search, Filter, Trash2, Calendar, Utensils, Car, Zap, 
  ShoppingBag, Film, HeartPulse, GraduationCap, Coins, MoreHorizontal, ArrowUpRight, ArrowDownLeft, Wallet,
  ArrowLeftRight
} from "lucide-react";
import { Transaction, WalletPocket } from "../types";
import { CATEGORY_COLORS } from "../data";

// Rupiah Formatter
export const formatRupiah = (amount: number) => {
  if (amount < 0) {
    return `-Rp${new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount))}`;
  }
  return `Rp${new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)}`;
};

// Helper to get Category Icon
export const getCategoryIcon = (category: string, type: "pemasukan" | "pengeluaran") => {
  if (type === "pemasukan") return <Coins className="w-4 h-4 text-emerald-600" />;
  
  switch (category) {
    case "Makanan & Minuman":
      return <Utensils className="w-4 h-4 text-amber-600" />;
    case "Transportasi":
      return <Car className="w-4 h-4 text-blue-600" />;
    case "Tagihan & Pulsa":
      return <Zap className="w-4 h-4 text-red-600" />;
    case "Belanja":
      return <ShoppingBag className="w-4 h-4 text-pink-600" />;
    case "Hiburan":
      return <Film className="w-4 h-4 text-purple-600" />;
    case "Kesehatan":
      return <HeartPulse className="w-4 h-4 text-emerald-600" />;
    case "Edukasi":
      return <GraduationCap className="w-4 h-4 text-cyan-600" />;
    default:
      return <MoreHorizontal className="w-4 h-4 text-slate-500" />;
  }
};

// Helper to get Category Badge styling
export const getCategoryBadgeStyle = (category: string, type: "pemasukan" | "pengeluaran") => {
  if (type === "pemasukan") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  
  switch (category) {
    case "Makanan & Minuman":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "Transportasi":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "Tagihan & Pulsa":
      return "bg-red-50 text-red-700 border-red-100";
    case "Belanja":
      return "bg-pink-50 text-pink-700 border-pink-100";
    case "Hiburan":
      return "bg-purple-50 text-purple-700 border-purple-100";
    case "Kesehatan":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "Edukasi":
      return "bg-cyan-50 text-cyan-700 border-cyan-100";
    default:
      return "bg-slate-50 text-slate-700 border-slate-100";
  }
};

// Helper to format transaction date nicely with time/hours if present
export const formatTransactionDate = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    if (dateStr.includes("T")) {
      const [datePart, timePart] = dateStr.split("T");
      const [year, month, day] = datePart.split("-");
      const formattedTime = timePart.slice(0, 5);
      
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", 
        "Jul", "Ags", "Sep", "Okt", "Nov", "Des"
      ];
      const mIdx = parseInt(month, 10) - 1;
      const displayMonth = monthNames[mIdx] || month;
      
      return `${parseInt(day, 10)} ${displayMonth} ${year}, ${formattedTime}`;
    } else if (dateStr.includes(" ")) {
      const [datePart, timePart] = dateStr.split(" ");
      const [year, month, day] = datePart.split("-");
      const formattedTime = timePart.slice(0, 5);
      
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", 
        "Jul", "Ags", "Sep", "Okt", "Nov", "Des"
      ];
      const mIdx = parseInt(month, 10) - 1;
      const displayMonth = monthNames[mIdx] || month;
      
      return `${parseInt(day, 10)} ${displayMonth} ${year}, ${formattedTime}`;
    } else {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const [year, month, day] = parts;
        const monthNames = [
          "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", 
          "Jul", "Ags", "Sep", "Okt", "Nov", "Des"
        ];
        const mIdx = parseInt(month, 10) - 1;
        const displayMonth = monthNames[mIdx] || month;
        return `${parseInt(day, 10)} ${displayMonth} ${year}`;
      }
      return dateStr;
    }
  } catch (e) {
    return dateStr;
  }
};

interface TransactionListProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  wallets: WalletPocket[];
  selectedWalletId: string;
  onSelectWalletId: (id: string) => void;
  onMoveTransaction?: (tx: Transaction) => void;
  isWalletPage?: boolean;
  modules?: any[];
}

export default function TransactionList({ 
  transactions, 
  onDeleteTransaction, 
  wallets,
  selectedWalletId,
  onSelectWalletId,
  onMoveTransaction,
  isWalletPage = false,
  modules
}: TransactionListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"semua" | "pemasukan" | "pengeluaran">("semua");
  const [categoryFilter, setCategoryFilter] = useState("semua");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Filter & Search Logic
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tx.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "semua" ? true : tx.type === typeFilter;
    const matchesCategory = categoryFilter === "semua" ? true : tx.category === categoryFilter;
    const matchesWallet = selectedWalletId === "semua" ? true : tx.walletId === selectedWalletId;
    
    // Extract date portion (YYYY-MM-DD) from tx.date which might be YYYY-MM-DDTHH:MM or YYYY-MM-DD HH:MM
    const txDateOnly = tx.date ? tx.date.split("T")[0].split(" ")[0] : "";
    const matchesStartDate = startDate ? txDateOnly >= startDate : true;
    const matchesEndDate = endDate ? txDateOnly <= endDate : true;
    
    return matchesSearch && matchesType && matchesCategory && matchesWallet && matchesStartDate && matchesEndDate;
  });

  // Unique categories for filtering (excluding "Pemasukan" and "Semua")
  const availableCategories = Array.from(
    new Set(transactions.filter((tx) => tx.type === "pengeluaran").map((tx) => tx.category))
  );

  return (
    <div id="transaction-list-container" className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 flex flex-col gap-5">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            {isWalletPage 
              ? `Riwayat Transaksi: ${wallets.find(w => w.id === selectedWalletId)?.name || "Pos Ini"}` 
              : "Riwayat Transaksi"}
          </h2>
          <p className="text-xs text-slate-500">
            {isWalletPage 
              ? "Daftar seluruh catatan pemasukan dan pengeluaran khusus untuk pos dompet ini" 
              : "Pantau seluruh catatan pemasukan dan pengeluaran harian Anda"}
          </p>
        </div>
        {(!isWalletPage && selectedWalletId !== "semua" || startDate || endDate) && (
          <button
            onClick={() => {
              onSelectWalletId("semua");
              setStartDate("");
              setEndDate("");
            }}
            className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer border border-rose-100"
          >
            Reset Semua Filter
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari transaksi..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 focus:outline-none bg-slate-50/50 placeholder:text-slate-400 font-medium text-slate-700"
          />
        </div>

        {/* Horizontal Pocket Tabs */}
        {!isWalletPage && wallets.length > 0 && (
          <div className="flex flex-col gap-1.5 pb-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1">DOMPET:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-200 -mx-1 px-1">
              <button
                type="button"
                onClick={() => onSelectWalletId("semua")}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 shrink-0 ${
                  selectedWalletId === "semua"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>💼</span>
                <span>Semua Dompet</span>
              </button>
              {wallets.map((w) => {
                const isActive = selectedWalletId === w.id;
                const modIcon = modules?.find(m => m.id === w.module)?.icon || (w.module === "pribadi" ? "👤" : "🛒");
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => onSelectWalletId(w.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-sm scale-[1.02]"
                        : "bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>{modIcon}</span>
                    <span>{w.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e: any) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-slate-400 font-semibold text-slate-700 cursor-pointer"
          >
            <option value="semua">Semua Tipe</option>
            <option value="pemasukan">Pemasukan Only</option>
            <option value="pengeluaran">Pengeluaran Only</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-slate-400 font-semibold text-slate-700 cursor-pointer"
          >
            <option value="semua">Semua Kategori</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-200/60">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 w-12 text-right">Dari:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-slate-400 font-semibold text-slate-700"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 w-12 text-right">Sampai:</span>
            <div className="relative w-full flex items-center gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-slate-400 font-semibold text-slate-700"
              />
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="px-2.5 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all cursor-pointer shrink-0 border border-rose-100"
                  title="Hapus filter rentang tanggal"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs font-semibold text-slate-500">Tidak ada transaksi ditemukan</p>
            <p className="text-[10px] text-slate-400 mt-1">Coba sesuaikan kata pencarian atau filter Anda</p>
          </div>
        ) : (
          filteredTransactions
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((tx) => {
              const isExpense = tx.type === "pengeluaran";
              const targetPocket = wallets.find((w) => w.id === tx.walletId);
              
              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/30 transition-all flex items-center justify-between gap-3 bg-white group"
                >
                  {/* Left Icon and Details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-2.5 rounded-xl border shrink-0 ${
                      isExpense ? "bg-rose-50 border-rose-100 text-rose-500" : "bg-emerald-50 border-emerald-100 text-emerald-500"
                    }`}>
                      {isExpense ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-800 truncate tracking-tight">{tx.description}</p>
                        {targetPocket && !isWalletPage && (
                          <button
                            type="button"
                            onClick={() => onMoveTransaction && onMoveTransaction(tx)}
                            title="Klik untuk memindahkan transaksi ini ke dompet lain"
                            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border flex items-center gap-1 shrink-0 transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                              targetPocket.module === "pribadi" 
                                ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200" 
                                : "bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100"
                            }`}
                          >
                            <Wallet className="w-2.5 h-2.5" />
                            {targetPocket.name}
                          </button>
                        )}
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border shrink-0 font-mono ${
                          tx.method === "Cash" 
                            ? "bg-amber-50 text-amber-800 border-amber-100" 
                            : "bg-purple-50 text-purple-800 border-purple-100"
                        }`}>
                          {tx.method}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {/* Category Badge */}
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${getCategoryBadgeStyle(tx.category, tx.type)}`}>
                          <span>{getCategoryIcon(tx.category, tx.type)}</span>
                          {tx.category}
                        </span>
                        
                        {/* Date */}
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400/80" /> {formatTransactionDate(tx.date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Amount and Delete Action */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <p className={`text-xs font-extrabold font-mono tracking-tight ${isExpense ? "text-slate-800" : "text-emerald-600"}`}>
                      {isExpense ? "-" : "+"} {formatRupiah(tx.amount)}
                    </p>
                    {onMoveTransaction && (
                      <button
                        onClick={() => onMoveTransaction(tx)}
                        className="p-1.5 text-slate-300 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Pindahkan Transaksi ke Dompet Lain"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Hapus Transaksi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
