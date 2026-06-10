import { Match } from '../types';

export interface ScoreSyncResult {
  scoreA: number | null;
  scoreB: number | null;
  status: 'finished' | 'scheduled' | 'postponed';
  winner: string | null;
  summary: string;
}

/**
 * Calls Gemini or DeepSeek API to extract and parse match score from search results context.
 */
export async function callLLMToSyncScore(
  match: Match,
  searchContext: string,
  provider: 'gemini' | 'deepseek',
  apiKey: string,
  model?: string
): Promise<ScoreSyncResult> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API Key is missing. Please configure it in Settings.');
  }

  const prompt = `You are an expert sports analyst and score compiler.
Your task is to parse the provided search results to find the final score of the 2026 FIFA World Cup match: ${match.teamA} vs ${match.teamB}.

Search Results Context:
${searchContext}

Based on this context, output a JSON object strictly matching this schema:
{
  "status": "finished" | "scheduled" | "postponed",
  "scoreA": number | null,
  "scoreB": number | null,
  "winner": string | null,
  "summary": "A brief 1-2 sentence recap of the game or status"
}

Notes:
- "scoreA" must represent the score for "${match.teamA}" (Home/Team A).
- "scoreB" must represent the score for "${match.teamB}" (Away/Team B).
- If the match has not played yet, is currently live, or is scheduled in the future, return status: "scheduled", scoreA: null, scoreB: null, winner: null.
- If the match has finished, return status: "finished" and the actual final scores.
- Return ONLY the raw JSON object. Do not wrap in markdown code blocks like \`\`\`json or include any conversational text.`;

  if (provider === 'gemini') {
    return callGemini(apiKey, prompt, model || 'gemini-2.5-flash');
  } else {
    return callDeepSeek(apiKey, prompt, model || 'deepseek-chat');
  }
}

/**
 * Helper to call Gemini API.
 */
async function callGemini(apiKey: string, prompt: string, model: string): Promise<ScoreSyncResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json'
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (Status ${response.status}): ${errorText}`);
  }

  const json = await response.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini API returned an empty response.');
  }

  return parseLLMJsonResult(text);
}

/**
 * Helper to call DeepSeek API.
 */
async function callDeepSeek(apiKey: string, prompt: string, model: string): Promise<ScoreSyncResult> {
  const url = 'https://api.deepseek.com/v1/chat/completions';

  const body = {
    model,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    response_format: {
      type: 'json_object'
    },
    temperature: 0.1
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error (Status ${response.status}): ${errorText}`);
  }

  const json = await response.json();
  const text = json.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('DeepSeek API returned an empty response.');
  }

  return parseLLMJsonResult(text);
}

/**
 * Parses and validates the JSON string returned from the LLM.
 */
function parseLLMJsonResult(rawText: string): ScoreSyncResult {
  let text = rawText.trim();
  // Strip markdown formatting if the model ignored instructions and wrapped it
  if (text.startsWith('```')) {
    text = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  }

  try {
    const parsed = JSON.parse(text);
    
    // Normalize and validate output
    const scoreA = typeof parsed.scoreA === 'number' ? parsed.scoreA : null;
    const scoreB = typeof parsed.scoreB === 'number' ? parsed.scoreB : null;
    
    let status: 'finished' | 'scheduled' | 'postponed' = 'scheduled';
    if (parsed.status === 'finished' || parsed.status === 'postponed') {
      status = parsed.status;
    }

    return {
      scoreA,
      scoreB,
      status,
      winner: parsed.winner || null,
      summary: parsed.summary || 'Score sync completed.'
    };
  } catch (e) {
    console.error('Failed to parse LLM JSON output. Raw text was:', rawText);
    throw new Error(`Failed to parse LLM response as JSON: ${(e as Error).message}`);
  }
}
