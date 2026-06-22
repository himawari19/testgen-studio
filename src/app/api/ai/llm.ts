import { loadKeys } from '../keys/store';

export async function callLLM(
  provider: string,
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  jsonMode: boolean = false,
  maxTokens: number = 2048,
  usageOut?: { totalTokens?: number }
): Promise<string> {
  const p = provider.toLowerCase().trim();
  const effectiveKey = (p === '9router' && !apiKey) ? '9router-local-key' : apiKey;
  if (!effectiveKey && p !== '9router-public') {
    throw new Error(`API key for provider ${p} is empty`);
  }

  // 1. Google Gemini
  if (p === 'google') {
    const resolvedModel = model || 'gemini-3.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${effectiveKey}`;
    const fullPrompt = `System Prompt:\n${systemPrompt}\n\nUser Prompt:\n${userPrompt}`;

    const payload: any = {
      contents: [
        {
          parts: [{ text: fullPrompt }]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: maxTokens
      }
    };
    if (jsonMode) {
      payload.generationConfig.responseMimeType = 'application/json';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const respText = await response.text();
    if (!response.ok) {
      throw new Error(`Gemini API error (status ${response.status}): ${respText}`);
    }

    const data = JSON.parse(respText);
    if (usageOut && data.usageMetadata) {
      usageOut.totalTokens = data.usageMetadata.totalTokenCount;
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return text.trim();
    throw new Error(`No text returned in Gemini response: ${respText}`);
  }

  // 2. Anthropic Claude
  if (p === 'anthropic') {
    const resolvedModel = model || 'claude-haiku-4-5';
    const url = 'https://api.anthropic.com/v1/messages';

    let sysPrompt = systemPrompt;
    if (jsonMode) {
      sysPrompt += ' You MUST output only valid JSON, no markdown, no commentary.';
    }

    const payload = {
      model: resolvedModel,
      max_tokens: maxTokens,
      system: sysPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: 0.3
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': effectiveKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    const respText = await response.text();
    if (!response.ok) {
      throw new Error(`Anthropic API error (status ${response.status}): ${respText}`);
    }

    const data = JSON.parse(respText);
    if (usageOut && data.usage) {
      usageOut.totalTokens = (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0);
    }
    const text = data.content?.[0]?.text;
    if (text) return text.trim();
    throw new Error(`No text returned in Claude response: ${respText}`);
  }

  // 3. OpenAI Compatible
  let baseURL = '';
  let resolvedModel = model;
  switch (p) {
    case 'openai':
      baseURL = 'https://api.openai.com/v1/chat/completions';
      if (!resolvedModel) resolvedModel = 'gpt-5.4-mini';
      break;
    case '9router':
      baseURL = 'http://127.0.0.1:20128/v1/chat/completions';
      if (!resolvedModel) throw new Error('A specific model/combo must be provided for 9Router');
      break;
    case '9router-public':
      baseURL = `${(loadKeys().urls?.['9router-public'] || process.env.NINE_ROUTER_PUBLIC_URL || '').replace(/\/v1\/?$/, '').replace(/\/$/, '')}/v1/chat/completions`;
      if (baseURL === '/v1/chat/completions') throw new Error('NINE_ROUTER_PUBLIC_URL is not configured');
      if (!resolvedModel) throw new Error('A specific model must be provided for 9Router');
      break;
    case 'groq':
      baseURL = 'https://api.groq.com/openai/v1/chat/completions';
      if (!resolvedModel) resolvedModel = 'llama-3.3-70b-versatile';
      break;
    case 'deepseek':
      baseURL = 'https://api.deepseek.com/v1/chat/completions';
      if (!resolvedModel) resolvedModel = 'deepseek-chat';
      break;
    case 'moonshot':
      baseURL = 'https://api.moonshot.cn/v1/chat/completions';
      if (!resolvedModel) resolvedModel = 'kimi-k2.6';
      break;
    case 'alibaba':
      baseURL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
      if (!resolvedModel) resolvedModel = 'qwen3.6-flash';
      break;
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }

  const payload: any = {
    model: resolvedModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: maxTokens,
    stream: false
  };
  if (jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (effectiveKey) headers.Authorization = `Bearer ${effectiveKey}`;

  const response = await fetch(baseURL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const respText = await response.text();
  if (!response.ok) {
    throw new Error(`${provider} API error (status ${response.status}): ${respText}`);
  }

  const data = JSON.parse(respText);
  if (usageOut && data.usage) {
    usageOut.totalTokens = data.usage.total_tokens;
  }
  const text = data.choices?.[0]?.message?.content;
  if (text) return text.trim();
  throw new Error(`No choices returned in ${provider} response: ${respText}`);
}
