# WannaV わなみさん使用ログ分析システム - 管理者マニュアル

## 目次

1. [システム概要](#システム概要)
2. [技術スタック](#技術スタック)
3. [アーキテクチャ](#アーキテクチャ)
4. [開発環境](#開発環境)
5. [本番環境](#本番環境)
6. [デプロイメント](#デプロイメント)
7. [データソース管理](#データソース管理)
8. [トラブルシューティング](#トラブルシューティング)
9. [メンテナンス](#メンテナンス)
10. [セキュリティ](#セキュリティ)

---

## システム概要

### プロジェクト情報
- **プロジェクト名**: WannaV わなみさん使用ログ分析ダッシュボード
- **目的**: VTuber育成スクールのチャットボット「わなみさん」の使用状況を可視化・分析
- **対象ユーザー**: 
  - エンドユーザー: スクール運営スタッフ、講師
  - 管理者: システム管理者、開発者

### 主要機能
1. **データ可視化**
   - 日次・月次使用回数グラフ
   - 時間帯別使用分析
   - 質問カテゴリ別統計
   - ユーザーランキング

2. **詳細分析**
   - 生徒別使用履歴
   - 質問内容・回答の閲覧
   - 月次集計機能

3. **データエクスポート**
   - CSV形式（Excel互換）
   - PDF形式（レポート）

---

## 技術スタック

### フロントエンド
- **フレームワーク**: Vanilla JavaScript
- **スタイリング**: Tailwind CSS 3.x (CDN)
- **グラフライブラリ**: Chart.js 4.4.0
- **日付処理**: Day.js 1.11.10
- **PDFライブラリ**: jsPDF 2.5.1 + html2canvas 1.4.1
- **アイコン**: Font Awesome 6.4.0

### バックエンド
- **フレームワーク**: Hono 4.11.3
- **ランタイム**: 
  - 開発: Cloudflare Workers (Wrangler)
  - 本番: Node.js 18+ (Render.com)
- **言語**: TypeScript 5.0+
- **ビルドツール**: Vite 6.4.1

### インフラストラクチャ
- **開発環境**: Cloudflare Pages (サンドボックス)
- **本番環境**: Render.com (Web Service)
- **バージョン管理**: GitHub
- **CI/CD**: Render自動デプロイ
- **プロセス管理**: PM2 (開発環境)

---

## アーキテクチャ

### システム構成図

```
┌─────────────────────────────────────────────────┐
│          Google Spreadsheet (データソース)        │
│     https://docs.google.com/spreadsheets/       │
│              d/1vKrYCzaw-miJOY52os...          │
└──────────────────┬──────────────────────────────┘
                   │ CSV Export (公開URL)
                   ▼
┌─────────────────────────────────────────────────┐
│              Hono Backend API                    │
│              /api/data endpoint                  │
│  - データ取得（fetch）                            │
│  - CSVパース（カスタムパーサー）                   │
│  - フィルタリング（除外処理）                      │
└──────────────────┬──────────────────────────────┘
                   │ JSON
                   ▼
┌─────────────────────────────────────────────────┐
│          Frontend (Vanilla JS)                   │
│  - Chart.js でグラフ描画                         │
│  - Day.js で日付処理                             │
│  - jsPDF/html2canvas でエクスポート              │
└─────────────────────────────────────────────────┘
```

### データフロー

```
1. ユーザーがページにアクセス
   ↓
2. JavaScript init() 実行
   ↓
3. fetch('/api/data') でAPIリクエスト
   ↓
4. Hono が Google Sheets CSV を取得
   ↓
5. CSVをパース → JSON変換
   ↓
6. フィルタリング（WannaV Tutors Community除外）
   ↓
7. フロントエンドでデータ処理
   ↓
8. Chart.js でグラフ描画
   ↓
9. ユーザーに表示
```

### ディレクトリ構造

```
/home/user/webapp/
├── src/
│   └── index.tsx           # メインアプリケーション
├── public/                 # 静的ファイル
│   └── manual.html         # ユーザーマニュアル（旧）
├── dist/                   # ビルド出力
│   ├── _worker.js          # Cloudflare Worker用
│   └── manual.html         # コピーされたマニュアル
├── server.mjs              # Render用エントリーポイント
├── ecosystem.config.cjs    # PM2設定
├── render.yaml             # Render.comデプロイ設定
├── package.json            # 依存関係
├── tsconfig.json           # TypeScript設定
├── vite.config.ts          # Vite設定
├── wrangler.jsonc          # Cloudflare設定
├── .gitignore              # Git除外設定
├── README.md               # プロジェクト説明
└── ADMIN_MANUAL.md         # このファイル
```

---

## 開発環境

### 環境情報

**プラットフォーム**: Cloudflare Pages (サンドボックス)  
**URL**: https://3000-imsyplbgtjzcitiatubnc-c81df28e.sandbox.novita.ai  
**ポート**: 3000  
**プロセス管理**: PM2  
**ビルドツール**: Wrangler + Vite

### 開発サーバーの起動

```bash
# プロジェクトディレクトリに移動
cd /home/user/webapp

# 依存関係のインストール（初回のみ）
npm install

# ビルド
npm run build

# PM2で起動（推奨）
pm2 start ecosystem.config.cjs

# または直接起動
npm run dev:sandbox
```

### PM2コマンド

```bash
# サービス一覧
pm2 list

# ログ確認（ノンブロッキング）
pm2 logs wannav-analytics --nostream

# ログ確認（リアルタイム - 終了はCtrl+C）
pm2 logs wannav-analytics

# 再起動
pm2 restart wannav-analytics

# 停止
pm2 stop wannav-analytics

# 削除
pm2 delete wannav-analytics

# 全サービス再起動
pm2 restart all
```

### ポート管理

```bash
# ポート3000の使用状況確認
lsof -i :3000

# ポート3000を使用中のプロセスを強制終了
fuser -k 3000/tcp

# または
pkill -f "wrangler pages dev"
```

### ローカルテスト

```bash
# サーバーが起動しているか確認
curl http://localhost:3000

# APIレスポンスを確認
curl http://localhost:3000/api/data | jq '.success'

# データ件数を確認
curl -s http://localhost:3000/api/data | jq '.data | length'
```

### 開発環境の設定ファイル

**ecosystem.config.cjs** (PM2設定):
```javascript
module.exports = {
  apps: [
    {
      name: 'wannav-analytics',
      script: 'npx',
      args: 'wrangler pages dev dist --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
```

**vite.config.ts**:
```typescript
import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    build(),
    devServer({
      adapter,
      entry: 'src/index.tsx'
    })
  ],
  publicDir: 'public'
})
```

---

## 本番環境

### 環境情報

**プラットフォーム**: Render.com (Web Service)  
**URL**: https://wanamisan-monitor.onrender.com  
**リージョン**: Singapore  
**プラン**: Free Tier  
**GitHub**: https://github.com/kyo10310415/wanamisan-monitor  
**ブランチ**: main

### プラン詳細

**Free Tier の制限**:
- 帯域幅: 100GB/月
- 稼働時間: 750時間/月
- スリープ: 15分間アクティビティなしで自動スリープ
- 復帰時間: 約30秒

**有料プラン（Starter: $7/月）**:
- スリープなし
- カスタムドメイン
- より高速な起動

### 環境変数

Renderダッシュボードで設定済み:

| 変数名 | 値 | 説明 |
|--------|-----|------|
| NODE_ENV | production | 本番環境フラグ |
| PORT | 10000 | Render自動設定 |

### 本番環境の設定ファイル

**render.yaml**:
```yaml
services:
  - type: web
    name: wannav-analytics
    runtime: node
    region: singapore
    plan: free
    branch: main
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
```

**server.mjs** (エントリーポイント):
```javascript
import app from './dist/_worker.js'
import { serve } from '@hono/node-server'

const port = parseInt(process.env.PORT || '3000')

console.log('Loading application...')
console.log('Port:', port)
console.log('Environment:', process.env.NODE_ENV || 'development')

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`Server is running at http://localhost:${info.port}`)
})
```

### ヘルスチェック

```bash
# 本番サーバーの状態確認
curl -I https://wanamisan-monitor.onrender.com

# APIレスポンス確認
curl https://wanamisan-monitor.onrender.com/api/data

# データ取得テスト
curl -s https://wanamisan-monitor.onrender.com/api/data | jq '.success, (.data | length)'
```

---

## デプロイメント

### 自動デプロイフロー

```
1. ローカルで開発・テスト
   ↓
2. git commit でコミット
   ↓
3. git push origin main でGitHubにプッシュ
   ↓
4. Renderが自動検知
   ↓
5. render.yaml に従ってビルド・デプロイ
   ↓
6. 3-5分後にデプロイ完了
   ↓
7. https://wanamisan-monitor.onrender.com で公開
```

### デプロイ手順

#### 1. コード変更をコミット

```bash
cd /home/user/webapp

# 変更内容を確認
git status

# ステージング
git add .

# コミット
git commit -m "feat: 新機能追加の説明"

# GitHubにプッシュ
git push origin main
```

#### 2. Renderでの自動ビルド

プッシュ後、Renderが自動的に以下を実行:

1. **ビルドフェーズ**:
   ```bash
   npm install
   npm run build
   ```

2. **起動フェーズ**:
   ```bash
   npm start  # → node server.mjs
   ```

#### 3. デプロイ確認

Renderダッシュボードで確認:
- https://dashboard.render.com/
- プロジェクト: `wannav-analytics`
- Logs タブでビルドログ確認
- Events タブでデプロイ履歴確認

### 手動デプロイ

Renderダッシュボードから手動デプロイも可能:

1. Renderダッシュボードにログイン
2. `wannav-analytics` サービスを選択
3. **Manual Deploy** → **Deploy latest commit** をクリック

### ロールバック

問題が発生した場合:

1. Renderダッシュボード → Events タブ
2. 以前の成功したデプロイを選択
3. **Rollback to this version** をクリック

または、GitHubでrevertしてプッシュ:

```bash
# 直前のコミットを取り消し
git revert HEAD

# プッシュ（自動デプロイ）
git push origin main
```

### デプロイのベストプラクティス

1. **開発環境で十分にテスト**
   - ローカルで動作確認
   - エラーログがないことを確認
   - 全機能をテスト

2. **段階的なデプロイ**
   - 小さな変更ごとにコミット
   - 大きな変更は複数コミットに分割

3. **コミットメッセージの命名規則**
   - `feat:` 新機能
   - `fix:` バグ修正
   - `docs:` ドキュメント更新
   - `chore:` その他の変更

4. **デプロイ後の確認**
   - ページが正常に表示されるか
   - APIが正常に動作するか
   - グラフが描画されるか
   - エクスポート機能が動作するか

---

## データソース管理

### Google Spreadsheet

**スプレッドシートURL**:
https://docs.google.com/spreadsheets/d/1vKrYCzaw-miJOY52oskNoMfn-uEHIolBMhC7uMxxN_M/edit?usp=sharing

**CSV Export URL**:
https://docs.google.com/spreadsheets/d/1vKrYCzaw-miJOY52oskNoMfn-uEHIolBMhC7uMxxN_M/export?format=csv

### データ構造

**列構成**:

| 列名 | データ型 | 説明 | 必須 |
|------|---------|------|------|
| タイムスタンプ | ISO 8601 | 使用日時 | ✓ |
| ユーザーID | String | Discord ユーザーID | ✓ |
| ユーザー名 | String | Discord 表示名 | ✓ |
| チャンネル名 | String | 質問チャンネル名 | - |
| チャンネルID | String | チャンネルID | - |
| サーバー名 | String | Discord サーバー名 | ✓ |
| 質問内容 | String | ユーザーの質問 | ✓ |
| 回答内容 | String | わなみさんの回答 | ✓ |
| 回答文字数 | Number | 回答の文字数 | - |
| 処理時間(ms) | Number | 処理時間 | - |
| 質問タイプ | String | 質問の分類 | - |
| 回答ステータス | String | 回答の状態 | - |
| 生徒名 | String | 生徒の実名 (N列) | - |
| 学籍番号 | String | 学籍番号 (O列) | - |

### フィルタリングルール

**除外条件**:
- `サーバー名` が `"WannaV Tutors Community"` のレコードを除外

**実装**:
```javascript
allData = result.data.filter(row => {
    return row['サーバー名'] !== 'WannaV Tutors Community';
});
```

### データ更新の仕組み

1. **自動更新**: なし（ページリロードで最新データ取得）
2. **手動更新**: ページをリロード（F5）
3. **取得タイミング**: ページ読み込み時に毎回Google SheetsからCSVを取得

### スプレッドシートの公開設定

**重要**: CSVエクスポート機能を有効にするため、スプレッドシートは以下の設定が必要:

1. Google Sheetsで開く
2. **共有** → **リンクを知っている全員が閲覧可** に設定
3. **コピーを作成、ダウンロード、印刷を閲覧者に禁止する** のチェックを**外す**

### データソースの変更方法

別のスプレッドシートに切り替える場合:

1. `src/index.tsx` の `SHEET_ID` を変更:

```typescript
const SHEET_ID = '新しいスプレッドシートID'
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`
```

2. ビルド・デプロイ:

```bash
npm run build
git add src/index.tsx
git commit -m "chore: データソースを変更"
git push origin main
```

---

## トラブルシューティング

### よくある問題と解決方法

#### 1. ページが「データを読み込んでいます...」から進まない

**原因**:
- APIエラー
- JavaScriptエラー
- データパースエラー

**診断手順**:

```bash
# APIレスポンス確認
curl -s http://localhost:3000/api/data | jq '.success'

# エラーログ確認
pm2 logs wannav-analytics --nostream --lines 50
```

**ブラウザでの確認**:
1. F12でデベロッパーツールを開く
2. Consoleタブでエラーを確認
3. Networkタブで`/api/data`のステータスを確認

**解決方法**:
- スプレッドシートの公開設定を確認
- CSVフォーマットが正しいか確認
- JavaScriptコンソールエラーを修正

#### 2. グラフが表示されない

**原因**:
- Chart.jsのロードエラー
- データ形式の問題
- Canvas要素の問題

**診断**:

```javascript
// ブラウザコンソールで確認
console.log(window.Chart)  // Chart.jsがロードされているか
console.log(allData)       // データが取得できているか
```

**解決方法**:
- CDNのURLが正しいか確認
- ネットワーク接続を確認
- ブラウザのキャッシュをクリア

#### 3. CSV/PDF出力で文字化け

**原因**:
- BOMが付いていない
- エンコーディングの問題

**確認**:
- CSVファイルをテキストエディタで開き、先頭にBOM (`\uFEFF`) があるか確認

**解決済み**: 現在のバージョンではBOM付きで出力されます

#### 4. PM2でサービスが起動しない

**原因**:
- ポート3000が既に使用されている
- ビルドエラー

**解決方法**:

```bash
# ポートをクリーンアップ
fuser -k 3000/tcp

# PM2をリセット
pm2 delete all
pm2 start ecosystem.config.cjs

# ビルドエラーの場合
npm run build
```

#### 5. Renderでデプロイが失敗する

**診断**:
- Renderダッシュボード → Logs タブでエラー確認

**よくあるエラー**:

**a) `Cannot find module '@hono/node-server'`**

解決方法:
```bash
# package.jsonで@hono/node-serverがdependenciesにあるか確認
# devDependenciesではなくdependenciesに移動
```

**b) `Port already in use`**

解決方法:
- Renderは自動的にポートを管理するため、通常発生しない
- `server.mjs`で`process.env.PORT`を使用していることを確認

**c) ビルドタイムアウト**

解決方法:
- `render.yaml`の`buildCommand`を確認
- 不要な依存関係を削除

#### 6. データが更新されない

**原因**:
- ブラウザキャッシュ
- Google Sheetsの変更が反映されていない

**解決方法**:
- ページをハードリロード (Ctrl+Shift+R / Cmd+Shift+R)
- ブラウザのキャッシュをクリア
- スプレッドシートで変更を保存したか確認

---

## メンテナンス

### 定期メンテナンスタスク

#### 日次
- [ ] ダッシュボードの動作確認
- [ ] データ取得の確認
- [ ] エラーログの確認

#### 週次
- [ ] Renderのログ確認
- [ ] データ量の確認（パフォーマンスチェック）
- [ ] GitHubリポジトリのバックアップ確認

#### 月次
- [ ] 依存関係のアップデート確認
- [ ] セキュリティパッチの適用
- [ ] パフォーマンス分析
- [ ] ストレージ使用量の確認

### 依存関係の更新

```bash
# 依存関係の確認
npm outdated

# マイナーバージョンの更新
npm update

# メジャーバージョンの更新（慎重に）
npm install hono@latest
npm install vite@latest

# ビルドとテスト
npm run build
pm2 restart wannav-analytics

# 問題なければデプロイ
git add package.json package-lock.json
git commit -m "chore: 依存関係を更新"
git push origin main
```

### バックアップ戦略

#### コードのバックアップ
- **自動**: GitHubに全てのコードが保存
- **手動**: 重要な変更前にタグを作成

```bash
# タグ作成
git tag -a v1.0.0 -m "バージョン 1.0.0"
git push origin v1.0.0
```

#### データのバックアップ
- **Google Sheets**: Googleの自動バックアップに依存
- **定期エクスポート**: 週次でCSVエクスポートを推奨

```bash
# データをバックアップ
curl -s "https://docs.google.com/spreadsheets/d/1vKrYCzaw-miJOY52oskNoMfn-uEHIolBMhC7uMxxN_M/export?format=csv" \
  > backup_$(date +%Y%m%d).csv
```

### モニタリング

#### パフォーマンス指標

**監視項目**:
1. ページロード時間
2. API応答時間
3. データ取得時間
4. グラフ描画時間

**測定方法**:
```javascript
// ブラウザコンソールで実行
performance.getEntriesByType('navigation')[0].loadEventEnd
```

#### エラー監視

**ログの確認**:

```bash
# 開発環境
pm2 logs wannav-analytics --lines 100

# 本番環境
# Renderダッシュボード → Logs タブ
```

**エラー頻度の監視**:
- 4xx エラー: クライアント側の問題
- 5xx エラー: サーバー側の問題

---

## セキュリティ

### データセキュリティ

#### 個人情報の取り扱い

**含まれる個人情報**:
- 生徒名（N列）
- 学籍番号（O列）
- Discord ユーザーID
- Discord ユーザー名

**保護措置**:
1. スプレッドシートのアクセス制限
2. HTTPSでの通信
3. ログに個人情報を記録しない

#### アクセス制御

**現在の実装**:
- 認証なし（公開ダッシュボード）

**推奨される追加対策**:
1. Basic認証の追加
2. IPアドレス制限
3. セッション管理

### インフラセキュリティ

#### Render.com のセキュリティ
- 自動HTTPSサポート
- DDoS保護
- 定期的なセキュリティパッチ

#### GitHub のセキュリティ
- 2段階認証の有効化（推奨）
- アクセストークンの定期的なローテーション
- `.gitignore`で機密情報を除外

**重要な除外ファイル**:
```gitignore
.env
.env.local
*.log
node_modules/
dist/
.wrangler/
```

### APIセキュリティ

#### レート制限

**現在の実装**: なし

**推奨される対策**:
```typescript
// Honoでレート制限を追加
import { rateLimiter } from 'hono-rate-limiter'

app.use('/api/*', rateLimiter({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100 // 最大100リクエスト
}))
```

#### CORSポリシー

**現在の設定**:
```typescript
app.use('/api/*', cors())  // 全オリジン許可
```

**本番環境での推奨設定**:
```typescript
app.use('/api/*', cors({
  origin: 'https://wanamisan-monitor.onrender.com'
}))
```

### 脆弱性管理

#### 定期的なチェック

```bash
# npm auditを実行
npm audit

# 脆弱性の自動修正
npm audit fix

# 詳細なレポート
npm audit --json
```

#### 依存関係の監視

**推奨ツール**:
- GitHub Dependabot（自動PR作成）
- Snyk（継続的な監視）

---

## 付録

### A. よく使うコマンド一覧

```bash
# 開発環境
cd /home/user/webapp
npm run build
pm2 start ecosystem.config.cjs
pm2 logs wannav-analytics --nostream
pm2 restart wannav-analytics
curl http://localhost:3000/api/data | jq

# Git操作
git status
git add .
git commit -m "メッセージ"
git push origin main

# デバッグ
pm2 logs wannav-analytics --nostream --lines 50
curl -I http://localhost:3000
fuser -k 3000/tcp
```

### B. 環境変数一覧

| 変数名 | 開発環境 | 本番環境 | 説明 |
|--------|---------|---------|------|
| NODE_ENV | development | production | 環境識別子 |
| PORT | 3000 | 10000 | ポート番号 |

### C. URL一覧

| 用途 | URL |
|------|-----|
| 開発環境 | https://3000-imsyplbgtjzcitiatubnc-c81df28e.sandbox.novita.ai |
| 本番環境 | https://wanamisan-monitor.onrender.com |
| GitHub | https://github.com/kyo10310415/wanamisan-monitor |
| スプレッドシート | https://docs.google.com/spreadsheets/d/1vKrYCzaw-miJOY52oskNoMfn-uEHIolBMhC7uMxxN_M |
| Render Dashboard | https://dashboard.render.com/ |

### D. 連絡先

**開発者**: 
- GitHub: @kyo10310415

**サポート**:
- GitHub Issues: https://github.com/kyo10310415/wanamisan-monitor/issues

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0.0 | 2025-01-12 | 初版作成 |
| 1.1.0 | 2025-01-12 | 時間帯分析、カテゴリ分析、エクスポート機能追加 |
| 1.2.0 | 2025-01-12 | ユーザーランキング月次機能、生徒詳細モーダル追加 |
| 1.3.0 | 2025-01-13 | CSV/PDF文字化け修正、使い方マニュアル追加 |

---

**最終更新**: 2025-01-13  
**ドキュメントバージョン**: 1.0  
**対象システムバージョン**: 1.3.0

---

© 2025 WannaV VTuber育成スクール
