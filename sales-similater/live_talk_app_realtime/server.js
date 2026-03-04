/**
 * Express server for proxying Gemini API requests
 * This server handles API key management securely on the server side
 */

// Load environment variables from .env file in development
require('dotenv-flow').config();

const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();

// Firebase Admin SDK初期化（認証機能用）
require('./server/config/firebase-admin');
const authenticateToken = require('./server/middleware/auth');

// Port configuration - Cloud Run uses PORT environment variable
const PORT = process.env.PORT || 8080;

// Get API key from environment variable or Secret Manager
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY environment variable is not set');
  process.exit(1);
}

// Middleware
app.use(express.json());

// CORS configuration for production
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check endpoint for Cloud Run
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});


app.get('/api/gemini/config', /* authenticateToken, */(req, res) => {
  try {
    res.json({
      apiKey: GEMINI_API_KEY,
      // user: req.user?.email 
    });
  } catch (error) {
    console.error('Error fetching API key:', error);
    res.status(500).json({ error: 'Failed to fetch API configuration' });
  }
});

/**
 * Kintone Integration Endpoint
 * セキュアに評価データをKintoneに保存する
 */
app.post('/api/save-kintone', async (req, res) => {
  try {
    const { idToken, score, report } = req.body;

    // リクエストボディのバリデーション
    if (!idToken || score === undefined || !report) {
      return res.status(400).json({
        error: '必須パラメータが不足しています (idToken, score, report)'
      });
    }

    // Kintone設定の確認（詳細ログ追加）
    const { KINTONE_SUBDOMAIN, KINTONE_APP_ID, KINTONE_API_TOKEN, ALLOWED_EMAIL_DOMAIN } = process.env;

    if (!KINTONE_SUBDOMAIN || !KINTONE_APP_ID || !KINTONE_API_TOKEN) {
      console.error('Kintone環境変数が設定されていません');
      return res.status(500).json({
        error: 'Kintoneの設定が不完全です',
        details: {
          hasSubdomain: !!KINTONE_SUBDOMAIN,
          hasAppId: !!KINTONE_APP_ID,
          hasToken: !!KINTONE_API_TOKEN
        }
      });
    }

    // Firebase Admin SDKでIDトークンを検証
    const admin = require('firebase-admin');
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      console.error('IDトークン検証エラー:', error.message);
      return res.status(401).json({ error: '認証に失敗しました' });
    }

    const userEmail = decodedToken.email;
    if (!userEmail) {
      return res.status(401).json({ error: 'メールアドレスが取得できませんでした' });
    }

    // ドメイン制限チェック（@htb-energy.com のみ許可）
    const allowedDomain = ALLOWED_EMAIL_DOMAIN || 'htb-energy.com';
    if (!userEmail.endsWith(`@${allowedDomain}`)) {
      console.warn(`許可されていないドメイン: ${userEmail}`);
      return res.status(403).json({
        error: `許可されていないドメインです。${allowedDomain}のアカウントを使用してください。`
      });
    }

    // メールアドレスからユーザー名を抽出（@の前の部分）
    const userName = userEmail.split('@')[0];

    // Kintone APIへのリクエストボディを構築
    // フィールドコード: adress, score, report
    const kintoneData = {
      app: KINTONE_APP_ID,
      record: {
        adress: { value: userName },      // ユーザー名（メールアドレスの@より前）
        score: { value: String(score) },  // 評価スコア
        report: { value: report }         // 評価レポート全文
      }
    };

    // Kintone APIにPOSTリクエストを送信
    // ドメインの選択: .cybozu.com, .kintone.com, .cybozu-dev.comなど
    // ゲストスペースの場合: /k/guest/{spaceId}/v1/record.json
    const kintoneUrl = `https://${KINTONE_SUBDOMAIN}.cybozu.com/k/v1/record.json`;
    console.log(`Kintone APIリクエスト送信: ユーザー=${userName}, AppID=${KINTONE_APP_ID}`);

    const kintoneResponse = await axios.post(kintoneUrl, kintoneData, {
      headers: {
        'X-Cybozu-API-Token': KINTONE_API_TOKEN,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10秒タイムアウト
    });

    console.log(`Kintoneへの保存成功: ユーザー=${userName}, スコア=${score}, recordId=${kintoneResponse.data.id}`);

    res.status(200).json({
      success: true,
      message: 'Kintoneへの保存が完了しました',
      recordId: kintoneResponse.data.id
    });

  } catch (error) {
    console.error('Kintone保存エラー詳細:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
      code: error.code
    });

    res.status(500).json({
      error: 'Kintoneへの保存に失敗しました',
      details: error.response?.data || error.message,
      code: error.code,
      status: error.response?.status
    });
  }
});

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'build')));

// Catch-all handler: serve index.html for any route not matched above
// This enables client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});