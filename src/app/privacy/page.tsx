import { PageHeader, Card } from "@/components/ui";

export const metadata = {
  title: "プライバシーポリシー | 宮大非公式アプリ",
};

export default function PrivacyPage() {
  return (
    <main className="flex-1 flex flex-col px-4 pb-8">
      <PageHeader title="プライバシーポリシー" />
      <p className="text-sm text-gray-500 px-0.5 pb-4">
        宮大非公式アプリ（以下「本アプリ」）は、大学・大学当局とは一切関係のない、学生有志による個人開発のアプリです。本ページでは、本アプリが取得・利用する情報について説明します。
      </p>

      <div className="space-y-3">
        <Card>
          <h2 className="text-sm font-bold mb-1.5">1. 取得する情報と利用目的</h2>
          <ul className="text-xs text-gray-600 space-y-2 list-disc pl-4">
            <li>
              <strong>アカウント情報</strong>：メールアドレス（ログインID）、パスワード（暗号化して保存）、所属大学、表示名。ログイン機能・本人確認のために利用します。学籍番号や大学配布のパスワードは取り扱いません。
            </li>
            <li>
              <strong>授業カルテ（授業の口コミ）</strong>：投稿内容は特定の利用者と紐付けずに保存する匿名投稿です。ただし、不適切な投稿への通報が集まった場合、運営が内容を確認のうえ非表示・削除を判断することがあります。
            </li>
            <li>
              <strong>シラバス変更の通知登録</strong>：「この授業の変更を通知してほしい」という登録をした場合、対象の授業IDのみをサーバーに保存します。時間割そのもの（曜日・時限・メモ等）は送信・保存しません。
            </li>
            <li>
              <strong>友達機能・時間割の共有</strong>：招待コードで友達と接続した場合に限り、曜日・時限・科目名のみを含む簡易な時間割データをサーバーに保存し、接続した友達にのみ表示します。友達機能を使わない場合、時間割データはお使いの端末内（ブラウザのローカル保存）にのみ保存され、サーバーには送信されません。
            </li>
            <li>
              <strong>地元スタンプ帳</strong>：協賛企業のクーポンコードを開封すると、「どの協賛企業のスタンプを集めたか」という記録をアカウントに保存します。協賛企業への効果測定（実際に何人の学生と接点を持てたか）に利用し、協賛企業を含む第三者への個別の開示は行いません。
            </li>
            <li>
              <strong>求人・インターン・説明会掲示板</strong>：表示回数・クリック数を集計しますが、これは利用者個人と紐付かない集計データです。
            </li>
            <li>
              <strong>プッシュ通知</strong>：通知を許可した場合、ブラウザから発行される通知用の識別情報（エンドポイント等）を保存します。通知の送信以外の目的には利用しません。
            </li>
          </ul>
        </Card>

        <Card>
          <h2 className="text-sm font-bold mb-1.5">2. 広告について</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            本アプリはGoogle AdSenseによる広告を掲載しています。Google等の第三者配信事業者がCookie等を使用し、利用者の興味に応じた広告を表示することがあります。詳しくは
            <a
              href="https://policies.google.com/technologies/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-600"
            >
              Googleの広告ポリシー
            </a>
            をご確認ください。
          </p>
        </Card>

        <Card>
          <h2 className="text-sm font-bold mb-1.5">3. 第三者提供</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            法令に基づく場合を除き、取得した情報を本人の同意なく第三者に提供することはありません。
          </p>
        </Card>

        <Card>
          <h2 className="text-sm font-bold mb-1.5">4. お問い合わせ・開示請求</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            ご自身の情報の確認・削除をご希望の場合、マイページの「アカウントを削除する」から削除できるほか、開発者までご連絡ください。
          </p>
        </Card>
      </div>
    </main>
  );
}
