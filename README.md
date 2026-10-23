# WannaV わなみさん使用ログ分析ダッシュボード

## プロジェクト概要

**WannaV**（VTuber育成スクール）のチャットボット「わなみさん」の使用ログを視覚化するWebアプリケーションです。

### 主な機能

✅ **完成した機能**
- ✨ 非公開Google Spreadsheetからの認証付きリアルタイムデータ取得
- 🔐 **SSO認証対応**（APIエンドポイントは認証から除外）
- 📊 日次使用回数グラフ（月別選択機能付き）
- 📈 月次使用回数グラフ
- 🕐 **時間帯別使用回数グラフ（24時間分析）**
- 🏷️ **質問タイプ別統計（カテゴリ分析）**
- 🏆 使用ユーザーランキング（生徒名・学籍番号表示、月次切替可能）
- 📉 統計情報ダッシュボード（総使用回数、データ期間、1日平均、**KPI：280回**表示）
- 🔍 **スマートフィルタリング**: 
  - 生徒名登録済みレコードのみを集計（統計・グラフ・ランキング）
  - 「WannaV Tutors Community」サーバーを除外
- 📥 **CSVエクスポート機能**（BOM付きUTF-8）
- 📄 **PDFレポート出力機能**（日本語対応）
- 📖 **使い方マニュアル**（ヘッダーボタンから新タブで開く）
- 📱 レスポンシブデザイン対応

### データソース

- **スプレッドシート**: 管理者が設定する非公開の使用ログシート
- **フィルタリング**: 
  - F列（サーバー名）が「WannaV Tutors Community」のレコードを除外
  - **N列（生徒名）が空のレコードを除外** ← 統計・グラフ・ランキングすべてに適用

## URLs

- **開発サーバー**: https://3000-imsyplbgtjzcitiatubnc-c81df28e.sandbox.novita.ai （認証なし）
- **本番環境（Render）**: https://wanamisan-monitor.onrender.com （SSO認証必須）
- **API エンドポイント**: `/api/data` - スプレッドシートデータ取得（SSO認証必須）

### 🔐 SSO認証について

本番環境ではSSO（Single Sign-On）認証が有効です：
- **UIアクセス**: `?auth_token=<JWT_TOKEN>` が必要
- **APIアクセス**: `/api/*` パスは認証不要
- **静的ファイル**: `/static/*` パスは認証不要

**環境変数**:
- `JWT_SECRET`: JWT検証用のシークレットキー（**wannav-mainと完全に同じ値を設定**）

**🚨 重要**: Renderで`JWT_SECRET`環境変数を設定していない場合、SSO認証が失敗します。

#### Renderでの環境変数設定手順

1. **Renderダッシュボードにログイン**: https://render.com/
2. **wanamisan-monitor サービスを選択**
3. **Environment** タブを開く
4. **Add Environment Variable** をクリック
5. 以下を入力:
   ```
   Key: JWT_SECRET
   Value: <wannav-mainと同じシークレットキー>
   ```
   **注意**: wannav-mainサービスの`JWT_SECRET`と**完全に同じ値**を設定してください
6. **Save Changes** をクリック
7. サービスが自動的に再デプロイされます（2-3分）

#### JWT_SECRETの確認方法

wannav-mainサービスで使用している`JWT_SECRET`を確認：
1. Renderダッシュボード → **wannav-main** サービス
2. **Environment** タブ
3. `JWT_SECRET`の値をコピー
4. 同じ値を**wanamisan-monitor**に設定

## 📊 新機能詳細

### 🕐 時間帯分析
- **24時間別の使用パターン**を可視化
- ピークタイムを一目で把握
- 棒グラフで時間帯ごとの使用回数を表示

### 🏷️ 質問カテゴリ分析
- **質問タイプ別の統計**を円グラフで表示
  - `lesson_question`: レッスン関連の質問
  - `sns_consultation`: SNS相談
  - `通常質問`: 一般的な質問
  - その他
- 各カテゴリの割合を自動計算

### 📥 エクスポート機能

#### CSV出力
- **ユーザーランキングデータ**をCSV形式でダウンロード
- ファイル名: `wannav_usage_report_YYYYMMDD.csv`
- **BOM付きUTF-8でエンコード**（Excel で正しく開ける）
- 含まれる情報:
  - 順位
  - 生徒名
  - 学籍番号
  - 使用回数

#### PDF出力
- **詳細レポート**をPDF形式で出力
- **画像ベースで日本語対応**（html2canvas使用）
- 含まれる内容:
  - 統計情報サマリー
  - すべてのグラフ（日次、月次、時間帯、カテゴリ）
  - ユーザーランキングトップ20
- ファイル名: `wannav_usage_report_YYYYMMDD.pdf`

#### 使い方マニュアル
- **詳細な使い方ガイド**をブラウザで表示
- ヘッダーの「使い方マニュアル」ボタンから新しいタブで開く
- 全機能の説明と活用のヒントを含む
- ブラウザの印刷機能でPDF保存可能

## データアーキテクチャ

### データモデル

スプレッドシートの列構造：
- `タイムスタンプ`: 使用日時（ISO 8601形式）
- `ユーザーID`: Discord ユーザーID
- `ユーザー名`: Discord 表示名
- `チャンネル名`: 質問チャンネル名
- `サーバー名`: Discord サーバー名（フィルタリング対象）
- `質問内容`: ユーザーの質問
- `回答内容`: わなみさんの回答
- `質問タイプ`: 質問の分類（lesson_question, sns_consultation等）
- `生徒名`: 生徒の実名（N列）
- `学籍番号`: 生徒の学籍番号（O列）

### データフロー

```
Google Sheets API（認証付き読取り）
    ↓
Hono API (/api/data) - 全データ取得
    ↓
フィルタリング1: WannaV Tutors Community除外
    ↓
フィルタリング2: 生徒名（N列）空レコードを除外 ← NEW!
    ↓
フロントエンド（Chart.js で可視化）
    ↓
エクスポート（CSV / PDF）
```

**重要**: すべての統計・グラフ・ランキングは「生徒名登録済みレコードのみ」を対象としています。

### 使用技術

- **バックエンド**: Hono（Cloudflare Workers & Node.js対応）
- **フロントエンド**: Vanilla JavaScript + TailwindCSS
- **グラフ**: Chart.js 4.4.0
- **日付処理**: Day.js 1.11.10
- **PDFライブラリ**: jsPDF 2.5.1 + html2canvas 1.4.1
- **デプロイ**: 
  - 開発: Cloudflare Pages
  - 本番: **Render.com**

## 🚀 デプロイ方法

### 開発環境（ローカル）

1. **依存関係のインストール**:
   ```bash
   cd /home/user/webapp
   npm install
   ```

2. **ビルド**:
   ```bash
   npm run build
   ```

3. **開発サーバー起動**:
   ```bash
   # PM2で起動（推奨）
   pm2 start ecosystem.config.cjs
   
   # または直接起動
   npm run dev:sandbox
   
   # Node.jsサーバーで起動（Render環境テスト用）
   npm run dev:node
   ```

4. **動作確認**:
   ```bash
   curl http://localhost:3000
   ```

### 本番環境（Render.com）

#### 1. GitHubにプッシュ

```bash
cd /home/user/webapp

# GitHub環境設定（初回のみ）
# ※ setup_github_environment を実行済みの場合はスキップ

# リモートリポジトリ追加
git remote add origin https://github.com/YOUR_USERNAME/wannav-analytics.git

# プッシュ
git add .
git commit -m "feat: 拡張機能追加 - 時間帯分析、カテゴリ分析、エクスポート機能"
git push -u origin main
```

#### 2. Renderでデプロイ

1. **Render.com にアクセス**: https://render.com/
2. **「New +」→「Web Service」を選択**
3. **GitHubリポジトリを接続**
   - `wannav-analytics` リポジトリを選択
4. **設定を確認**（`render.yaml`が自動検出される）
   - **Name**: `wannav-analytics`
   - **Region**: `Singapore`
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. **「Create Web Service」をクリック**
6. デプロイ完了後、URLが発行されます（例: `https://wannav-analytics.onrender.com`）

#### 3. 環境変数（必要な場合）

Renderダッシュボードで以下を設定：
- `NODE_ENV`: `production`
- `PORT`: `10000`（自動設定済み）

## 画面構成

### 1. 統計情報カード（3枚）
- 📊 **総使用回数**: 生徒名登録済みレコード数のみカウント
- 📅 **データ期間**: 最古〜最新の日付範囲
- 📈 **1日平均**: 期間内の1日あたり平均使用回数

**注意**: すべての統計・グラフは生徒名（N列）が登録されているレコードのみを集計しています。

### 2. グラフエリア（4つのグラフ）

#### 📊 日次グラフ
- **横軸**: 日付（MM/DD形式）
- **縦軸**: その日の使用回数
- **機能**: 月選択ドロップダウンで表示月を切り替え
- **グラフタイプ**: 折れ線グラフ（エリアチャート）

#### 📈 月次グラフ
- **横軸**: 年月（YYYY年MM月形式）
- **縦軸**: 月間総使用回数
- **グラフタイプ**: 棒グラフ

#### 🕐 時間帯グラフ
- **横軸**: 時刻（0時〜23時）
- **縦軸**: 時間帯別使用回数
- **グラフタイプ**: 棒グラフ
- **用途**: ピークタイムの分析

#### 🏷️ カテゴリグラフ
- **グラフタイプ**: ドーナツチャート
- **表示内容**: 質問タイプ別の割合
- **機能**: ホバーで詳細情報（回数と割合）を表示

### 3. ユーザーランキングテーブル
- **列**:
  - 順位（トップ3はメダル表示 🥇🥈🥉）
  - 生徒名
  - 学籍番号
  - 使用回数
- **ソート**: 使用回数降順

### 4. エクスポートボタン
- **CSV出力**: ランキングデータをCSV形式でダウンロード
- **PDF出力**: 全グラフとランキングを含むレポートをPDF出力

## API仕様

### `GET /api/data`

スプレッドシートのデータを取得します。

**レスポンス例**:
```json
{
  "success": true,
  "data": [
    {
      "タイムスタンプ": "2025-11-28T10:44:45.838Z",
      "ユーザーID": "766666980086120470",
      "ユーザー名": "kyo8742",
      "サーバー名": "WannaV19",
      "質問タイプ": "lesson_question",
      "生徒名": "佐藤未歩",
      "学籍番号": "OLTS250911-HF",
      ...
    }
  ]
}
```

**エラーレスポンス例**:
```json
{
  "success": false,
  "error": "Failed to fetch spreadsheet data"
}
```

## プロジェクト構造

```
webapp/
├── src/
│   ├── index.tsx         # メインアプリケーション（API + HTML）
│   └── server.ts         # 削除済み（不要）
├── server.ts             # Render用エントリーポイント
├── dist/                 # ビルド出力（Cloudflare Pages用）
├── ecosystem.config.cjs  # PM2設定ファイル
├── render.yaml           # Render.com デプロイ設定
├── package.json          # 依存関係とスクリプト
├── tsconfig.json         # TypeScript設定
├── vite.config.ts        # Vite設定
├── wrangler.jsonc        # Cloudflare設定
├── .gitignore            # Git除外ファイル
└── README.md             # このファイル
```

## 📝 コマンドリファレンス

```bash
# 開発サーバー起動（Cloudflare Pages環境）
npm run build
pm2 start ecosystem.config.cjs

# Node.jsサーバーで起動（Render環境テスト）
npm run dev:node

# サーバー状態確認
pm2 list

# ログ確認
pm2 logs wannav-analytics --nostream

# サーバー再起動
pm2 restart wannav-analytics

# Git操作
git status
git add .
git commit -m "メッセージ"
git push origin main
```

## トラブルシューティング

### Renderデプロイエラー

**問題**: `npm start` が失敗する
**解決策**: 
```bash
# ローカルでテスト
npm run dev:node

# エラーが出る場合は依存関係を確認
npm install
```

**問題**: ポート設定エラー
**解決策**: Renderは環境変数 `PORT` を自動設定します。`server.ts` が `process.env.PORT` を正しく読み込んでいることを確認してください。

### データ取得エラー

**問題**: スプレッドシートデータが読み込めない
**解決策**:
1. スプレッドシートが公開設定されているか確認
2. CSV Export URLが正しいか確認
3. ネットワーク接続を確認

## 今後の機能拡張案

### 🚀 追加予定機能

1. **高度なフィルタリング**:
   - 期間指定フィルター（カスタム日付範囲）
   - 生徒名検索機能
   - サーバー別表示切り替え

2. **リアルタイム更新**:
   - 自動リフレッシュ機能（5分ごと）
   - WebSocket経由のリアルタイムデータ更新

3. **詳細分析**:
   - 質問内容のキーワード分析
   - 回答文字数の統計
   - 処理時間の分析

4. **認証機能**:
   - 管理者ログイン
   - ユーザー別アクセス制限

5. **通知機能**:
   - 異常値検知アラート
   - 日次レポートメール送信

## デプロイ状況

- **開発環境**: ✅ 稼働中（Sandbox）
  - URL: https://3000-imsyplbgtjzcitiatubnc-c81df28e.sandbox.novita.ai
- **本番環境**: 🚀 Render.com 自動デプロイ中
  - URL: https://wanamisan-monitor.onrender.com
- **GitHub**: https://github.com/kyo10310415/wanamisan-monitor
- **最終更新日**: 2026-01-13
- **最新変更**: 生徒名登録済みレコードのみを集計するように変更（統計・グラフ・ランキング）

## ライセンス

© 2025 WannaV VTuber育成スクール

---

**開発者向けメモ**:
- 開発: Cloudflare Pages環境（Wrangler + PM2）
- 本番: Render.com（Node.js + @hono/node-server）
- ポート: 開発=3000、本番=10000（Render自動設定）
- スプレッドシートの公開設定が必要（CSV Export有効化）

## SEC-021 / SEC-022：認証と非公開データ取得

全ページ・全APIをSSO認証の対象にし、匿名APIはJSON 401、HTMLは共通ダッシュボードへリダイレクトします。従来SSOで利用できたadmin/leader/crewの読取りを維持し、未知role、別target origin、type違い、期限なし・1時間超・期限切れtoken、HS256以外を拒否します。APIのクエリtokenは受理せず、HTMLの入口でのみHttpOnly/Secure/Lax cookieに交換してURLから削除します。鍵断片・token・利用者名をログに出しません。no-storeとno-referrerを設定します。

### 配備前に必要な設定

| Key | 内容 |
|---|---|
| JWT_SECRET | WannaV-mainと同じ、32文字以上の強い既存共有鍵。公開サンプル値は拒否 |
| APP_ORIGIN | このサービスの実際のHTTPS origin。RenderではRENDER_EXTERNAL_URLも利用可 |
| GOOGLE_SERVICE_ACCOUNT_EMAIL | 使用ログシートを読めるサービスアカウントのclient_email |
| GOOGLE_PRIVATE_KEY | 同アカウントのRSA秘密鍵。Renderの秘密変数へ直接入力。改行または\n形式 |
| GOOGLE_SPREADSHEET_ID | 管理者が確認した元シートのID |
| GOOGLE_SHEET_RANGE | 実際のタブ名とA1範囲。例はUsageLog!A:O。1行目のヘッダーを含める |

Google Sheets APIを有効にし、対象シートだけをサービスアカウントへ閲覧共有します。新しい権限付与・資格情報の発行は所有者が実施してください。既存の適切なサービスアカウントがある場合は不要に再発行しません。秘密値をコード・ログ・チャットに書かないでください。

公開CSVへのfallbackはありません。サービスアカウントの読取りを確認してから元シートの「一般的なアクセス」を必要な組織・利用者だけへ制限し、「ウェブに公開」を利用している場合も公開停止を確認してください。他の正規利用システムへの影響を先に点検します。アプリの変更だけでは既存のシート公開設定は変更されません。公開停止を確認するまで、元シートの直接漏洩経路が解消済みとは扱いません。

APIは既存UIが参照するタイムスタンプ・サーバー名・質問タイプ・生徒名・学籍番号・質問内容・回答内容の7列のみ返します。その他の内部列は返さなくなるため、独自クライアントがある場合は確認してください。質問内容と回答内容は既存UIの詳細表示で必要なため維持しています。

### 検証と運用

`npm run test:security`はmock Google通信と生成した隔離用鍵のみを利用。認証拒否、role/target/lifetime、実APIのGoogle呼出し前拒否、読取りスコープ、固定宛先、転送禁止、token cache、エラー最小化と列射影を検証します。`npm run build`も確認します。実Google/本番シート・SSOログインは別途確認が必要です。

未設定・短い共有鍵・公開既定値・Sheets資格情報の欠落は起動時に拒否します。過去に既定鍵を使っていた場合は所有者が全SSO連携先と鍵交換・session失効を調整してください。DBschema変更・新規依存はありません。ユーザー停止・降格の既存1時間SSOへの即時反映、画面内の既存XSS対策等は別の確認が必要です。

技術根拠：Google公式のサービスアカウントOAuth手順とSheets values.getを使用します。
- https://developers.google.com/identity/protocols/oauth2/service-account
- https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get
