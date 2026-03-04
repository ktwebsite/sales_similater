import { useRef, useState, useEffect } from "react";
import { LiveAPIProvider } from "../contexts/LiveAPIContext";
import SidePanel from "./side-panel/SidePanel";
import { Altair } from "./altair/Altair";
import ControlTray from "./control-tray/ControlTray";
import Transcription from "./transcription/Transcription";
import cn from "classnames";
import { LiveClientOptions } from "../types";
import { getApiConfig } from "../lib/api-config";

export default function MainApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [apiOptions, setApiOptions] = useState<LiveClientOptions | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 認証後にAPI設定を取得
  useEffect(() => {
    getApiConfig()
      .then(config => {
        setApiOptions({ apiKey: config.apiKey });
      })
      .catch(err => {
        console.error('Failed to load API configuration:', err);
        setError('API設定の取得に失敗しました。ページを再読み込みしてください。');
      });
  }, []);

  // API設定読み込み中
  if (!apiOptions && !error) {
    return (
      <div className="App" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'var(--Neutral-15)',
        color: 'white'
      }}>
        <div>API設定を読み込み中...</div>
      </div>
    );
  }

  // API設定読み込みエラー
  if (error) {
    return (
      <div className="App" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'var(--Neutral-15)',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ color: '#ff4600' }}>{error}</div>
        <button 
          onClick={() => window.location.reload()} 
          style={{
            padding: '0.75rem 1.5rem',
            background: '#1f94ff',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div className="App">
      <LiveAPIProvider options={apiOptions!}>
        <div className="streaming-console">
          <SidePanel />
          <main>
            <div className="main-app-area">
              <Altair />
              <Transcription />
              <video
                className={cn("stream", {
                  hidden: !videoRef.current || !videoStream,
                })}
                ref={videoRef}
                autoPlay
                playsInline
              />
            </div>

            <ControlTray
              videoRef={videoRef}
              supportsVideo={true}
              onVideoStreamChange={setVideoStream}
              enableEditingSettings={true}
            >
              {/* put your own buttons here */}
            </ControlTray>
          </main>
        </div>
      </LiveAPIProvider>
    </div>
  );
}
