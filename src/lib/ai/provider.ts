import { getEnv } from '@/lib/env';

export interface ModelRequest {
  system: string;
  user: string;
  /** Included in the prompt so the model knows the exact shape expected. */
  jsonSchema?: unknown;
  maxTokens?: number;
  temperature?: number;
}

export interface ModelResponse {
  text: string;
  model: string;
}

/**
 * Minimal OpenAI-compatible chat-completions client.
 *
 * Deliberately not a framework. One function, one timeout, one error type.
 * Any provider that speaks the same protocol works (OpenAI, Groq, Together,
 * a local llama.cpp server, an Azure-compatible gateway).
 */
export async function callModel(request: ModelRequest): Promise<ModelResponse> {
  const env = getEnv();
  if (!env.aiEnabled) {
    throw new Error('AI is not configured (AI_API_KEY is empty).');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

  const user = request.jsonSchema
    ? `${request.user}\n\nReturn JSON matching this schema exactly:\n${JSON.stringify(request.jsonSchema)}`
    : request.user;

  try {
    const response = await fetch(`${env.AI_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        temperature: request.temperature ?? 0,
        max_tokens: request.maxTokens ?? 700,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Model returned ${response.status}: ${body.slice(0, 300)}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
    };

    const text = json.choices?.[0]?.message?.content;
    if (!text) throw new Error('Model returned an empty message.');

    return { text, model: json.model ?? env.AI_MODEL };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Model timed out after ${env.AI_TIMEOUT_MS}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
