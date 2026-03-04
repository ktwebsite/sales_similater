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

import { SessionEvaluation } from "../../types";
import "./evaluation-modal.scss";
import { useState, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";

export interface EvaluationModalProps {
  evaluation: SessionEvaluation | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EvaluationModal({
  evaluation,
  isOpen,
  onClose,
}: EvaluationModalProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [savingToKintone, setSavingToKintone] = useState(false);
  const [kintoneMessage, setKintoneMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const { user } = useAuth();

  const handleCopyReport = useCallback(() => {
    if (!evaluation) return;

    // 現在日時をフォーマット
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    // レポートテキストを生成
    const report = `【実施日時】${dateStr}
【総合スコア】${evaluation.totalScore}点
【感情分析】${evaluation.sentiment.overall}
【積極性】${evaluation.engagement.level}

■ 会話の要約
${evaluation.summary}

■ 改善提案
${evaluation.suggestions.map(s => `・${s}`).join("\n")}

■ 会話ログ
${evaluation.conversationLog.map(entry => `[${entry.timestamp || ""}] ${entry.role === "user" ? "User" : "AI"}: ${entry.text}`).join("\n")}`;

    // クリップボードにコピー
    navigator.clipboard.writeText(report).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  }, [evaluation]);

  const handleSaveToKintone = useCallback(async () => {
    if (!evaluation || !user) return;

    setSavingToKintone(true);
    setKintoneMessage(null);

    try {
      // Firebase IDトークンを取得
      const idToken = await user.getIdToken(true);

      // 現在日時をフォーマット
      const now = new Date();
      const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      // レポートテキストを生成
      const report = `【実施日時】${dateStr}
【総合スコア】${evaluation.totalScore}点
【感情分析】${evaluation.sentiment.overall}
【積極性】${evaluation.engagement.level}

■ 会話の要約
${evaluation.summary}

■ 改善提案
${evaluation.suggestions.map(s => `・${s}`).join("\n")}

■ 会話ログ
${evaluation.conversationLog.map(entry => `[${entry.timestamp || ""}] ${entry.role === "user" ? "User" : "AI"}: ${entry.text}`).join("\n")}`;

      // バックエンドAPIに送信
      const response = await fetch('/api/save-kintone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken,
          score: evaluation.totalScore,
          report
        })
      });

      const data = await response.json();

      if (response.ok) {
        setKintoneMessage({ type: 'success', text: 'Kintoneへの保存が完了しました！' });
        setTimeout(() => setKintoneMessage(null), 3000);
      } else {
        console.error('Kintone API エラー詳細:', data);
        throw new Error(data.details ? `${data.error}: ${JSON.stringify(data.details)}` : data.error || 'Kintoneへの保存に失敗しました');
      }
    } catch (error: any) {
      console.error('Kintone保存エラー:', error);
      setKintoneMessage({ 
        type: 'error', 
        text: error.message || 'Kintoneへの保存に失敗しました' 
      });
      setTimeout(() => setKintoneMessage(null), 5000);
    } finally {
      setSavingToKintone(false);
    }
  }, [evaluation, user]);

  if (!isOpen || !evaluation) return null;

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "😊";
      case "negative":
        return "😞";
      default:
        return "😐";
    }
  };

  const getEngagementEmoji = (level: string) => {
    switch (level) {
      case "high":
        return "🔥";
      case "low":
        return "💤";
      default:
        return "👍";
    }
  };

  const getSentimentLabel = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "ポジティブ";
      case "negative":
        return "ネガティブ";
      default:
        return "中立";
    }
  };

  const getEngagementLabel = (level: string) => {
    switch (level) {
      case "high":
        return "高い";
      case "low":
        return "低い";
      default:
        return "普通";
    }
  };

  return (
    <div className="evaluation-modal-overlay" onClick={onClose}>
      <div
        className="evaluation-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="evaluation-modal-header">
          <h2>📊 セッション評価</h2>
          <div className="header-right">
            <span className="score-badge">
              Score: {evaluation.totalScore}
            </span>
            <button className="close-button" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="evaluation-modal-body">
          {/* 感情分析 */}
          <section className="evaluation-section">
            <h3>
              {getSentimentEmoji(evaluation.sentiment.overall)} 感情分析
            </h3>
            <div className="evaluation-item">
              <div className="label-row">
                <span className="label">全体的な雰囲気</span>
                <span className="value">
                  {getSentimentLabel(evaluation.sentiment.overall)}
                </span>
              </div>
              <div className="score-bar">
                <div
                  className={`score-fill sentiment-${evaluation.sentiment.overall}`}
                  style={{
                    width: `${((evaluation.sentiment.score + 1) / 2) * 100}%`,
                  }}
                />
              </div>
              <div className="score-labels">
                <span>ネガティブ</span>
                <span>ポジティブ</span>
              </div>
            </div>
            {evaluation.sentiment.keywords.length > 0 && (
              <div className="keywords">
                <span className="keywords-label">キーワード:</span>
                {evaluation.sentiment.keywords.map((keyword, idx) => (
                  <span key={idx} className="keyword-tag">
                    {keyword}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* エンゲージメント */}
          <section className="evaluation-section">
            <h3>
              {getEngagementEmoji(evaluation.engagement.level)} エンゲージメント
            </h3>
            <div className="evaluation-item">
              <div className="label-row">
                <span className="label">積極性レベル</span>
                <span className="value">
                  {getEngagementLabel(evaluation.engagement.level)}
                </span>
              </div>
              <div className="score-bar">
                <div
                  className={`score-fill engagement-${evaluation.engagement.level}`}
                  style={{ width: `${evaluation.engagement.score * 100}%` }}
                />
              </div>
            </div>
          </section>

          {/* トピック */}
          {evaluation.topics.length > 0 && (
            <section className="evaluation-section">
              <h3>💡 会話のトピック</h3>
              <ul className="topic-list">
                {evaluation.topics.map((topic, idx) => (
                  <li key={idx}>{topic}</li>
                ))}
              </ul>
            </section>
          )}

          {/* 改善提案 */}
          {evaluation.suggestions.length > 0 && (
            <section className="evaluation-section">
              <h3>📈 改善提案</h3>
              <ul className="suggestion-list">
                {evaluation.suggestions.map((suggestion, idx) => (
                  <li key={idx}>{suggestion}</li>
                ))}
              </ul>
            </section>
          )}

          {/* 要約 */}
          <section className="evaluation-section summary">
            <h3>📝 会話の要約</h3>
            <p>{evaluation.summary}</p>
          </section>

          {/* 会話ログ */}
          {evaluation.conversationLog && evaluation.conversationLog.length > 0 && (
            <section className="evaluation-section conversation-log">
              <h3>💬 会話ログ</h3>
              <div className="conversation-log-container">
                {evaluation.conversationLog.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`conversation-entry ${entry.role === "user" ? "user-entry" : "model-entry"}`}
                  >
                    <div className="entry-header">
                      <span className="entry-role">
                        {entry.role === "user" ? "👤 ユーザー" : "🤖 AI"}
                      </span>
                      {entry.timestamp && (
                        <span className="entry-timestamp">{entry.timestamp}</span>
                      )}
                    </div>
                    <div className="entry-text">{entry.text}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="evaluation-modal-footer">
          {kintoneMessage && (
            <div className={`kintone-message ${kintoneMessage.type}`}>
              {kintoneMessage.type === 'success' ? '✅' : '❌'} {kintoneMessage.text}
            </div>
          )}
          <div className="button-group">
            <button
              className="copy-button"
              onClick={handleCopyReport}
              disabled={copySuccess}
            >
              {copySuccess ? "✅ コピーしました" : "📋 レポートをコピー"}
            </button>
            {user && (
              <button
                className="kintone-button"
                onClick={handleSaveToKintone}
                disabled={savingToKintone}
              >
                {savingToKintone ? "⏳ 保存中..." : "☁️ Kintoneへ保存"}
              </button>
            )}
            <button className="primary-button" onClick={onClose}>
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
