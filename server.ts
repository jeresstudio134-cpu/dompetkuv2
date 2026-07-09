import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { requireAuth, AuthRequest } from "./src/middleware/auth.js";

import {
  getOrCreateUser,
  getUserData,
  saveUserData,
  deleteWalletFromDb,
  deleteTransactionFromDb,
  deleteModuleFromDb,
} from "./src/db/queries.js";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for receipt images
app.use(express.json({ limit: "10mb" }));


// Initialize Gemini AI
let ai: GoogleGenAI | null = null;
let lastApiKey: string | undefined = undefined;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : undefined;
  
  if (!ai || lastApiKey !== apiKey) {
    lastApiKey = apiKey;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set. AI features may fail.");
    }
    
    console.log("[Dompetku Server] Initializing GoogleGenAI client with standard API Key.");
    ai = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return ai;
}

// Helper to extract Cloudflare Workers environment variables or fallback to process.env
function getRequestEnv(req: any): { DATABASE_URL: string } {
  if (req.env) return req.env;
  if (req.context && req.context.env) return req.context.env;
  return {
    DATABASE_URL: process.env.DATABASE_URL || "",
  };
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Sync GET endpoint
app.get("/api/sync", requireAuth, async (req: AuthRequest, res) => {
  try {
    const env = getRequestEnv(req);
    const uid = req.user!.uid;
    const email = req.user!.email || "user@example.com";

    // Ensure user is created in database
    await getOrCreateUser(uid, email);

    const data = await getUserData(uid);
    res.json(data);
  } catch (error: any) {
    console.error("GET /api/sync error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Sync POST endpoint
app.post("/api/sync", requireAuth, async (req: AuthRequest, res) => {
  try {
    const env = getRequestEnv(req);
    const uid = req.user!.uid;
    const email = req.user!.email || "user@example.com";

    // Ensure user is created in database
    await getOrCreateUser(uid, email);

    const { modules: userModules, wallets: userWallets, transactions: userTransactions, budgets: userBudgets } = req.body;

    const syncResult = await saveUserData(uid, {
      modules: userModules,
      wallets: userWallets,
      transactions: userTransactions,
      budgets: userBudgets,
    });

    if (!syncResult.success) {
      return res.status(500).json({ success: false, error: syncResult.error || "Gagal sinkronisasi data" });
    }

    res.json({ success: true, message: "Data synchronized to Cloud" });
  } catch (error: any) {
    console.error("POST /api/sync error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete specific wallet
app.delete("/api/sync/wallet/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const env = getRequestEnv(req);
    const uid = req.user!.uid;
    const walletId = req.params.id;
    await deleteWalletFromDb(walletId, uid);
    res.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/sync/wallet error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete specific transaction
app.delete("/api/sync/transaction/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const env = getRequestEnv(req);
    const uid = req.user!.uid;
    const txId = req.params.id;
    await deleteTransactionFromDb(txId, uid);
    res.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/sync/transaction error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete specific module (kategori pos)
app.delete("/api/sync/module/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const env = getRequestEnv(req);
    const uid = req.user!.uid;
    const moduleId = req.params.id;
    await deleteModuleFromDb(moduleId, uid);
    res.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/sync/module error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Automatic Expense Parser Endpoint using Gemini 3.5 Flash
app.post("/api/parse-expense", async (req, res) => {
  try {
    const { text, image, mimeType, currentDate } = req.body;
    
    if (!text && !image) {
      return res.status(400).json({ error: "Mohon sediakan teks atau gambar struk belanja." });
    }

    const client = getGeminiClient();
    const systemPrompt = `Anda adalah asisten keuangan pintar "Dompetku".
Tugas Anda adalah mengekstrak detail pengeluaran belanja dari teks deskripsi atau gambar struk belanja yang diberikan oleh pengguna.
Sediakan data dalam bentuk objek terstruktur sesuai schema JSON.
Kategori transaksi HARUS dipilih dari daftar berikut:
- 'Makanan & Minuman' (untuk makanan, kopi, restoran, warung, jajanan, bahan makanan)
- 'Transportasi' (untuk ojek online, bensin, parkir, tiket kereta/pesawat, tol)
- 'Tagihan & Pulsa' (untuk listrik, wifi, internet, air, pulsa hp, langganan aplikasi)
- 'Belanja' (untuk pakaian, kosmetik, elektronik, kebutuhan bulanan rumah tangga, perlengkapan)
- 'Hiburan' (untuk nonton bioskop, game, rekreasi, staycation)
- 'Kesehatan' (untuk obat, rumah sakit, dokter, suplemen, masker)
- 'Edukasi' (untuk buku, kursus, sekolah, seminar)
- 'Lainnya' (jika tidak cocok dengan kategori manapun)

Jika deskripsi menggunakan istilah bahasa gaul atau singkatan seperti 'rb' (ribu), 'rebu', 'k' (misal 15k = 15000), konversikan menjadi angka nominal yang valid dalam mata uang Rupiah (IDR).
Ektrak nama barang atau kegiatan yang dibeli sebagai 'description'.`;

    let contents: any;

    if (image) {
      let cleanBase64 = image;
      let resolvedMimeType = mimeType || "image/jpeg";

      if (image.startsWith("http://") || image.startsWith("https://")) {
        try {
          console.log(`[Dompetku AI] Fetching image from URL: ${image}`);
          const imgResponse = await fetch(image);
          if (!imgResponse.ok) {
            throw new Error(`Failed to fetch image: ${imgResponse.statusText}`);
          }
          const arrayBuffer = await imgResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          cleanBase64 = buffer.toString("base64");
          
          const contentType = imgResponse.headers.get("content-type");
          if (contentType) {
            resolvedMimeType = contentType;
          }
        } catch (err: any) {
          console.error("[Dompetku AI] Failed to fetch image URL:", err);
          return res.status(400).json({ 
            error: "Gagal memproses gambar contoh.",
            details: `Gagal mengunduh gambar dari URL eksternal: ${err.message || err}`
          });
        }
      } else {
        // Clean up base64 prefix if present
        cleanBase64 = image.replace(/^data:image\/[a-z]+;base64,/, "");
      }

      contents = {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: resolvedMimeType,
            },
          },
          {
            text: `Konteks tanggal hari ini: ${currentDate || new Date().toISOString().split("T")[0]}.
Harap analisis gambar struk/nota belanja ini dan ekstrak pengeluarannya. 
Catatan tambahan dari pengguna: "${text || ""}"`,
          },
        ],
      };
    } else {
      // Text-only request
      contents = `Konteks tanggal hari ini: ${currentDate || new Date().toISOString().split("T")[0]}.
Ekstrak pengeluaran dari teks berikut: "${text}"`;
    }

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: {
              type: Type.NUMBER,
              description: "Total nominal pengeluaran dalam Rupiah (IDR). Contoh: 15000, 325000. Harus berupa angka murni.",
            },
            category: {
              type: Type.STRING,
              description: "Kategori pengeluaran. Harus persis salah satu dari: 'Makanan & Minuman', 'Transportasi', 'Tagihan & Pulsa', 'Belanja', 'Hiburan', 'Kesehatan', 'Edukasi', 'Lainnya'.",
            },
            description: {
              type: Type.STRING,
              description: "Deskripsi singkat yang jelas dan rapi mengenai barang/jasa yang dibeli (misal: 'Beli Bakso & Es Teh', 'Bensin Shell', 'Token Listrik PLN'). Maksimal 4 kata.",
            },
            date: {
              type: Type.STRING,
              description: "Tanggal transaksi dalam format YYYY-MM-DD. Jika struk atau pengguna tidak menyebutkan tanggal spesifik, gunakan tanggal konteks hari ini.",
            },
          },
          required: ["amount", "category", "description", "date"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Gagal menerima respons teks dari model AI.");
    }

    const parsedData = JSON.parse(resultText.trim());
    return res.json(parsedData);
  } catch (error: any) {
    console.error("Gemini Parsing Error:", error);
    const errorMsg = error.message || (typeof error === "string" ? error : JSON.stringify(error));
    
    const isAuthError = error.status === 401 || 
                        errorMsg.includes("UNAUTHENTICATED") || 
                        errorMsg.includes("authentication credentials") || 
                        errorMsg.includes("API_KEY_INVALID") || 
                        errorMsg.includes("API_KEY_SERVICE_BLOCKED") || 
                        errorMsg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED");
    
    let friendlyDetails = errorMsg;
    if (isAuthError) {
      if (errorMsg.includes("API_KEY_SERVICE_BLOCKED") || errorMsg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED")) {
        friendlyDetails = "API_KEY_SERVICE_BLOCKED: Kunci API Anda dibatasi oleh Google Cloud. Harap pastikan bahwa 'Generative Language API' diaktifkan dan diizinkan dalam pembatasan API (API restrictions) untuk Kunci API Anda di Google Cloud Console -> APIs & Services -> Credentials. Atau, buatlah Kunci API baru yang tidak dibatasi di Google AI Studio.";
      } else {
        friendlyDetails = "Kunci API Gemini tidak valid, tidak diotorisasi, atau tidak disetel dengan benar. Harap periksa GEMINI_API_KEY Anda di panel 'Settings > Secrets' (ikon roda gigi di pojok kanan atas layar) dan pastikan kuncinya benar.";
      }
    }

    return res.status(isAuthError ? 401 : 500).json({
      error: "Gagal memproses pencatatan otomatis menggunakan AI.",
      details: friendlyDetails,
    });
  }
});

async function startServer() {
  // Hanya jalankan Vite middleware di dev lokal (bukan di production, dan bukan di Vercel)
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    console.log("[Dompetku Server] Setting up Vite middleware for local development...");
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error("[Dompetku Server] Failed to initialize Vite middleware:", err);
    }
  } else if (!process.env.VERCEL) {
    // Static serving manual hanya dipakai jika BUKAN di Vercel (misal di VPS/cPanel mandiri)
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Jangan panggil app.listen() jika berjalan di lingkungan serverless Vercel
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[Dompetku Server] Server is running on http://localhost:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

// Ekspor app untuk Vercel
export default app;