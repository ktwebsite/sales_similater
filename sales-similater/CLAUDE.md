# Sales Simulator - 営業シミュレーターアプリ

## プロジェクト概要

電力販売代理店への営業をシミュレートする、リアルタイム音声対話トレーニングアプリケーション。
Google Gemini 2.5 Flash Native Audio を活用し、新卒営業担当者が実践的な営業スキルを訓練できる。

## 技術スタック

- **フロントエンド**: React 18 + TypeScript + SCSS
- **バックエンド**: Express.js (APIプロキシ)
- **AI/音声**: Google Generative AI SDK (@google/genai v0.14.0), Web Audio API (24kHz)
- **認証**: Firebase Authentication
- **状態管理**: React Hooks, Zustand
- **デプロイ**: Google Cloud Run (Docker), GitHub Actions CI/CD

## ディレクトリ構造

```
live_talk_app_realtime/
├── src/
│   ├── components/          # UIコンポーネント
│   │   ├── auth/            # 認証 (Login, AuthGuard, UserMenu)
│   │   ├── control-tray/    # 接続・録音制御
│   │   ├── evaluation-modal/ # セッション評価結果表示
│   │   ├── transcription/   # 文字起こしUI
│   │   ├── settings-dialog/ # 設定ダイアログ
│   │   └── side-panel/      # サイドパネル
│   ├── contexts/            # Reactコンテキスト
│   │   ├── AuthContext.tsx  # 認証状態管理
│   │   └── LiveAPIContext.tsx # Gemini API接続管理
│   ├── hooks/               # カスタムフック
│   │   ├── use-live-api.ts  # Live API接続
│   │   ├── use-webcam.ts    # Webカメラ
│   │   └── use-screen-capture.ts
│   ├── lib/                 # ユーティリティ
│   │   ├── genai-live-client.ts  # Gemini Live APIクライアント
│   │   ├── evaluation-service.ts # セッション評価サービス
│   │   ├── firebase-config.ts    # Firebase設定
│   │   ├── audio-recorder.ts     # 音声録音
│   │   └── audio-streamer.ts     # 音声再生
│   ├── prompts/
│   │   └── default-system-instruction.ts  # AIペルソナ設定
│   └── types.ts             # TypeScript型定義
├── server/                  # サーバー側コード
│   ├── middleware/auth.js   # 認証ミドルウェア
│   └── config/firebase-admin.js
├── server.js                # Expressサーバー (本番用)
├── Dockerfile               # Dockerイメージ
└── package.json
```

## 主要機能

### 1. AIペルソナ「吉田」
- 電力販売代理店の担当者役
- ビジネスに厳しく、数字と具体性を重視
- `src/prompts/default-system-instruction.ts` で定義

### 2. リアルタイム音声対話
- Gemini 2.5 Flash Native Audio との低遅延WebSocket通信
- 24kHz AudioContext, 30msチャンク送信
- 日本語VAD最適化 (無音判定800ms)

### 3. セッション評価機能
- 会話終了後にAIが評価
- 感情分析 (sentiment)、エンゲージメント (engagement)
- `src/lib/evaluation-service.ts` で実装

## 開発コマンド

```bash
# 依存関係インストール
npm install

# 開発サーバー起動 (React)
npm run dev

# 本番ビルド
npm run build

# 本番サーバー起動 (Express)
npm start

# テスト実行
npm test
```

## 環境変数

`.env` に以下を設定:

```bash
# Gemini API
GEMINI_API_KEY=your_key

# Firebase
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=

# 認証ドメイン制限
REACT_APP_ALLOWED_DOMAIN=
ALLOWED_EMAIL_DOMAIN=
```

## デプロイ

- **本番環境**: Google Cloud Run (asia-northeast1)
- **CI/CD**: GitHub Actions (main ブランチ push時に自動デプロイ)
- **シークレット管理**: Google Secret Manager

## 重要なファイル

| ファイル | 説明 |
|---------|------|
| `src/prompts/default-system-instruction.ts` | AIペルソナの性格・行動ルール |
| `src/lib/genai-live-client.ts` | Gemini Live API WebSocket通信 |
| `src/lib/evaluation-service.ts` | セッション評価ロジック |
| `src/contexts/LiveAPIContext.tsx` | API接続状態管理 |
| `src/contexts/AuthContext.tsx` | Firebase認証状態管理 |
| `server.js` | 本番用Expressサーバー |
