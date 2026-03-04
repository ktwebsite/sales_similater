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

import { GoogleGenAI } from "@google/genai";
import { SessionData, SessionEvaluation, LiveClientOptions } from "../types";
import { getApiConfig } from "./api-config";

/**
 * スコアリングルール設定
 * 将来的に評価項目を追加する場合は、この配列に新しいルールを追加する
 */
interface ScoringRule {
  key: keyof Pick<SessionEvaluation, "sentiment" | "engagement">;
  weight: number; // 重み（合計を1.0にする）
  normalize: (value: any) => number; // 0-100に正規化する関数
}

const SCORING_RULES: ScoringRule[] = [
  {
    key: "sentiment",
    weight: 0.5,
    normalize: (sentiment) => ((sentiment.score + 1) / 2) * 100, // -1.0〜1.0 → 0〜100
  },
  {
    key: "engagement",
    weight: 0.5,
    normalize: (engagement) => engagement.score * 100, // 0.0〜1.0 → 0〜100
  },
];

/**
 * 総合スコアを計算（0-100）
 */
function calculateTotalScore(evaluation: SessionEvaluation): number {
  let totalScore = 0;
  let totalWeight = 0;

  for (const rule of SCORING_RULES) {
    const value = evaluation[rule.key];
    const normalizedScore = rule.normalize(value);
    totalScore += normalizedScore * rule.weight;
    totalWeight += rule.weight;
  }

  // 加重平均を計算
  const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
  // 0-100の範囲に収める
  return Math.round(Math.max(0, Math.min(100, finalScore)));
}

/**
 * セッションデータを評価し、感情分析やエンゲージメントスコアを生成
 */
export async function evaluateSession(
  sessionData: SessionData
): Promise<SessionEvaluation> {
  if (sessionData.transcriptions.length === 0) {
    throw new Error("No transcriptions to evaluate");
  }

  // Fetch API key from server
  const config = await getApiConfig();
  const options: LiveClientOptions = { apiKey: config.apiKey };
  const genai = new GoogleGenAI(options);

  // 会話ログを作成
  const conversationLog = sessionData.transcriptions.map((t) => ({
    role: t.type === "input" ? "user" as const : "model" as const,
    text: t.text,
    timestamp: new Date(t.timestamp).toLocaleTimeString("ja-JP"),
  }));

  // 会話内容を整形
  const conversationText = sessionData.transcriptions
    .map((t) => {
      const speaker = t.type === "input" ? "ユーザー" : "AI";
      const time = new Date(t.timestamp).toLocaleTimeString("ja-JP");
      return `[${time}] ${speaker}: ${t.text}`;
    })
    .join("\n");

  const prompt = `
以下の会話を詳細に分析し、JSON形式で評価してください。

【会話内容】
${conversationText}

【会話の統計】
- メッセージ数: ${sessionData.messageCount}
- 会話時間: ${Math.floor(sessionData.duration / 60)}分${sessionData.duration % 60}秒

【評価項目】
以下の形式で正確にJSON形式で返してください。

{
  "sentiment": {
    "overall": "positive" | "neutral" | "negative",
    "score": -1.0から1.0の間の数値,
    "keywords": ["キーワード1", "キーワード2", ...]
  },
  "engagement": {
    "level": "high" | "medium" | "low",
    "score": 0から1の間の数値
  },
  "topics": ["トピック1", "トピック2", ...],
  "suggestions": ["改善提案1", "改善提案2", ...],
  "summary": "会話全体の要約（2-3文）"
}

【評価基準】
- sentiment.overall: 会話全体のポジティブ/ネガティブ/中立な雰囲気
- sentiment.score: より細かい感情スコア（-1: 非常にネガティブ、0: 中立、1: 非常にポジティブ）
- sentiment.keywords: 感情を示す重要なキーワード
- engagement.level: ユーザーの積極性（high: 活発、medium: 普通、low: 受動的）
- engagement.score: より詳細なエンゲージメントレベル
- topics: 会話の主要トピック（3-5個）
- suggestions: コミュニケーション改善のための具体的な提案（2-3個）
- summary: 会話全体の簡潔な要約

必ず有効なJSONのみを返してください。
`;

  try {
    // シンプルにテキスト生成を使用
    const result = await genai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [{ text: prompt }],
      }],
    });

    let text = "";
    if (result.candidates && result.candidates.length > 0) {
      const candidate = result.candidates[0];
      if (candidate.content && candidate.content.parts) {
        text = candidate.content.parts
          .map((part: any) => part.text || "")
          .join("");
      }
    }

    if (!text) {
      throw new Error("No response from API");
    }

    // JSONを抽出（マークダウンコードブロックに囲まれている可能性がある）
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    // JSONをパース
    const evaluation: SessionEvaluation = JSON.parse(jsonMatch[0]);

    // 基本的な検証
    if (!evaluation.sentiment || !evaluation.engagement) {
      throw new Error("Invalid evaluation format");
    }

    // 会話ログを追加
    evaluation.conversationLog = conversationLog;

    // 総合スコアを計算
    evaluation.totalScore = calculateTotalScore(evaluation);

    return evaluation;
  } catch (error) {
    console.error("Error evaluating session:", error);
    throw new Error(
      `評価の生成に失敗しました: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * セッションの継続時間を計算（秒単位）
 */
export function calculateSessionDuration(
  transcriptions: { timestamp: Date }[]
): number {
  if (transcriptions.length === 0) return 0;

  const timestamps = transcriptions.map((t) => new Date(t.timestamp).getTime());
  const start = Math.min(...timestamps);
  const end = Math.max(...timestamps);

  return Math.floor((end - start) / 1000);
}
