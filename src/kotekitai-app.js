import React, { useState, useEffect } from 'react';
import { User, Calendar, Utensils, Moon, Sun, LogIn, LogOut } from 'lucide-react';

const KotekitaiApp = () => {
  const [formData, setFormData] = useState({
    name: '',
    班: '',
    土曜午前: false,
    土曜午後: false,
    日曜午前: false,
    日曜午後: false,
    青年部: false,
    宿泊: false,
    土曜昼食: '',
    土曜おやつ: '',
    土曜夕食: '',
    日曜朝食: '',
    日曜昼食: '',
    日曜おやつ: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const 班選択肢 = Array.from({length: 10}, (_, i) => `${i + 1}班`);
  const 食事サイズ = ['', '極小', '小', '中', '大', '特大'];

  const CLIENT_ID = '19219457522-l73ijhd0n3fqj0fh7j7qm54081qepjdg.apps.googleusercontent.com';
  const API_KEY = 'AIzaSyCRHMlDhGB7iHnbSY7wwePKBYdMwfIHnqU';
  const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
  const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
  const SPREADSHEET_ID = '1nYHpdW5LY2NRmXQr-Ab2mN7copCylb4NYSR_-PjoIFs';

  let tokenClient = null;
  let gapiInited = false;
  let gisInited = false;

  useEffect(() => {
    const initializeAPIs = async () => {
      const waitForAPIs = () => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('API読み込みがタイムアウトしました'));
          }, 10000);
          const checkAPIs = () => {
            if (window.gapi && window.google && window.gapiReady && window.gisReady) {
              clearTimeout(timeout);
              resolve();
            } else {
              setTimeout(checkAPIs, 100);
            }
          };
          checkAPIs();
        });
      };

      try {
        await waitForAPIs();
        await window.gapi.load('client', async () => {
          await window.gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
          });
          gapiInited = true;
          tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: async (resp) => {
              if (resp.error !== undefined) {
                console.error('認証エラー:', resp);
                setSubmitStatus('auth_error');
                return;
              }
              try {
                const userInfo = await window.gapi.client.request({
                  path: 'https://www.googleapis.com/oauth2/v2/userinfo',
                });
                setUserEmail(userInfo.result.email);
                setIsSignedIn(true);
              } catch (error) {
                console.error('ユーザー情報取得エラー:', error);
                setSubmitStatus('auth_error');
              }
            },
          });
          gisInited = true;
          setIsLoading(false);
        });
      } catch (error) {
        console.error('API初期化エラー:', error);
        setIsLoading(false);
        setSubmitStatus('error');
      }
    };
    initializeAPIs();
  }, []);

  const handleSignIn = () => {
    if (!gapiInited || !gisInited) {
      console.error('APIが初期化されていません');
      setSubmitStatus('auth_error');
      return;
    }
    tokenClient.requestAccessToken({ prompt: window.gapi.client.getToken() === null ? 'consent' : '' });
  };

  const handleSignOut = () => {
    const token = window.gapi.client.getToken();
    if (token !== null) {
      window.google.accounts.oauth2.revoke(token.access_token);
      window.gapi.client.setToken('');
      setUserEmail('');
      setIsSignedIn(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.班) {
      setSubmitStatus('validation_error');
      return;
    }
    if (!isSignedIn) {
      setSubmitStatus('auth_error');
      return;
    }
    setIsSubmitting(true);
    setSubmitStatus('');

    try {
      const now = new Date();
      const timestamp = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
      const values = [
        timestamp,
        formData.name,
        formData.班,
        formData.土曜午前 ? '○' : '',
        formData.土曜午後 ? '○' : '',
        formData.日曜午前 ? '○' : '',
        formData.日曜午後 ? '○' : '',
        formData.青年部 ? '○' : '',
        formData.宿泊 ? '○' : '',
        formData.土曜昼食 || '',
        formData.土曜おやつ || '',
        formData.土曜夕食 || '',
        formData.日曜朝食 || '',
        formData.日曜昼食 || '',
        formData.日曜おやつ || '',
        userEmail
      ];

      const response = await window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'シート1!A:P',
        valueInputOption: 'RAW',
        resource: { values: [values] }
      });

      if (response.status === 200) {
        setSubmitStatus('success');
        setFormData({
          name: '',
          班: '',
          土曜午前: false,
          土曜午後: false,
          日曜午前: false,
          日曜午後: false,
          青年部: false,
          宿泊: false,
          土曜昼食: '',
          土曜おやつ: '',
          土曜夕食: '',
          日曜朝食: '',
          日曜昼食: '',
          日曜おやつ: ''
        });
      } else {
        throw new Error(`送信に失敗しました: ${response.status}`);
      }
    } catch (error) {
      console.error('送信エラー:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              🥁 鼓笛合宿 参加申込
            </h1>
            <p className="text-gray-600">
              参加項目と食事の希望を選択してください
            </p>
          </div>

          {/* 認証状態表示 */}
          <div className="mb-6 p-4 rounded-lg bg-gray-50 border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isSignedIn ? (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">
                      サインイン中: {userEmail}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">
                      Googleアカウントでサインインが必要です
                    </span>
                  </>
                )}
              </div>
              
              {isSignedIn ? (
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  <LogOut size={14} />
                  <span>サインアウト</span>
                </button>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  <LogIn size={14} />
                  <span>サインイン</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* 基本情報 */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <User className="mr-2" size={20} />
                基本情報
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    お名前 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!isSignedIn}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    班 *
                  </label>
                  <select
                    value={formData.班}
                    onChange={(e) => handleInputChange('班', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!isSignedIn}
                    required
                  >
                    <option value="">選択してください</option>
                    {班選択肢.map(班 => (
                      <option key={班} value={班}>{班}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 参加項目 */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Calendar className="mr-2" size={20} />
                参加項目
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: '土曜午前', label: '土曜午前', icon: <Sun size={16} /> },
                  { key: '土曜午後', label: '土曜午後', icon: <Sun size={16} /> },
                  { key: '日曜午前', label: '日曜午前', icon: <Sun size={16} /> },
                  { key: '日曜午後', label: '日曜午後', icon: <Sun size={16} /> },
                  { key: '青年部', label: '青年部', icon: <User size={16} /> },
                  { key: '宿泊', label: '宿泊', icon: <Moon size={16} /> }
                ].map(item => (
                  <div key={item.key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={item.key}
                      checked={formData[item.key]}
                      onChange={(e) => handleInputChange(item.key, e.target.checked)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={!isSignedIn}
                    />
                    <label htmlFor={item.key} className="flex items-center text-sm text-gray-700">
                      {item.icon}
                      <span className="ml-1">{item.label}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* 食事項目 */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Utensils className="mr-2" size={20} />
                食事の希望
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: '土曜昼食', label: '土曜昼食 🍚' },
                  { key: '土曜おやつ', label: '土曜おやつ 🍰' },
                  { key: '土曜夕食', label: '土曜夕食 🍚' },
                  { key: '日曜朝食', label: '日曜朝食 🍚' },
                  { key: '日曜昼食', label: '日曜昼食 🍚' },
                  { key: '日曜おやつ', label: '日曜おやつ 🍰' }
                ].map(item => (
                  <div key={item.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {item.label}
                    </label>
                    <select
                      value={formData[item.key]}
                      onChange={(e) => handleInputChange(item.key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!isSignedIn}
                    >
                      {食事サイズ.map(size => (
                        <option key={size} value={size}>
                          {size || '希望なし'}
                        </option>
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
                disabled={isSubmitting || !isSignedIn}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>送信中...</span>
                  </>
                ) : (
                  <span>申込を送信</span>
                )}
              </button>
            </div>

            {/* 送信状況表示 */}
            {submitStatus === 'validation_error' && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded text-center">
                お名前と班を入力してください。
              </div>
            )}
            {submitStatus === 'auth_error' && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-center">
                Googleアカウントでサインインしてください。
              </div>
            )}
            {submitStatus === 'success' && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded text-center">
                申込を受け付けました！
              </div>
            )}
            {submitStatus === 'error' && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-center">
                送信中にエラーが発生しました。再度お試しください。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KotekitaiApp;