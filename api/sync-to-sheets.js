import admin from 'firebase-admin';
import { google } from 'googleapis';

// Firebase Admin の初期化
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

const db = admin.firestore();

// Google Sheets API の設定
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 環境変数チェック
    const requiredEnvVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL', 
      'FIREBASE_PRIVATE_KEY',
      'GOOGLE_CLIENT_EMAIL',
      'GOOGLE_PRIVATE_KEY',
      'GOOGLE_SHEET_ID'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      return res.status(500).json({
        error: 'Missing environment variables',
        missing: missingVars
      });
    }

    // Firestore から未同期のデータを取得
    const snapshot = await db.collection('submissions')
      .where('synced', '==', false)
      .limit(50) // 一度に50件まで処理
      .get();

    if (snapshot.empty) {
      return res.status(200).json({ 
        message: 'No new data to sync',
        synced: 0
      });
    }

    const rows = [];
    const batch = db.batch();

    snapshot.forEach(doc => {
      const data = doc.data();
      
      // スプレッドシート用のデータ行を作成
      rows.push([
        data.name || '',
        data.email || '',
        data.message || '',
        data.timestamp?.toDate?.()?.toLocaleString('ja-JP') || new Date().toLocaleString('ja-JP'),
        new Date().toLocaleString('ja-JP') // 同期日時
      ]);
      
      // 同期フラグを更新するためのバッチ操作
      batch.update(doc.ref, { 
        synced: true,
        syncedAt: admin.firestore.Timestamp.now()
      });
    });

    // Google Sheets に書き込み
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:E', // A-E列を使用
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: rows,
      },
    });

    // Firestore の同期フラグを更新
    await batch.commit();

    res.status(200).json({
      success: true,
      message: `Successfully synced ${rows.length} records`,
      synced: rows.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ 
      error: 'Sync failed', 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}