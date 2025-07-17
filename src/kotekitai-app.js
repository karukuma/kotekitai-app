// src/kotekitai-app.js
/* global gapi */
import React, { useState, useEffect } from 'react';
import { User, Calendar, Utensils, Home, Car } from 'lucide-react';

const KotekiForm = () => {
  const [selectedName, setSelectedName] = useState('');
  const [participantData, setParticipantData] = useState({});
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSignedIn, setIsSignedIn] = useState(false);

  // 環境変数から取得
  const SPREADSHEET_ID = process.env.REACT_APP_SPREADSHEET_ID || '1nYHpdW5LY2NRmXQr-Ab2mN7copCylb4NYSR_-PjoIFs';
  const CLIENT_ID = process.env.REACT_APP_CLIENT_ID || '19219457522-l73ijhd0n3fqj0fh7j7qm54081qepjdg.apps.googleusercontent.com';
  const API_KEY = process.env.REACT_APP_API_KEY || 'AIzaSyB3sq3fwopd7hOCQzdGiUdo1LxTT6a3YkQ';
  const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
  const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
  
  

  // 食事サイズ選択肢
  const mealSizes = ['極小', '小', '中', '大', '特大'];

  // 参加項目の定義
  const participationItems = [
    { key: 'E', label: '（土）午前' },
    { key: 'H', label: '（土）午前' },
    { key: 'I', label: '（土）午後' },
    { key: 'J', label: '（日）午前' },
    { key: 'K', label: '（日）午後' },
    { key: 'L', label: '（祭日）午前' },
    { key: 'M', label: '（祭日）午後' },
    { key: 'Q', label: '（土）おやつ🍰' },
    { key: 'U', label: '（日）おやつ🍰' }
  ];

  // 食事項目の定義
  const mealItems = [
    { key: 'D', label: '金）前泊+ 土）朝食🍚' },
    { key: 'F', label: '金）前泊+土）朝食🍚' },
    { key: 'G', label: '（土）昼食🍚' },
    { key: 'P', label: '土）宿泊+日）朝食' },
    { key: 'S', label: '日）宿泊+祭）朝食' },
    { key: 'T', label: '（日）昼食🍚' },
    { key: 'V', label: '（日）夕食🍚（予備列）' }
  ];

  // Google API初期化
  useEffect(() => {
    const initializeGapi = async () => {
      try {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://apis.google.com/js/api.js';
          script.onload = resolve;
          document.head.appendChild(script);
        });

        await new Promise((resolve) => {
          window.gapi.load('client:auth2', resolve);
        });

        await window.gapi.client.init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          discoveryDocs: [DISCOVERY_DOC],
          scope: SCOPES
        });

        const authInstance = gapi.auth2.getAuthInstance();
        setIsSignedIn(authInstance.isSignedIn.get());

        // 参加者データを読み込み
        if (authInstance.isSignedIn.get()) {
          loadParticipants();
        }
      } catch (error) {

  console.error('Google API初期化エラー:', error);
  console.error('エラーメッセージ:', error.message);
  console.error('スタックトレース:', error.stack);
  setMessage('Google API接続エラーが発生しました。');
}
      }
    };

    initializeGapi();
  }, []);

  // サインイン処理
  const handleSignIn = async () => {
    try {
      setLoading(true);
      const authInstance = gapi.auth2.getAuthInstance();
      await authInstance.signIn();
      setIsSignedIn(true);
      await loadParticipants();
      setMessage('サインインが完了しました。');
    } catch (error) {
      console.error('サインインエラー:', error);
      setMessage('サインインに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // 参加者データを読み込み
  const loadParticipants = async () => {
    try {
      const response = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: '鼓笛合宿appよう!A2:C141'
      });

      const values = response.result.values || [];
      const participantList = values.map((row, index) => ({
        rowIndex: index + 2,
        ban: row[0] || '',
        name: row[1] || '',
        grade: row[2] || ''
      })).filter(p => p.name);

      setParticipants(participantList);
    } catch (error) {
      console.error('参加者データ読み込みエラー:', error);
      setMessage('参加者データの読み込みに失敗しました。');
    }
  };

  // 参加者選択時の処理
  const handleNameSelect = async (name) => {
    setSelectedName(name);
    const participant = participants.find(p => p.name === name);
    if (participant) {
      // 既存データを読み込み
      try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `鼓笛合宿appよう!A${participant.rowIndex}:AK${participant.rowIndex}`
        });

        const values = response.result.values?.[0] || [];
        const data = {};
        
        // 既存データを読み込んで表示
        participationItems.forEach(item => {
          const colIndex = item.key.charCodeAt(0) - 65;
          data[item.key] = values[colIndex] || '';
        });

        mealItems.forEach(item => {
          const colIndex = item.key.charCodeAt(0) - 65;
          data[item.key] = values[colIndex] || '';
        });

        setParticipantData(data);
      } catch (error) {
        console.error('データ読み込みエラー:', error);
        setParticipantData({});
      }
    }
  };

  // データ更新処理
  const handleInputChange = (key, value) => {
    setParticipantData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // データ保存処理
  const handleSubmit = async () => {
    if (!selectedName) {
      setMessage('名前を選択してください。');
      return;
    }

    const participant = participants.find(p => p.name === selectedName);
    if (!participant) {
      setMessage('参加者が見つかりません。');
      return;
    }

    try {
      setLoading(true);
      
      // 更新データを準備
      const updates = [];
      
      [...participationItems, ...mealItems].forEach(item => {
        const colIndex = item.key.charCodeAt(0) - 65;
        const cellRange = `鼓笛合宿appよう!${item.key}${participant.rowIndex}`;
        updates.push({
          range: cellRange,
          values: [[participantData[item.key] || '']]
        });
      });

      // バッチ更新
      await gapi.client.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          valueInputOption: 'RAW',
          data: updates
        }
      });

      setMessage(`${selectedName}さんの情報を更新しました！`);
    } catch (error) {
      console.error('データ保存エラー:', error);
      setMessage('データの保存に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <User className="mx-auto h-12 w-12 text-blue-600 mb-4" />
            <h1 className="text-2xl font-bold text-gray-800">鼓笛合宿参加申込</h1>
            <p className="text-gray-600 mt-2">Googleアカウントでサインインしてください</p>
          </div>
          
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? 'サインイン中...' : 'Googleでサインイン'}
          </button>
          
          {message && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-700 text-sm">{message}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center mb-8">
            <Calendar className="mx-auto h-12 w-12 text-blue-600 mb-4" />
            <h1 className="text-3xl font-bold text-gray-800">鼓笛合宿参加申込フォーム</h1>
            <p className="text-gray-600 mt-2">参加項目と食事を選択してください</p>
          </div>

          {/* 名前選択 */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              参加者名
            </label>
            <select
              value={selectedName}
              onChange={(e) => handleNameSelect(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">参加者を選択してください</option>
              {participants.map((participant, index) => (
                <option key={index} value={participant.name}>
                  {participant.ban}班 - {participant.name} ({participant.grade})
                </option>
              ))}
            </select>
          </div>

          {selectedName && (
            <div className="space-y-8">
              {/* 参加項目 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  参加項目
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {participationItems.map((item) => (
                    <div key={item.key} className="flex items-center space-x-3">
                      <label className="flex-1 text-sm text-gray-700">{item.label}</label>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleInputChange(item.key, '〇')}
                          className={`px-3 py-1 rounded text-sm ${
                            participantData[item.key] === '〇'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          〇
                        </button>
                        <button
                          onClick={() => handleInputChange(item.key, '✖')}
                          className={`px-3 py-1 rounded text-sm ${
                            participantData[item.key] === '✖'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          ✖
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 食事項目 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <Utensils className="h-5 w-5 mr-2" />
                  食事項目
                </h2>
                <div className="space-y-4">
                  {mealItems.map((item) => (
                    <div key={item.key} className="flex items-center space-x-3">
                      <label className="flex-1 text-sm text-gray-700">{item.label}</label>
                      <select
                        value={participantData[item.key] || ''}
                        onChange={(e) => handleInputChange(item.key, e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">選択してください</option>
                        {mealSizes.map((size) => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* 送信ボタン */}
              <div className="flex justify-center">
                <button
                  onClick={handleSubmit}
                  disabled={loading || !selectedName}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-semibold"
                >
                  {loading ? '保存中...' : '申込内容を保存'}
                </button>
              </div>
            </div>
          )}

          {message && (
            <div className={`mt-6 p-4 rounded-lg ${
              message.includes('更新しました') 
                ? 'bg-green-100 border border-green-300' 
                : 'bg-yellow-100 border border-yellow-300'
            }`}>
              <p className={`text-sm ${
                message.includes('更新しました') 
                  ? 'text-green-700' 
                  : 'text-yellow-700'
              }`}>
                {message}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KotekiForm;