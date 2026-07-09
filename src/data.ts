import { Transaction, WalletPocket } from "./types";

export const INITIAL_WALLETS: WalletPocket[] = [
  // Pribadi Module
  { id: "pribadi-gaji", name: "Dompet Gaji", initialCash: 60000, initialTf: 0, module: "pribadi" },
  { id: "pribadi-angsuran", name: "Dompet Angsuran", initialCash: 0, initialTf: 11497, module: "pribadi" },
  { id: "pribadi-pokok", name: "Dompet Pokok", initialCash: 110000, initialTf: 0, module: "pribadi" },
  { id: "pribadi-bulanan", name: "Dompet Bulanan", initialCash: 75000, initialTf: 0, module: "pribadi" },
  { id: "pribadi-bangun-rumah", name: "Dompet Bangun Rumah", initialCash: 29000, initialTf: 0, module: "pribadi" },
  { id: "pribadi-tanah", name: "Dompet Tanah", initialCash: 7000, initialTf: 0, module: "pribadi" },
  { id: "pribadi-sedekah", name: "Dompet Sedekah", initialCash: 0, initialTf: 0, module: "pribadi" },
  { id: "pribadi-muham", name: "Dompet Muham", initialCash: 796500, initialTf: 0, module: "pribadi" },
  { id: "pribadi-mahira", name: "Dompet Mahira", initialCash: 372000, initialTf: 0, module: "pribadi" },
  { id: "pribadi-kendaraan", name: "Dompet Kendaraan", initialCash: 0, initialTf: 1805, module: "pribadi" },
  { id: "pribadi-pribadi", name: "Dompet Pribadi", initialCash: 0, initialTf: 65446, module: "pribadi" },
  { id: "pribadi-istri", name: "Dompet Istri", initialCash: 0, initialTf: 0, module: "pribadi" },

  // Toko Module
  { id: "toko-toko", name: "Dompet Toko", initialCash: 0, initialTf: 189000, module: "toko" },
  { id: "toko-overhead", name: "Dompet Overhead", initialCash: 0, initialTf: 245000, module: "toko" },
  { id: "toko-pengembangan-alat", name: "Dompet Pengembangan Alat", initialCash: 0, initialTf: 40189, module: "toko" },
  { id: "toko-penyusutan-alat", name: "Dompet Penyusutan Alat", initialCash: 0, initialTf: 328000, module: "toko" },
  { id: "toko-bahan-baku", name: "Dompet Bahan Baku", initialCash: -23000, initialTf: 3640, module: "toko" },
  { id: "toko-margin", name: "Dompet Margin", initialCash: 0, initialTf: 73000, module: "toko" },
  { id: "toko-gaji-pemilik", name: "Dompet Gaji Pemilik", initialCash: 0, initialTf: 0, module: "toko" },
  { id: "toko-gaji-buruh", name: "Dompet Gaji Buruh", initialCash: 0, initialTf: 65000, module: "toko" },
  { id: "toko-kas-toko", name: "Dompet Kas Toko", initialCash: 0, initialTf: 37500, module: "toko" },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-initial-1",
    type: "pemasukan",
    amount: 500000,
    category: "Pemasukan",
    description: "Dana awal bulanan",
    date: "2026-06-25",
    createdAt: new Date("2026-06-25T08:00:00Z").toISOString(),
    walletId: "pribadi-bulanan",
    method: "Cash",
  },
  {
    id: "tx-initial-2",
    type: "pengeluaran",
    amount: 35000,
    category: "Makanan & Minuman",
    description: "Kopi susu & roti panggang",
    date: "2026-06-29",
    createdAt: new Date("2026-06-29T09:30:00Z").toISOString(),
    walletId: "pribadi-pribadi",
    method: "TF",
  },
];

export const CATEGORY_COLORS: Record<string, string> = {
  "Makanan & Minuman": "#F59E0B", // Amber
  "Transportasi": "#3B82F6", // Blue
  "Tagihan & Pulsa": "#EF4444", // Red
  "Belanja": "#EC4899", // Pink
  "Hiburan": "#8B5CF6", // Purple
  "Kesehatan": "#10B981", // Emerald
  "Edukasi": "#06B6D4", // Cyan
  "Lainnya": "#6B7280", // Gray
  "Pemasukan": "#10B981", // Emerald
};

export const MOCK_RECEIPTS = [
  {
    id: "receipt-1",
    name: "Struk Restoran Padang Sederhana",
    image: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop",
    text: "RESTORAN PADANG SEDERHANA\nTanggal: 2026-06-29\n========================\n1x NASI RAMES RENDANG   45.000\n1x ES TEH MANIS          8.000\n------------------------\nTOTAL                  53.000\n========================\nTerima Kasih Atas Kunjungan Anda"
  },
  {
    id: "receipt-2",
    name: "Struk SPBU Pertamina",
    image: "https://images.unsplash.com/photo-1527018601619-a508a2be00cd?q=80&w=600&auto=format&fit=crop",
    text: "PERTAMINA SPBU 31.124.02\nJAKARTA SELATAN\nTanggal: 2026-06-29 08:30\n========================\nProduk: PERTAMAX (92)\nJumlah: 5.0 Liter\nHarga/L: Rp 13.500\n------------------------\nTOTAL BAYAR          Rp 67.500\n========================\nSimpan Struk Sebagai Bukti"
  },
  {
    id: "receipt-3",
    name: "Struk Minimarket Indomaret",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=600&auto=format&fit=crop",
    text: "INDOMARET JALAN KEMANG\nTanggal: 2026-06-29\n========================\n1x SABUN MANDI CAIR     28.500\n2x CAMILAN CHIPZ        24.000\n1x AIR MINERAL 1.5L      6.500\n------------------------\nTOTAL BELANJA           59.000\n========================\nSelamat Belanja Kembali!"
  }
];
