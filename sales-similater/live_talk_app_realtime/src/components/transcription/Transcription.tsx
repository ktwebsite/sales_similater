/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useEffect, useState, useRef } from "react";
import "./transcription.scss";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import {
  evaluateSession,
  calculateSessionDuration,
} from "../../lib/evaluation-service";
import { TranscriptionEntry, SessionData, SessionEvaluation } from "../../types";
import EvaluationModal from "../evaluation-modal/EvaluationModal";

export default function Transcription() {
  const { client, connected } = useLiveAPIContext();
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<SessionEvaluation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // バッファ用のref
  const inputBufferRef = useRef<string>("");
  const outputBufferRef = useRef<string>("");

  // connect時に会話履歴を自動クリア（新しいセッション開始）
  useEffect(() => {
    if (connected) {
      setTranscriptions([]);
      setEvaluationResult(null);
    }
  }, [connected]);

  useEffect(() => {
    const onInputTranscription = (text: string) => {
      // バッファに追加のみ（即座に表示しない）
      inputBufferRef.current += text;
    };

    const onOutputTranscription = (text: string) => {
      // バッファに追加のみ（即座に表示しない）
      outputBufferRef.current += text;
    };

    const onTurnComplete = () => {
      // 入力バッファに内容があれば表示
      if (inputBufferRef.current.trim()) {
        const entry: TranscriptionEntry = {
          id: `${Date.now()}-${Math.random()}-input`,
          timestamp: new Date(),
          type: "input",
          text: inputBufferRef.current,
        };
        setTranscriptions((prev) => [...prev, entry]);
        inputBufferRef.current = "";
      }

      // 出力バッファに内容があれば表示
      if (outputBufferRef.current.trim()) {
        const entry: TranscriptionEntry = {
          id: `${Date.now()}-${Math.random()}-output`,
          timestamp: new Date(),
          type: "output",
          text: outputBufferRef.current,
        };
        setTranscriptions((prev) => [...prev, entry]);
        outputBufferRef.current = "";
      }
    };

    client.on("inputTranscription", onInputTranscription);
    client.on("outputTranscription", onOutputTranscription);
    client.on("turncomplete", onTurnComplete);

    return () => {
      client.off("inputTranscription", onInputTranscription);
      client.off("outputTranscription", onOutputTranscription);
      client.off("turncomplete", onTurnComplete);
    };
  }, [client]);

  // 自動スクロール
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptions]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // 評価ボタンのハンドラー
  const handleEvaluate = async () => {
    if (transcriptions.length === 0) {
      alert("評価する会話がありません");
      return;
    }

    setIsEvaluating(true);
    try {
      const duration = calculateSessionDuration(transcriptions);
      const sessionData: SessionData = {
        transcriptions,
        duration,
        messageCount: transcriptions.length,
        startTime: transcriptions[0]?.timestamp,
        endTime: transcriptions[transcriptions.length - 1]?.timestamp,
      };

      const evaluation = await evaluateSession(sessionData);
      setEvaluationResult(evaluation);
      setIsModalOpen(true);
    } catch (error) {
      console.error("評価に失敗:", error);
      alert(
        `評価に失敗しました: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsEvaluating(false);
    }
  };

  // クリアボタンのハンドラー
  const handleClear = () => {
    if (window.confirm("会話履歴をクリアしますか？")) {
      setTranscriptions([]);
      setEvaluationResult(null);
    }
  };

  return (
    <>
      <div className="transcription-container">
        <div className="transcription-header">
          <h3>文字起こし</h3>
          <div className="header-actions">
            <button
              className="evaluate-button"
              onClick={handleEvaluate}
              disabled={
                isEvaluating || transcriptions.length === 0 || connected
              }
              title={
                connected
                  ? "セッション終了後に評価できます"
                  : isEvaluating
                  ? "評価中..."
                  : "会話を評価"
              }
            >
              {isEvaluating ? "⏳" : "📊"}
            </button>
            <button
              className="clear-button"
              onClick={handleClear}
              disabled={transcriptions.length === 0}
              title="クリア"
            >
              🗑️
            </button>
          </div>
        </div>
      <div className="transcription-content" ref={scrollRef}>
        {transcriptions.length === 0 ? (
          <div className="transcription-empty">
            文字起こしが表示されます
          </div>
        ) : (
          transcriptions.map((entry) => (
            <div
              key={entry.id}
              className={`transcription-entry ${entry.type}`}
            >
              <div className="transcription-meta">
                <span className="transcription-type">
                  {entry.type === "input" ? "入力" : "出力"}
                </span>
                <span className="transcription-time">
                  {formatTime(entry.timestamp)}
                </span>
              </div>
              <div className="transcription-text">{entry.text}</div>
            </div>
          ))
        )}
      </div>
      </div>

      <EvaluationModal
        evaluation={evaluationResult}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
