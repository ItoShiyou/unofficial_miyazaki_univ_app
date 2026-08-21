import { PageHeader, Card } from "@/components/ui";

// 実データレビュー：奨学金実態調査（ガクシー、2023）で学生・保護者の7割が
// 「もらえる奨学金が多数ある事実を知らない」と回答、Yahoo!知恵袋にも
// 「奨学金の申込期限が過ぎた」という実際の質問が複数見つかったことを根拠に新設。
// ただし申請時期のような時期情報は年度ごとに変わり、具体的な日付を書くと
// すぐ古くなって学生を混乱させるリスクがあるため、日付は「目安」にとどめ、
// 詳細・正確な締切は必ず公式ページで確認するよう明記する設計にした。
//
// 「海外留学支援制度（協定派遣）」は、他の給付型奨学金との併給不可という
// 落とし穴に気づかず応募し後から返還・取消になる実例が確認できたため追加した
// （サイクル177）。宮崎大学独自の留学費用助成制度は見当たらなかった。
interface ScholarshipEntry {
  name: string;
  provider: string;
  description: string;
  timing: string;
  url: string;
}

const ENTRIES: ScholarshipEntry[] = [
  {
    name: "高等教育の修学支援新制度",
    provider: "国（給付奨学金＋授業料等減免）",
    description: "家計基準等の要件を満たす場合に、返済不要の給付奨学金と授業料等の減免がセットで受けられる制度です。",
    timing: "入学前（予約採用）・入学後（在学採用）のいずれも申込可。在学採用は春・秋の年2回が目安。",
    url: "https://www.mext.go.jp/kyufu/",
  },
  {
    name: "授業料免除・入学料免除・徴収猶予",
    provider: "宮崎大学",
    description: "家計急変・経済的困窮等の事由により、授業料・入学料の免除や納付の猶予を申請できる制度です。",
    timing: "前期分・後期分で申請期間が分かれており、年度ごとに募集ページが更新されます（例年、前期は4月頃、後期は10月頃が目安）。",
    url: "https://www.miyazaki-u.ac.jp/manabi-jim/campus-life-info/scholarship/",
  },
  {
    name: "「夢と希望の道標」奨学金",
    provider: "宮崎大学独自",
    description: "2年次以上で成績優秀な学生を対象とした、宮崎大学独自の給付型奨学金です。",
    timing: "年度ごとに募集時期が案内されます。詳細は大学公式サイトでご確認ください。",
    url: "https://www.miyazaki-u.ac.jp/manabi-jim/campus-life-info/scholarship/",
  },
  {
    name: "日本学生支援機構（JASSO）奨学金",
    provider: "JASSO（貸与・給付）",
    description: "貸与型・給付型の奨学金です。高校在学中に申し込む「予約採用」と、入学後に大学経由で申し込む「在学採用」があります。",
    timing: "予約採用は高校在学中、在学採用は春・秋の年2回程度の募集が目安。申込期限を過ぎた場合の相談先もJASSOのFAQに案内があります。",
    url: "https://www.jasso.go.jp/shogakukin/",
  },
  {
    name: "海外留学支援制度（協定派遣）",
    provider: "JASSO（給付・交換留学向け）",
    description:
      "大学間協定に基づく交換留学の学部生向け給付奨学金です。応募は在籍大学（国際連携センター）経由。他の給付型奨学金とは併給できない場合があるため、必ず国際連携センターに確認してください。",
    timing: "留学時期に合わせて募集されるため、渡航予定の1年ほど前から国際連携センターへの相談を目安にしてください。",
    url: "https://www.miyazaki-u.ac.jp/kokusai/study/scholarships.html",
  },
];

export default function ScholarshipsPage() {
  return (
    <main className="flex-1 flex flex-col px-4 pb-8">
      <PageHeader title="奨学金・学費支援制度" />
      <p className="text-sm text-gray-500 px-0.5 pb-4">
        経済的な理由で学業を諦めることがないよう、実在が確認できた奨学金・学費支援制度をまとめました。時期はあくまで目安です。正確な申請期間・要件は必ず公式ページでご確認ください。
      </p>

      <div className="space-y-3">
        {ENTRIES.map((e) => (
          <Card key={e.name}>
            <span className="inline-block text-[11px] font-medium text-blue-700 bg-blue-50 rounded-full px-2 py-0.5 mb-1">
              {e.provider}
            </span>
            <h3 className="text-sm font-bold">{e.name}</h3>
            <p className="text-xs text-gray-600 mt-1.5">{e.description}</p>
            <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 mt-2">
              申請時期の目安：{e.timing}
            </p>
            <a
              href={e.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-blue-600 mt-2"
            >
              公式ページで詳細・正確な締切を確認する →
            </a>
          </Card>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center leading-relaxed mt-6 pt-4 border-t border-gray-100">
        本ページは既存の公的制度を紹介するものであり、宮崎大学・国・JASSOとは関係のない非公式の案内です。申請の可否・締切は必ずご自身で公式ページをご確認ください。
      </p>
    </main>
  );
}
