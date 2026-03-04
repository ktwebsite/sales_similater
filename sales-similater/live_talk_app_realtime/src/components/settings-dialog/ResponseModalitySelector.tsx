import { useCallback, useEffect } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { Modality } from "@google/genai";

export default function ResponseModalitySelector() {
  const { config, setConfig } = useLiveAPIContext();

  const updateConfig = useCallback(() => {
    const newConfig: any = {
      responseModalities: [Modality.AUDIO],
    };
    
    if (config.systemInstruction) {
      newConfig.systemInstruction = config.systemInstruction;
    }
    
    if (config.speechConfig) {
      newConfig.speechConfig = config.speechConfig;
    }
    
    // realtimeInputConfigを保持（重要！）
    if (config.realtimeInputConfig) {
      newConfig.realtimeInputConfig = config.realtimeInputConfig;
    }
    
    // 文字起こしを常に有効化
    newConfig.inputAudioTranscription = {
      languageCode: "ja-JP",
    };
    newConfig.outputAudioTranscription = {
      languageCode: "ja-JP",
    };
    
    setConfig(newConfig);
  }, [config.systemInstruction, config.speechConfig, config.realtimeInputConfig, setConfig]);

  useEffect(() => {
    updateConfig();
  }, [updateConfig]);

  return (
    <div className="select-group">
    </div>
  );
}
