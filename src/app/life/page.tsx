import Link from "next/link";
import { PageHeader, Card } from "@/components/ui";

// UI/UX見直し：下部タブの再編成（ユーザー要望）に伴い新設したハブページ。
// 「お金の記録」「奨学金・学費支援制度」「教科書の譲渡・売買」は元々マイページの
// カードとしてのみ開けたが、機能ごとにタブを明確に分けたいという要望を受け、
// これら生活費関連の機能を「くらし」として1つのタブにまとめた。
export default function LifePage() {
  return (
    <main className="flex-1 pb-6">
      <PageHeader title="くらし" />
      <p className="px-4 text-sm text-gray-400 -mt-1 mb-4">
        お金・奨学金・教科書など、日々の生活に関わる機能をまとめています。
      </p>

      <div className="px-4 space-y-4">
        <Card>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">お金の記録</span>
            <Link href="/expenses" className="text-xs text-blue-600">
              開く →
            </Link>
          </div>
          <p className="text-xs text-gray-400">
            バイト代・仕送りと支出をこの端末内だけに記録し、月ごとの収支を確認できます。
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">奨学金・学費支援制度</span>
            <Link href="/scholarships" className="text-xs text-blue-600">
              開く →
            </Link>
          </div>
          <p className="text-xs text-gray-400">
            国・宮崎大学・JASSOの奨学金や授業料免除等の制度をまとめて確認できます。
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">教科書の譲渡・売買</span>
            <Link href="/textbooks" className="text-xs text-blue-600">
              開く →
            </Link>
          </div>
          <p className="text-xs text-gray-400">
            同じ大学の学生同士で、使い終わった教科書を譲り合えます。
          </p>
        </Card>
      </div>
    </main>
  );
}
