import { useState, useEffect } from "react";

export function SettingsView() {
  const [apiKey, setApiKeyState] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!window.electronAPI) { setLoading(false); return; }
    window.electronAPI.getApiKey().then((key) => {
      if (key) setApiKeyState(key);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    await window.electronAPI?.setApiKey(apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return null;

  return (
    <div className="settings-view">
      <h2>設定</h2>

      <div className="settings-section">
        <h3>Anthropic API キー</h3>
        <p className="settings-desc">
          キーは OS の認証情報ストアで暗号化されて保存されます。
          変更後はアプリを再起動してください。
        </p>
        <div className="settings-row">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKeyState(e.target.value)}
            placeholder="sk-ant-..."
            className="api-key-input"
          />
          <button onClick={handleSave} className="btn-save" disabled={!apiKey}>
            {saved ? "保存しました" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
