import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Camera, Trash2, Check, ArrowRight, Loader2, Info, CreditCard } from "lucide-react";
import { MOCK_RECEIPTS } from "../data";
import { ParseExpenseResponse, WalletPocket, PaymentMethod } from "../types";

interface AICatatanProps {
  onAddTransaction: (tx: {
    type: "pengeluaran";
    amount: number;
    category: string;
    description: string;
    date: string;
    walletId: string;
    method: PaymentMethod;
  }) => void;
  wallets: WalletPocket[];
  currentModule: string;
}

export default function AICatatan({ onAddTransaction, wallets, currentModule }: AICatatanProps) {
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<string>("");
  const [parsedResult, setParsedResult] = useState<ParseExpenseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Extra fields for parsed result
  const [targetWalletId, setTargetWalletId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter wallets for the active module
  const activeModuleWallets = wallets.filter((w) => w.module === currentModule);

  // Set default wallet whenever module changes or parsed result changes
  useEffect(() => {
    if (activeModuleWallets.length > 0) {
      setTargetWalletId(activeModuleWallets[0].id);
    }
  }, [currentModule]);

  // Convert File to Base64
  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Mohon unggah file gambar struk (PNG, JPG, JPEG).");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setImageMime(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Helper to load mock receipt
  const loadMockReceipt = (index: number) => {
    const mock = MOCK_RECEIPTS[index];
    setSelectedImage(mock.image);
    setImageMime("image/jpeg");
    setInputText(mock.text);
    setError(null);
    setParsedResult(null);
  };

  const handleClear = () => {
    setSelectedImage(null);
    setImageMime("");
    setInputText("");
    setParsedResult(null);
    setError(null);
  };

  // Process receipt or prompt with Gemini API
  const handleProcessAI = async () => {
    if (!inputText.trim() && !selectedImage) {
      setError("Silakan tulis pengeluaran Anda atau unggah gambar struk terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setParsedResult(null);

    try {
      setAiStatus("Mengaktifkan Gemini 3.5-Flash...");
      await new Promise((resolve) => setTimeout(resolve, 600));

      setAiStatus(selectedImage ? "Menganalisis teks dan nominal pada struk belanja..." : "Membaca teks deskripsi pengeluaran harian...");
      await new Promise((resolve) => setTimeout(resolve, 800));

      setAiStatus("Mengkategorikan dan menyusun data transaksi...");
      
      const response = await fetch("/api/parse-expense", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: inputText,
          image: selectedImage,
          mimeType: imageMime,
          currentDate: new Date().toISOString().split("T")[0],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const details = errorData.details || "";
        throw new Error(details || errorData.error || "Gagal memproses struk belanja.");
      }

      const result: ParseExpenseResponse = await response.json();
      setParsedResult(result);

      // Smart Wallet mapping suggestion
      if (activeModuleWallets.length > 0) {
        // Try to guess based on description keywords
        const descLower = result.description.toLowerCase();
        let matchedWallet = activeModuleWallets[0].id;

        if (currentModule === "pribadi") {
          if (descLower.includes("gaji") || descLower.includes("gajihan")) matchedWallet = "pribadi-gaji";
          else if (descLower.includes("angsuran") || descLower.includes("cicilan") || descLower.includes("bayar")) matchedWallet = "pribadi-angsuran";
          else if (descLower.includes("makan") || descLower.includes("kopi") || descLower.includes("bakso") || descLower.includes("teh") || descLower.includes("resto")) matchedWallet = "pribadi-bulanan";
          else if (descLower.includes("semen") || descLower.includes("bata") || descLower.includes("rumah")) matchedWallet = "pribadi-bangun-rumah";
          else if (descLower.includes("bensin") || descLower.includes("ojek") || descLower.includes("gojek") || descLower.includes("grab") || descLower.includes("kendaraan")) matchedWallet = "pribadi-kendaraan";
          else if (descLower.includes("sedekah") || descLower.includes("amal") || descLower.includes("masjid")) matchedWallet = "pribadi-sedekah";
          else matchedWallet = "pribadi-pribadi";
        } else {
          // Toko mapping
          if (descLower.includes("alat") || descLower.includes("mesin") || descLower.includes("laptop")) matchedWallet = "toko-pengembangan-alat";
          else if (descLower.includes("bahan") || descLower.includes("baku") || descLower.includes("sabun") || descLower.includes("barang")) matchedWallet = "toko-bahan-baku";
          else if (descLower.includes("kas") || descLower.includes("kembalian")) matchedWallet = "toko-kas-toko";
          else if (descLower.includes("sewa") || descLower.includes("listrik") || descLower.includes("wifi")) matchedWallet = "toko-overhead";
          else matchedWallet = "toko-toko";
        }

        setTargetWalletId(matchedWallet);
      }

      // Default payment method suggestion
      if (result.description.toLowerCase().includes("transfer") || result.description.toLowerCase().includes("tf") || result.description.toLowerCase().includes("debit") || result.description.toLowerCase().includes("qris")) {
        setPaymentMethod("TF");
      } else {
        setPaymentMethod("Cash");
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan saat menghubungi server AI.");
    } finally {
      setIsLoading(false);
      setAiStatus("");
    }
  };

  // Confirm and save transaction
  const handleConfirmTransaction = () => {
    if (!parsedResult) return;
    onAddTransaction({
      type: "pengeluaran",
      amount: parsedResult.amount,
      category: parsedResult.category,
      description: parsedResult.description,
      date: parsedResult.date,
      walletId: targetWalletId,
      method: paymentMethod,
    });
    handleClear();
  };

  // Tweak parsed result values
  const updateParsedField = (field: keyof ParseExpenseResponse, value: any) => {
    if (!parsedResult) return;
    setParsedResult({
      ...parsedResult,
      [field]: value,
    });
  };

  return (
    <div id="ai-catatan-container" className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-50 rounded-xl text-amber-500">
            <Sparkles className="w-5 h-5 fill-amber-500/20" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Catat Otomatis (AI)</h2>
            <p className="text-xs text-slate-500">Ketik pengeluaran atau scan struk pakai Gemini AI</p>
          </div>
        </div>
        {(selectedImage || inputText) && !isLoading && (
          <button
            onClick={handleClear}
            className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Bersihkan
          </button>
        )}
      </div>

      {/* Input Section */}
      <div className="flex flex-col gap-4">
        {/* Text Input area */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Tulis Pengeluaran atau Detail Struk
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder="Contoh: 'beli bakso sapi 18rb' atau tambahkan catatan untuk struk..."
            className="w-full min-h-[80px] p-3.5 text-sm rounded-2xl border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 focus:outline-none transition-all placeholder:text-slate-400 resize-none bg-slate-50/50"
          />
        </div>

        {/* Upload Receipt Area */}
        <div>
          <span className="block text-xs font-semibold text-slate-600 mb-1.5">
            Unggah Foto Struk Belanja
          </span>

          {!selectedImage ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all ${
                isDragging
                  ? "border-amber-500 bg-amber-50/30"
                  : "border-slate-200 hover:border-slate-300 bg-slate-50/30"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <div className="p-3 bg-slate-100 rounded-full text-slate-500">
                <Camera className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-700">Tarik gambar struk ke sini atau klik</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Mendukung file gambar PNG, JPG, JPEG</p>
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video flex items-center justify-center">
              <img
                src={selectedImage}
                alt="Uploaded Receipt"
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
              {!isLoading && (
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-3 right-3 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm"
                  title="Hapus gambar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mock Receipts Quick Selector */}
        {!selectedImage && !inputText && (
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Cobain Pakai Contoh Struk (Klik untuk Test)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {MOCK_RECEIPTS.map((mock, idx) => (
                <button
                  key={mock.id}
                  onClick={() => loadMockReceipt(idx)}
                  className="p-2.5 text-left rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/10 transition-all text-xs cursor-pointer"
                >
                  <p className="font-semibold text-slate-700 truncate">{mock.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">Otomatis isi simulasi struk</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="p-3.5 bg-red-50 rounded-2xl text-red-600 text-xs flex items-start gap-2 border border-red-100">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Gagal Mencatat</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isLoading && (
          <div className="p-5 bg-amber-50/40 rounded-2xl border border-amber-100 flex flex-col items-center justify-center text-center gap-3">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <div>
              <p className="text-sm font-bold text-slate-800">AI Sedang Bekerja...</p>
              <p className="text-xs text-amber-600 font-medium mt-1 animate-pulse">{aiStatus}</p>
            </div>
          </div>
        )}

        {/* AI Parsed Preview Card */}
        {parsedResult && !isLoading && (
          <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <Sparkles className="w-4 h-4 fill-emerald-700/20" />
              <span className="text-xs font-bold uppercase tracking-wider">Hasil Ekstraksi AI (Dapat Diedit)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Deskripsi Pengeluaran</label>
                <input
                  type="text"
                  value={parsedResult.description}
                  onChange={(e) => updateParsedField("description", e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Nominal (Rupiah)</label>
                <input
                  type="number"
                  value={parsedResult.amount}
                  onChange={(e) => updateParsedField("amount", parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500 font-mono text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Kategori</label>
                <select
                  value={parsedResult.category}
                  onChange={(e) => updateParsedField("category", e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500 font-medium text-slate-800"
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

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Tanggal & Jam Transaksi</label>
                <input
                  type="datetime-local"
                  value={parsedResult.date ? (parsedResult.date.includes("T") ? parsedResult.date : `${parsedResult.date}T12:00`) : ""}
                  onChange={(e) => updateParsedField("date", e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500 font-medium text-slate-800"
                />
              </div>

              {/* Pocket Target Selector (Crucial addition!) */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Pilih Dompet / Alokasi Pos</label>
                <select
                  value={targetWalletId}
                  onChange={(e) => setTargetWalletId(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500 font-bold text-slate-800"
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
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Metode Pembayaran</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500 font-bold text-slate-800"
                >
                  <option value="Cash">Cash (Uang Tunai)</option>
                  <option value="TF">TF (Transfer / QRIS / Bank)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2.5 mt-2">
              <button
                onClick={handleConfirmTransaction}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/10 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Simpan Catatan Pengeluaran
              </button>
              <button
                onClick={() => setParsedResult(null)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Submit Button */}
        {!parsedResult && !isLoading && (
          <button
            onClick={handleProcessAI}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 hover:gap-3 cursor-pointer shadow-sm shadow-slate-950/10"
          >
            Mulai Analisis AI <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
