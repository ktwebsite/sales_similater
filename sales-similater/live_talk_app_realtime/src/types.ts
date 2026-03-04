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

import {
  GoogleGenAIOptions,
  LiveClientToolResponse,
  LiveServerMessage,
  Part,
} from "@google/genai";

/**
 * the options to initiate the client, ensure apiKey is required
 */
export type LiveClientOptions = GoogleGenAIOptions & { apiKey: string };

/** log types */
export type StreamingLog = {
  date: Date;
  type: string;
  count?: number;
  message:
    | string
    | ClientContentLog
    | Omit<LiveServerMessage, "text" | "data">
    | LiveClientToolResponse;
};

export type ClientContentLog = {
  turns: Part[];
  turnComplete: boolean;
};

/** session evaluation types */
export interface TranscriptionEntry {
  id: string;
  timestamp: Date;
  type: "input" | "output";
  text: string;
}

export interface SessionData {
  transcriptions: TranscriptionEntry[];
  duration: number;
  messageCount: number;
  startTime?: Date;
  endTime?: Date;
}

export interface ConversationLogEntry {
  role: "user" | "model";
  text: string;
  timestamp?: string;
}

export interface SessionEvaluation {
  sentiment: {
    overall: "positive" | "neutral" | "negative";
    score: number; // -1.0 to 1.0
    keywords: string[];
  };
  engagement: {
    level: "high" | "medium" | "low";
    score: number; // 0 to 1
  };
  topics: string[];
  suggestions: string[];
  summary: string;
  conversationLog: ConversationLogEntry[];
  totalScore: number; // 総合スコア (0-100)
}
