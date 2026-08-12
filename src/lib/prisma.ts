import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaWalReady: boolean | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// SQLiteをWALモードにし、読み取りと書き込み(全件同期など)が
// 互いをブロックしにくくする。DBファイルが新規作成された環境でも
// 初回接続時に自動で有効化される。
if (!globalForPrisma.prismaWalReady) {
  globalForPrisma.prismaWalReady = true;
  prisma
    .$queryRawUnsafe("PRAGMA journal_mode=WAL;")
    .then(() => prisma.$queryRawUnsafe("PRAGMA busy_timeout=5000;"))
    .catch(() => {
      // SQLite以外のDBに切り替えた場合はPRAGMAが失敗するので黙って無視する
    });
}
