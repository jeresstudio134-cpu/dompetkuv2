import { pgTable, text, doublePrecision, timestamp, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Users Table (using Firebase Auth UID as primary key)
export const users = pgTable("users", {
  uid: text("uid").primaryKey(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 2. Modules (Kategori Pos) Table
export const modules = pgTable("modules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  userId: text("user_id")
    .references(() => users.uid, { onDelete: "cascade" })
    .notNull(),
});

// 3. Wallets Table
export const wallets = pgTable("wallets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  initialCash: doublePrecision("initial_cash").default(0).notNull(),
  initialTf: doublePrecision("initial_tf").default(0).notNull(),
  module: text("module")
    .references(() => modules.id, { onDelete: "cascade" })
    .notNull(),
  userId: text("user_id")
    .references(() => users.uid, { onDelete: "cascade" })
    .notNull(),
});

// 4. Transactions Table
export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // "pemasukan" | "pengeluaran"
  amount: doublePrecision("amount").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD or YYYY-MM-DDTHH:MM
  createdAt: text("created_at").notNull(), // ISO String
  walletId: text("wallet_id")
    .references(() => wallets.id, { onDelete: "cascade" })
    .notNull(),
  method: text("method").notNull(), // "Cash" | "TF"
  userId: text("user_id")
    .references(() => users.uid, { onDelete: "cascade" })
    .notNull(),
});

// 5. Budgets Table
export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  limit: doublePrecision("limit").notNull(),
  userId: text("user_id")
    .references(() => users.uid, { onDelete: "cascade" })
    .notNull(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  modules: many(modules),
  wallets: many(wallets),
  transactions: many(transactions),
  budgets: many(budgets),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  user: one(users, {
    fields: [modules.userId],
    references: [users.uid],
  }),
  wallets: many(wallets),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.uid],
  }),
  moduleRecord: one(modules, {
    fields: [wallets.module],
    references: [modules.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.uid],
  }),
  wallet: one(wallets, {
    fields: [transactions.walletId],
    references: [wallets.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.uid],
  }),
}));
