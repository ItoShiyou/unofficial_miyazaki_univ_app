# デプロイ手順（Vercel + PWA配布）

## 1. Vercelプロジェクトを作る

1. https://vercel.com にGitHubアカウントでログイン
2. 「Add New... → Project」から `ItoShiyou/unofficial_miyazaki_univ_app` をImport
3. Framework Preset は Next.js が自動検出される。ビルド設定は変更不要
   （`package.json` の build が `prisma migrate deploy && next build` になっており、
   デプロイのたびにDBマイグレーションが自動で適用される）
4. **この時点ではまだDeployしない**。先に2〜3の環境変数を設定する

## 2. Postgresを用意する

Vercelダッシュボードの Storage タブから Postgres（Neon）を作成し、プロジェクトに接続する。
接続すると `DATABASE_URL` などの環境変数が自動で注入される。

> **注意（ハマりやすい点）**
> Neonは「プーリング経由のURL」と「直接接続のURL」が分かれている。
> Prismaのマイグレーションはプーリング経由だと失敗することがあるため、
> ビルドが `prisma migrate deploy` で失敗する場合は `prisma/schema.prisma` の
> datasource に `directUrl` を追加し、直接接続用のURLを割り当てる:
>
> ```prisma
> datasource db {
>   provider  = "postgresql"
>   url       = env("DATABASE_URL")
>   directUrl = env("POSTGRES_URL_NON_POOLING")
> }
> ```

## 3. 環境変数を設定する（Settings → Environment Variables）

| 変数名 | 用途 | 値の作り方 |
|---|---|---|
| `DATABASE_URL` | DB接続 | Postgres接続時に自動設定される |
| `SESSION_SECRET` | ログインセッションの署名 | `openssl rand -hex 32` で生成 |
| `CRON_SECRET` | シラバス同期cronの保護 | `openssl rand -hex 32` で生成 |

**`SESSION_SECRET` を設定し忘れると、middlewareが例外を投げて全ページが500になる。**
Production / Preview / Development すべてにチェックを入れて設定すること。

`CRON_SECRET` を設定しておくと、Vercel Cronが実行時に
`Authorization: Bearer <CRON_SECRET>` を自動で付与してくれる。

## 4. デプロイする

Deployを実行。`https://<プロジェクト名>.vercel.app` で公開される（HTTPSは自動）。

## 5. シラバスの初期データを入れる（初回のみ必須）

`vercel.json` のcronは **4/1と10/1にしか動かない**ため、
デプロイ直後のDBは空で、授業を検索しても何も出てこない。
一度だけ手動で同期を実行する:

```bash
curl -H "Authorization: Bearer <CRON_SECRETの値>" \
  "https://<あなたのドメイン>/api/cron/sync-syllabus?university=miyazaki-u"
```

宮崎公立大学の分も同様に:

```bash
curl -H "Authorization: Bearer <CRON_SECRETの値>" \
  "https://<あなたのドメイン>/api/cron/sync-syllabus?university=miyazaki-municipal-u"
```

以降は学期の変わり目（4/1・10/1）に自動で更新される。

## 6. PWAとして配布する

**アプリストアへの申請は不要。URLを配るだけで「アプリ」として使える。**
配布したいのはトップページのURL1つだけ:

```
https://<あなたのドメイン>/
```

### 利用者側のインストール手順

**iPhone（Safariで開く必要がある。Chromeでは追加できない）**
1. Safariでサイトを開く
2. 下部の「共有」ボタン（□に↑）をタップ
3. 「ホーム画面に追加」を選ぶ

**Android（Chrome）**
1. Chromeでサイトを開く
2. 「アプリをインストール」のバナー、またはメニュー →「アプリをインストール」

インストールすると、アドレスバーのないネイティブアプリのような見た目で起動する
（`manifest.json` の `display: standalone` による）。

### 更新の反映について

Service Workerがキャッシュを持つため、コードを更新しても利用者の端末で
すぐ反映されないことがある。**キャッシュの構造を変えた場合は
`public/sw.js` の `CACHE_NAME` のバージョンを上げること**（例: v2 → v3）。
古いキャッシュはactivate時に自動で破棄される。

## 7. リリース後に検討すべきこと（現時点の制約）

- **メール認証がない**：架空のメールアドレスでも登録できる。「宮大生限定」は自己申告。
  なりすまし対策が必要になったら、大学ドメイン限定＋確認メール送信を検討する
  （別途メール送信サービスの契約が必要）
- **パスワードリセットがない**：パスワードを忘れると復旧できない
- **レート制限がメモリベース**：サーバーレスではインスタンスごとに独立するため、
  ログインの総当たり耐性は限定的。本格運用時はRedis等の共有ストアに置き換える
- **個人データは端末内にのみ保存**：機種変更するとデータは引き継がれない
  （CSVエクスポートで手動退避は可能）
- **宮崎県立看護大学のシラバス自動取得は未対応**：登録・手動入力は可能
