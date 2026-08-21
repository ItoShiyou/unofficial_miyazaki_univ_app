"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useCurrentSemester } from "@/lib/useSemester";
import { useAccount } from "@/lib/useAccount";
import { universitySupportsSyllabusSync } from "@/lib/universities";
import { PageHeader, Card } from "@/components/ui";

// 新入生の入学直後の体験を、既存機能を束ねたチェックリストとして案内する。
// 実データレビュー（docs/pivot_story.md）で、この機能自体は実データによる
// 需要検証を経ずに実装されたこと、内容も宮崎大学固有ではなく汎用的な
// アプリ内リンク集にとどまることが判明したため、「競合には無い差別化導線」
// という当初のコメントは誇張であり撤回する。
interface Step {
  key: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  done: boolean;
}

export default function OnboardingPage() {
  const account = useAccount();
  const semester = useCurrentSemester();
  const [isStandalone] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(display-mode: standalone)").matches
  );
  const [friendCount, setFriendCount] = useState<number | null>(null);

  const courses =
    useLiveQuery(
      () =>
        db.courses.where("[year+semester]").equals([semester.year, semester.semester]).toArray(),
      [semester.year, semester.semester]
    ) ?? [];

  useEffect(() => {
    if (!account) return;
    let ignore = false;
    fetch("/api/friends")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!ignore) setFriendCount(d?.friends?.length ?? 0);
      })
      .catch(() => {
        if (!ignore) setFriendCount(null);
      });
    return () => {
      ignore = true;
    };
  }, [account]);

  if (!account) return null;

  const syllabusSupported = universitySupportsSyllabusSync(account.university);

  const steps: Step[] = [
    {
      key: "install",
      title: "ホーム画面に追加する",
      description: "毎回ブラウザで検索しなくて済むように、アプリとしてホーム画面に置いておきましょう。",
      href: "/install",
      linkLabel: "追加方法を見る",
      done: isStandalone,
    },
    {
      key: "timetable",
      title: "時間割を登録する",
      description: syllabusSupported
        ? "シラバスから検索して登録すると、授業カルテや変更通知とも自動でつながります。"
        : "この大学はまだシラバス自動連携に対応していないため、手動で登録してください。",
      href: "/timetable",
      linkLabel: "時間割ページを開く",
      done: courses.length > 0,
    },
    {
      key: "karte",
      title: "先輩の授業カルテを覗いてみる",
      description: "出席の厳しさ・課題量など、シラバスには載らない一次情報を確認できます。",
      href: "/karte",
      linkLabel: "授業カルテを見る",
      done: courses.some((c) => !!c.syllabusCourseId),
    },
    {
      key: "sponsors",
      title: "地元とつながる特典をチェックする",
      description: "宮崎県内の協賛店舗・企業の学生特典を確認できます。",
      href: "/sponsors",
      linkLabel: "協賛企業一覧を見る",
      done: false,
    },
    {
      key: "friends",
      title: "友達を招待する",
      description: "招待コードでつながると、空きコマが同じ友達を見つけやすくなります。",
      href: "/friends",
      linkLabel: "友達ページを開く",
      done: (friendCount ?? 0) > 0,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <main className="flex-1 pb-8">
      <PageHeader title="はじめの2週間ガイド" />
      <p className="px-4 text-sm text-gray-400 -mt-1 mb-4">
        入学・進級直後にやっておくと後で楽になることをまとめました（{doneCount}/{steps.length}完了）。
      </p>

      <div className="px-4 mb-5">
        <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="px-4 space-y-3">
        {steps.map((s, i) => (
          <Card key={s.key} className={s.done ? "opacity-60" : ""}>
            <div className="flex items-start gap-3">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 mt-0.5 ${
                  s.done ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                {s.done ? "✓" : i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
                {!s.done && (
                  <Link href={s.href} className="inline-block text-xs text-blue-600 mt-2">
                    {s.linkLabel} →
                  </Link>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {doneCount === steps.length && (
        <p className="px-4 mt-6 text-sm text-emerald-600 text-center">
          お疲れさまでした。あとはいつも通り使うだけです。
        </p>
      )}

      {/* 軽量化レビュー：サイクル131〜139で1件ずつ積み上げたチェックリスト外の
          静的情報カードが4枚になり、チェックリストとの境界が分かりにくくなって
          いたため、見出しを追加して「やることリスト」と「知っておきたい情報」を
          視覚的に区別した（表示内容・機能は変更していない）。 */}
      <p className="px-4 mt-6 text-xs font-medium text-gray-400">知っておきたい情報</p>

      {/* 実データレビュー：日本経済新聞・複数大学の公式ページで新歓期の悪質勧誘
          （サークルを装う宗教・マルチ商法・闇バイト等）が繰り返し注意喚起されて
          いる実在の課題と確認できた。独自にサークル一覧を作ると真正性の検証が
          困難（法人格の無い自称団体で、求人掲示板の企業確認より格段にリスクが
          高い）なため、大学公式の注意喚起ページへの導線を追加する軽量な対応に
          とどめた。 */}
      <div className="px-4 mt-2">
        <Card className="border-amber-200 bg-amber-50/50">
          <p className="text-xs font-medium text-amber-800 mb-1">新歓期の勧誘にご注意ください</p>
          <p className="text-xs text-gray-600 leading-relaxed">
            サークルを装った勧誘の中には、大学非公認の団体や宗教・マルチ商法等が紛れていることがあります。個人情報を安易に渡さず、少しでも怪しいと感じたら大学の窓口にご相談ください。
          </p>
          <a
            href="https://www.miyazaki-u.ac.jp/manabi-jim/campus-life-info/club-activities/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-blue-600 mt-2"
          >
            宮崎大学公式の案内を見る →
          </a>
        </Card>
      </div>

      {/* 実データレビュー：全国大学生協連の調査で睡眠・メンタルヘルスの明確な順位
          データは確認できなかったが（正直に記録）、宮崎大学安全衛生保健センターの
          相談室は実在し、知恵袋にも「相談室がどんな感じか分からず相談できない」
          という心理的ハードルの実例があった。医療・メンタルヘルス領域は誤情報の
          リスクが特に高いため、独自のアドバイス生成は行わず、実在する公式窓口の
          連絡先をそのまま転記するにとどめた。
          留年・休学についても知恵袋に「留年を親に言えない」等の実例があったが、
          学部・入学年度で規程が異なり誤情報が進路に直結するリスクがあるため、
          独自の判定・シミュレーションは一切行わず、公式FAQへの導線を一言追加する
          だけの軽微な拡張にとどめた（新規カードとしての独立実装は見送った）。
          障害学生支援についても、既存カードが対人関係・進路・休学のみで障害配慮に
          触れておらず抜け漏れだったため、実在する「障がい学生支援室」への導線を
          追加した。妊娠・出産・育児と学業の両立は、宮崎大学固有の制度・実例が
          確認できず対象学生数も極めて少ないと推定されるため見送った。 */}
      <div className="px-4 mt-3">
        <Card className="border-blue-200 bg-blue-50/50">
          <p className="text-xs font-medium text-blue-800 mb-1">困ったときの相談窓口</p>
          <p className="text-xs text-gray-600 leading-relaxed">
            対人関係・進路の悩み・不安・睡眠の問題、休学・留年等の手続き相談まで、一人で抱え込まずに相談できる窓口が大学にあります。学生は無料で利用できます。
          </p>
          <p className="text-xs text-gray-600 mt-2">
            宮崎大学 安全衛生保健センター「なやみとこころの相談室」
            <br />
            木花キャンパス：0985-58-3423　清武キャンパス：0985-85-2392
          </p>
          <div className="flex flex-col gap-1 mt-2">
            <a
              href="https://www.miyazaki-u.ac.jp/anzen/about/guide/consultation/mental/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600"
            >
              宮崎大学公式の案内を見る →
            </a>
            <a
              href="https://www.miyazaki-u.ac.jp/manabi-jim/educational-info/faq/change-of-status/takeoff-school.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600"
            >
              休学・復学・退学の手続き（公式FAQ） →
            </a>
            <a
              href="https://www.miyazaki-u.ac.jp/accessibility/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600"
            >
              障がい学生支援室（修学上の配慮・支援） →
            </a>
          </div>
        </Card>
      </div>

      {/* 実データレビュー：知恵袋に「宮崎大学は交通の便が非常に悪い」という
          実質問があり、原付・車通学が主流という実体験も複数確認できた。ただし
          学生は既に代替手段で適応済みで深刻な未解決課題とまでは言えないため、
          リアルタイム運行情報等は作り込まず、外部リンク中心の軽量な情報提供に
          とどめた（宮崎交通は運行情報APIを公開していないため、遅延情報の
          スクレイピングによる自前実装は保守コスト・規約リスクの観点で避けた）。
          学割証・学生定期については、証明書自動発行機（IC学生証利用）や宮崎交通
          の学生向け6ヶ月定期「CAM・PASS mini」等の公式手段が既に整備されており、
          本アプリが代替・仲介する必要はないと判断し、リンクの追記のみとした。 */}
      <div className="px-4 mt-3">
        <Card>
          <p className="text-xs font-medium mb-1">通学・アクセス情報</p>
          <p className="text-xs text-gray-600 leading-relaxed">
            宮崎大学は木花・清武の2キャンパス制で、バス便は多くありません。原付・自転車・自動車での通学が主流です。木花⇔清武間の移動は乗り継ぎが必要な場合が多いため、時間に余裕を持って計画してください。学割証・通学証明書は学内の証明書自動発行機（IC学生証利用）で発行できます。
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            <a
              href="https://www.miyazaki-u.ac.jp/access/kibana/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600"
            >
              木花キャンパスへのアクセス →
            </a>
            <a
              href="https://www.miyazaki-u.ac.jp/access/kiyotake/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600"
            >
              清武キャンパスへのアクセス →
            </a>
            <a
              href="https://www.miyazaki-u.ac.jp/manabi-jim/campus-life-info/commute/content-1.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600"
            >
              学割証・通学証明書の発行案内 →
            </a>
            <a
              href="https://www.miyakoh.co.jp/rosen/ticket/campass-mini.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600"
            >
              宮崎交通の学生定期「CAM・PASS mini」 →
            </a>
          </div>
        </Card>
      </div>

      {/* 実データレビュー：知恵袋に「サークルに入ったら想像と違い後悔した」等の実例が
          複数見つかったが、宮崎大学公式のサークル一覧ページに加え、ガクサー・UniBase等の
          民間サービスが既に宮崎大学専用のサークル紹介ページを運営しており、「探す・一覧を
          見る」段階の情報ギャップはほぼ埋まっていると判断した。活動実態（雰囲気・上下関係等）
          という主観的情報まで本アプリが独自データベース化するのは、真正性検証が困難な自称
          団体を扱うリスクが高いため見送り、外部の公式・既存サービスへの導線提供にとどめた。 */}
      <div className="px-4 mt-3">
        <Card>
          <p className="text-xs font-medium mb-1">サークル・部活動を探す</p>
          <p className="text-xs text-gray-600 leading-relaxed">
            入ってみないと分からない雰囲気もありますが、まずは一覧で探してみましょう。
          </p>
          <div className="flex flex-col gap-1 mt-2">
            <a
              href="https://www.miyazaki-u.ac.jp/manabi-jim/campus-life-info/club-activities/club.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600"
            >
              宮崎大学公式サークル一覧 →
            </a>
            <a
              href="https://gakucir.com/search/?university=674"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600"
            >
              ガクサー（宮崎大学のサークル紹介） →
            </a>
          </div>
        </Card>
      </div>
    </main>
  );
}
