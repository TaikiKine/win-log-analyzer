# win-log-analyzer

Windows Event Log を Claude API で分析するCLIツール（Phase 1）

## セットアップ

```bash
# 依存インストール
npm install

# 環境変数の設定
cp .env.example .env
# .env を編集して ANTHROPIC_API_KEY を設定
```

## 使い方

```bash
# 基本実行（System ログ、Warning以上、最大50件）
npm run dev

# ログ種別・件数・レベルを指定
npm run dev -- --log Application --max 100 --level Error

# dry-run: API を呼ばずにログ内容だけ確認
npm run dev -- --dry-run

# ビルドして実行
npm run build
npm start
```

### CLI オプション

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `--log <name>` | ログ名 (System, Application, Security) | System |
| `--max <n>` | 取得するイベント数 | 50 |
| `--level <level>` | 最低レベル (Critical, Error, Warning, Information) | なし（全件） |
| `--dry-run` | ログ取得のみ、API呼び出しなし | false |

## プロジェクト構成

```
src/
├── index.ts        # エントリポイント（CLI引数パース・オーケストレーション）
├── types.ts        # 型定義
├── fetch-logs.ts   # WSL→PowerShell でログ取得
├── analyze.ts      # Claude API 呼び出し
└── display.ts      # ターミナル表示
```

## 今後の予定 (Phase 2〜)

- [ ] Express/Hono バックエンド + React フロントエンド
- [ ] 常駐デーモン化 (node-cron / systemd)
- [ ] 定期レポートの差分比較
- [ ] ログのローカルキャッシュ (SQLite)
