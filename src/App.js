// src/App.js
import MyComponent from './kotekitai-app'; // 拡張子 .js は省略
import './App.css'; // デフォルトのスタイルを保持（必要に応じて）

function App() {
  return (
    <div className="App"> {/* スタイルを適用する場合 */}
      <MyComponent />
    </div>
  );
}

export default App;