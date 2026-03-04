import { useCallback, useEffect } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";

export default function VoiceSelector() {
  const { config, setConfig } = useLiveAPIContext();

  const updateConfig = useCallback(() => {
    setConfig({
      ...config,
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Aoede",
          },
        },
      },
    });
  }, [config, setConfig]);

  useEffect(() => {
    updateConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="select-group">
    </div>
  );
}
