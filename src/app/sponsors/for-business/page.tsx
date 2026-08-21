import { PageHeader, Card } from "@/components/ui";

// 現状、協賛にご興味を持った企業・店舗様への説明は、協賛ページ最下部の
// 「開発者までご連絡ください」という一文のみで、掲載内容・効果測定・費用感が
// 事前に伝わらない状態だった。docs/pivot_story.md（5節）で整理済みの、
// 「学生には広告ではなく地元とのつながりとして提示する」「初年度は大きな
// 収益規模には達しない前提で、身の丈に合った持続可能性として提示する」という
// 誠実な方針をそのまま踏襲し、金額を断定しない・大げさな効果を謳わないことを
// 徹底した、企業向けの説明ページを新設する。連絡先は既存ページと同様
// 「開発者までご連絡ください」にとどめ、実在しない問い合わせフォーム等は作らない。
export default function SponsorsForBusinessPage() {
  return (
    <main className="flex-1 flex flex-col px-4 pb-8">
      <PageHeader title="宮崎県内の企業・店舗の皆様へ" />
      <p className="text-sm text-gray-500 px-0.5 pb-4">
        「宮大非公式アプリ」は、宮崎大学の学生が時間割・授業カルテ・求人情報などを確認するために日常的に開くアプリです。協賛枠は、この学生の日常利用の中に「地元とのつながり」として自然に表示されます。
      </p>

      <Card>
        <h3 className="text-sm font-bold mb-1.5">掲載できる内容</h3>
        <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
          <li>店舗・企業名、カテゴリ、一言紹介、学生向け特典（例：学生証提示で割引）</li>
          <li>公式サイト・SNSへのリンク、エリア（例：木花、橘通り）</li>
          <li>任意でクーポンコードの掲載</li>
          <li>任意でイベント告知（新歓イベント・学割イベント等）と、来場後の申込者アンケート</li>
        </ul>
      </Card>

      <Card className="mt-3">
        <h3 className="text-sm font-bold mb-1.5">効果の見え方について（正直な説明）</h3>
        <p className="text-xs text-gray-600">
          表示回数・クリック数もお伝えできますが、この規模のアプリではクリック率そのものは一般的に低くなる指標のため、効果測定の中心としては使っていません。それよりも、学生がクーポンコードを開封した回数（＝「地元スタンプ帳」に記録される、実際の来店意図に近い行動）や、イベントへの来場チェックイン数・満足度アンケートの結果など、実際の接点に近い数値を中心にお伝えする方針です。
        </p>
      </Card>

      <Card className="mt-3">
        <h3 className="text-sm font-bold mb-1.5">費用について</h3>
        <p className="text-xs text-gray-600">
          現在は、学生に一切の費用負担をかけずにこのアプリを続けるための取り組みの一環として、掲載費用をいただかずにご協力いただいています。詳細は下記の連絡先までご相談ください。
        </p>
      </Card>

      <Card className="mt-3 border-amber-200 bg-amber-50/40">
        <h3 className="text-sm font-bold mb-1.5">お申し込み・ご相談</h3>
        <p className="text-xs text-gray-600">
          宮崎県内で学生向けの情報発信・協賛にご興味のある企業様・店舗様は、開発者までご連絡ください。学生に負担のない形で、地域と学生をつなげます。
        </p>
      </Card>

      <p className="text-xs text-gray-400 text-center leading-relaxed mt-6 pt-4 border-t border-gray-100">
        本ページは宮崎大学の非公式アプリによる案内であり、宮崎大学が協賛内容を保証・審査するものではありません。
      </p>
    </main>
  );
}
