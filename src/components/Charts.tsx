import React from "react";
import { 
  ResponsiveContainer, PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid 
} from "recharts";
import { Transaction, Budget } from "../types";
import { CATEGORY_COLORS } from "../data";
import { formatRupiah } from "./TransactionList";
import { AlertTriangle, TrendingUp, DollarSign } from "lucide-react";

interface ChartsProps {
  transactions: Transaction[];
  categoryBudgets: Budget[];
}

export default function Charts({ transactions, categoryBudgets }: ChartsProps) {
  // 1. Prepare Pie Chart Data (Category Breakdown)
  const expenses = transactions.filter((tx) => tx.type === "pengeluaran");
  
  const categoryMap: Record<string, number> = {};
  expenses.forEach((tx) => {
    categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
  });

  const pieData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value,
    color: CATEGORY_COLORS[name] || "#6B7280",
  })).sort((a, b) => b.value - a.value);

  const totalExpense = expenses.reduce((sum, tx) => sum + tx.amount, 0);

  // 2. Prepare Trend Data (Daily Spending)
  // Get last 7 days or group all in chronological order
  const dailyMap: Record<string, number> = {};
  expenses.forEach((tx) => {
    // Simplify date to MM-DD
    const onlyDate = tx.date.split("T")[0].split(" ")[0];
    const dateParts = onlyDate.split("-");
    const displayDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : tx.date;
    dailyMap[displayDate] = (dailyMap[displayDate] || 0) + tx.amount;
  });

  const trendData = Object.entries(dailyMap).map(([date, amount]) => ({
    date,
    amount,
  })).sort((a, b) => {
    // Basic date sorter DD/MM style
    const [dayA, monthA] = a.date.split("/").map(Number);
    const [dayB, monthB] = b.date.split("/").map(Number);
    if (monthA !== monthB) return monthA - monthB;
    return dayA - dayB;
  }).slice(-7); // Keep last 7 days of activity for focus

  // 3. Budget Status Alerts
  const budgetAlerts = categoryBudgets.map((b) => {
    const currentSpent = categoryMap[b.category] || 0;
    const percentage = b.limit > 0 ? (currentSpent / b.limit) * 100 : 0;
    return {
      category: b.category,
      limit: b.limit,
      spent: currentSpent,
      percentage,
    };
  }).filter((item) => item.percentage >= 80); // Alerts for categories with >= 80% usage

  return (
    <div id="analytics-reports-container" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Category Distribution Pie */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-3 bg-amber-500 rounded-xs"></span>
            Alokasi Pengeluaran
          </h2>
          <p className="text-[11px] text-slate-500">Persentase pengeluaran berdasarkan kategori harian</p>
        </div>

        {pieData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400 text-center">
            <p className="text-xs font-semibold">Belum ada pengeluaran dicatat</p>
            <p className="text-[10px] mt-1">Alokasi chart akan muncul setelah Anda mencatat pengeluaran harian.</p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Chart */}
            <div className="w-full sm:w-1/2 aspect-square max-h-[180px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatRupiah(value)}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #f1f5f9", fontSize: "11px", fontWeight: "bold" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Inner Total */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
                <span className="text-xs font-extrabold text-slate-800 font-mono mt-0.5">{formatRupiah(totalExpense)}</span>
              </div>
            </div>

            {/* Legends */}
            <div className="flex-1 flex flex-col gap-2.5 w-full">
              {pieData.slice(0, 5).map((item) => {
                const percent = totalExpense > 0 ? ((item.value / totalExpense) * 100).toFixed(1) : "0";
                return (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-slate-700 truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 font-mono text-right shrink-0">
                      <span className="font-bold text-slate-800">{formatRupiah(item.value)}</span>
                      <span className="text-[10px] text-slate-400">({percent}%)</span>
                    </div>
                  </div>
                );
              })}
              {pieData.length > 5 && (
                <p className="text-[10px] text-slate-400 text-right font-medium">+{pieData.length - 5} Kategori Lainnya</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Spending Trend Chart */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-3 bg-blue-500 rounded-xs"></span>
            Tren Pengeluaran (7 Aktivitas Terakhir)
          </h2>
          <p className="text-[11px] text-slate-500">Lonjakan dan grafik pengeluaran beberapa waktu terakhir</p>
        </div>

        {trendData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400 text-center">
            <p className="text-xs font-semibold">Belum ada grafik tersedia</p>
            <p className="text-[10px] mt-1">Catat transaksi untuk melihat visualisasi grafik harian.</p>
          </div>
        ) : (
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={false} 
                  style={{ fontSize: "10px", fill: "#94a3b8", fontWeight: "bold" }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  style={{ fontSize: "10px", fill: "#94a3b8", fontFamily: "monospace" }}
                  tickFormatter={(val) => `Rp ${val / 1000}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatRupiah(value), "Pengeluaran"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #f1f5f9", fontSize: "11px", fontWeight: "bold" }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {trendData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#3b82f6" fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Budget Limit Threshold Alerts (Bento Spanning Section) */}
      {budgetAlerts.length > 0 && (
        <div className="lg:col-span-2 bg-red-50/50 rounded-3xl p-5 border border-red-100 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-4 h-4 fill-red-100 animate-bounce" />
            <span className="text-xs font-extrabold uppercase tracking-wider">Peringatan Anggaran Hampir Terlampaui!</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgetAlerts.map((alert) => (
              <div key={alert.category} className="p-3 bg-white rounded-2xl border border-red-100 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">{alert.category}</span>
                  <span className="font-mono font-bold text-red-600">{alert.percentage.toFixed(0)}% terpakai</span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      alert.percentage >= 100 ? "bg-red-600" : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>Terpakai: <strong className="text-slate-600 font-mono">{formatRupiah(alert.spent)}</strong></span>
                  <span>Limit: <strong className="text-slate-600 font-mono">{formatRupiah(alert.limit)}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
