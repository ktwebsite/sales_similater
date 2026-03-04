const admin = require('firebase-admin');

// Firebase Admin SDK の初期化
if (!admin.apps.length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin SDK initialized with service account');
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', error.message);
      process.exit(1);
    }
  } else {
    // GCP上ではデフォルト認証情報を使用
    admin.initializeApp();
    console.log('Firebase Admin SDK initialized with default credentials');
  }
}

module.exports = admin;
