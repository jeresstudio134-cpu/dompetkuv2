import { getDb } from "./index.js";
import { users, modules, wallets, transactions, budgets } from "./schema.js";
import { eq, and, notInArray, inArray } from "drizzle-orm";

// Query Layer Helper: Sync & User Registration
export async function getOrCreateUser(
  uid: string,
  email: string
) {
  try {
    const db = getDb();

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid));

    if (existing.length) {
      return existing[0];
    }

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error(error);
    return { uid, email };
  }
}

// Fetch all database records for a specific user
export async function getUserData(uid: string) {
  try {
    const db = getDb();

    return {
      modules: await db.select().from(modules).where(eq(modules.userId, uid)),
      wallets: await db.select().from(wallets).where(eq(wallets.userId, uid)),
      transactions: await db.select().from(transactions).where(eq(transactions.userId, uid)),
      budgets: await db.select().from(budgets).where(eq(budgets.userId, uid)),
    };
  } catch (error) {
    console.error(error);

    return {
      modules: [],
      wallets: [],
      transactions: [],
      budgets: [],
    };
  }
}

// Save all user data in a single transactional batch (upsert)
export async function saveUserData(
  uid: string,
  data: {
    modules: any[];
    wallets: any[];
    transactions: any[];
    budgets: any[];
  }
)  
{
  try {
    const db = getDb();
    
    // First, prune deleted items to ensure deletions propagate to Postgres
    // 1. Prune Deleted Transactions
    if (data.transactions !== undefined && data.transactions !== null) {
      const payloadTxIds = data.transactions.map((t) => t.id) || [];
      if (payloadTxIds.length > 0) {
        await db.delete(transactions).where(
          and(eq(transactions.userId, uid), notInArray(transactions.id, payloadTxIds))
        );
      } else {
        await db.delete(transactions).where(eq(transactions.userId, uid));
      }
    }

    // 2. Prune Deleted Wallets
    if (data.wallets !== undefined && data.wallets !== null) {
      const payloadWalletIds = data.wallets.map((w) => w.id) || [];
      if (payloadWalletIds.length > 0) {
        await db.delete(wallets).where(
          and(eq(wallets.userId, uid), notInArray(wallets.id, payloadWalletIds))
        );
      } else {
        await db.delete(wallets).where(eq(wallets.userId, uid));
      }
    }

    // 3. Prune Deleted Modules
    if (data.modules !== undefined && data.modules !== null) {
      const payloadModuleIds = data.modules.map((m) => m.id) || [];
      if (payloadModuleIds.length > 0) {
        await db.delete(modules).where(
          and(eq(modules.userId, uid), notInArray(modules.id, payloadModuleIds))
        );
      } else {
        await db.delete(modules).where(eq(modules.userId, uid));
      }
    }

    // 1. Sync Modules
    if (data.modules && data.modules.length > 0) {
      for (const m of data.modules) {
        await db
          .insert(modules)
          .values({
            id: m.id,
            name: m.name,
            icon: m.icon,
            userId: uid,
          })
          .onConflictDoUpdate({
            target: modules.id,
            set: {
              name: m.name,
              icon: m.icon,
            },
          });
      }
    }

    // 2. Sync Wallets
    if (data.wallets && data.wallets.length > 0) {
      for (const w of data.wallets) {
        await db
          .insert(wallets)
          .values({
            id: w.id,
            name: w.name,
            initialCash: Number(w.initialCash) || 0,
            initialTf: Number(w.initialTf) || 0,
            module: w.module,
            userId: uid,
          })
          .onConflictDoUpdate({
            target: wallets.id,
            set: {
              name: w.name,
              initialCash: Number(w.initialCash) || 0,
              initialTf: Number(w.initialTf) || 0,
              module: w.module,
            },
          });
      }
    }

    // 3. Sync Transactions
    if (data.transactions && data.transactions.length > 0) {
      for (const t of data.transactions) {
        await db
          .insert(transactions)
          .values({
            id: t.id,
            type: t.type,
            amount: Number(t.amount) || 0,
            category: t.category,
            description: t.description,
            date: t.date,
            createdAt: t.createdAt,
            walletId: t.walletId,
            method: t.method,
            userId: uid,
          })
          .onConflictDoUpdate({
            target: transactions.id,
            set: {
              type: t.type,
              amount: Number(t.amount) || 0,
              category: t.category,
              description: t.description,
              date: t.date,
              createdAt: t.createdAt,
              walletId: t.walletId,
              method: t.method,
            },
          });
      }
    }

    // 4. Sync Budgets
    await db.delete(budgets).where(eq(budgets.userId, uid));
    if (data.budgets && data.budgets.length > 0) {
      for (const b of data.budgets) {
        await db.insert(budgets).values({
          category: b.category,
          limit: Number(b.limit) || 0,
          userId: uid,
        });
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("[Dompetku DB] Postgres saveUserData failed:", error);
    return { success: false, error: error?.message || "Postgres sync failed" };
  }
}

// Single delete helpers to avoid sending full sets all the time
export async function deleteWalletFromDb(
  walletId: string,
  uid: string
) {
  try {
    const db = getDb();

    await db
      .delete(transactions)
      .where(
        and(
          eq(transactions.walletId, walletId),
          eq(transactions.userId, uid)
        )
      );

    await db
      .delete(wallets)
      .where(
        and(
          eq(wallets.id, walletId),
          eq(wallets.userId, uid)
        )
      );

  } catch (error) {
    console.error(error);
  }
}

export async function deleteTransactionFromDb(
  txId: string,
  uid: string
) {
  try {
    const db = getDb();

    await db
      .delete(transactions)
      .where(
        and(
          eq(transactions.id, txId),
          eq(transactions.userId, uid)
        )
      );

  } catch (error) {
    console.error(error);
  }
}

export async function deleteModuleFromDb(
  moduleId: string,
  uid: string
) {
  try {
    const db = getDb();

    const moduleWallets = await db
      .select()
      .from(wallets)
      .where(
        and(
          eq(wallets.module, moduleId),
          eq(wallets.userId, uid)
        )
      );

    const walletIds = moduleWallets.map(w => w.id);

    if (walletIds.length > 0) {
      await db
        .delete(transactions)
        .where(
          and(
            eq(transactions.userId, uid),
            inArray(transactions.walletId, walletIds)
          )
        );

      await db
        .delete(wallets)
        .where(
          and(
            eq(wallets.userId, uid),
            inArray(wallets.id, walletIds)
          )
        );
    }

    await db
      .delete(modules)
      .where(
        and(
          eq(modules.id, moduleId),
          eq(modules.userId, uid)
        )
      );

  } catch (error) {
    console.error(error);
  }
}
