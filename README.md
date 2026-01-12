# WannaV わなみさん使用ログ分析ダッシュボード

## プロジェクト概要

**WannaV**（VTuber育成スクール）のチャットボット「わなみさん」の使用ログを視覚化するWebアプリケーションです。

### 主な機能

✅ **完成した機能**
- ✨ Google Spreadsheetからのリアルタイムデータ取得（CSV形式）
- 📊 日次使用回数グラフ（月別選択機能付き）
- 📈 月次使用回数グラフ
- 🕐 **時間帯別使用回数グラフ（24時間分析）** ← NEW!
- 🏷️ **質問タイプ別統計（カテゴリ分析）** ← NEW!
- 🏆 使用ユーザーランキング（生徒名・学籍番号表示）
- 📉 統計情報ダッシュボード（総使用回数、ユニークユーザー、期間、1日平均）
- 🔍 データフィルタリング（「WannaV Tutors Community」サーバーを除外）
- 📥 **CSVエクスポート機能** ← NEW!
- 📄 **PDFレポート出力機能** ← NEW!
- 📱 レスポンシブデザイン対応

### データソース

- **スプレッドシート**: [わなみさん使用ログ](https://docs.google.com/spreadsheets/d/1vKrYCzaw-miJOY52oskNoMfn-uEHIolBMhC7uMxxN_M/edit?usp=sharing)
- **フィルタリング**: F列（サーバー名）が「WannaV Tutors Community」のレコードは除外

## URLs

- **開発サーバー**: https://3000-imsyplbgtjzcitiatubnc-c81df28e.sandbox.novita.ai
- **本番環境（Render）**: デプロイ後に追加
- **API エンドポイント**: `/api/data` - スプレッドシートデータ取得

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
- 含まれる情報:
  - 順位
  - 生徒名
  - 学籍番号
  - 使用回数

#### PDF出力
- **詳細レポート**をPDF形式で出力
- 含まれる内容:
  - 統計情報サマリー
  - すべてのグラフ（日次、月次、時間帯、カテゴリ）
  - ユーザーランキングトップ20
- ファイル名: `wannav_usage_report_YYYYMMDD.pdf`

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
Google Sheets (CSV Export)
    ↓
Hono API (/api/data)
    ↓
フィルタリング（WannaV Tutors Community除外）
    ↓
フロントエンド（Chart.js で可視化）
    ↓
エクスポート（CSV / PDF）
```

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

### 1. 統計情報カード（4枚）
- 📊 **総使用回数**: 全レコード数
- 👥 **ユニークユーザー**: 生徒名ベースの一意ユーザー数
- 📅 **データ期間**: 最古〜最新の日付範囲
- 📈 **1日平均**: 期間内の1日あたり平均使用回数

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
- **本番環境**: 🚀 Render.com デプロイ準備完了
- **最終更新日**: 2026-01-12

## ライセンス

© 2025 WannaV VTuber育成スクール

---

**開発者向けメモ**:
- 開発: Cloudflare Pages環境（Wrangler + PM2）
- 本番: Render.com（Node.js + @hono/node-server）
- ポート: 開発=3000、本番=10000（Render自動設定）
- スプレッドシートの公開設定が必要（CSV Export有効化）
