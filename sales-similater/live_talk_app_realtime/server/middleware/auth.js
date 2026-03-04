const admin = require('../config/firebase-admin');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'トークンが必要です' });
  }

  try {
    // Firebase ID tokenの検証
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // ドメイン検証（環境変数で設定されている場合）
    const allowedDomain = process.env.REACT_APP_ALLOWED_DOMAIN;
    if (allowedDomain && !decodedToken.email.endsWith(`@${allowedDomain}`)) {
      return res.status(403).json({ 
        error: `許可されていないドメインです。@${allowedDomain} のアカウントを使用してください。` 
      });
    }
    
    // ユーザー情報をリクエストに追加
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name
    };
    
    next();
  } catch (error) {
    console.error('認証エラー:', error.message);
    return res.status(403).json({ error: '無効なトークンです' });
  }
}

module.exports = authenticateToken;
