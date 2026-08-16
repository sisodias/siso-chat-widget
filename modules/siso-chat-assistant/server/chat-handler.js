import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

const MAX_MESSAGES = 16
const MAX_REQUEST_BYTES = 160_000
const FALLBACK_TEXT_ID = 'siso-chat-fallback-text'

/**
 * Creates the same-origin handler used by a host's Pages Function.
 * Provider credentials are read only from the edge environment.
 */
export function createChatHandler({
  systemPrompt,
  fallbackReply,
  emptyReply = 'Tell me what you would like help with.',
  unavailableReply = 'The assistant is temporarily unavailable. Please try again or use the contact page instead.',
  modeHeader = 'X-SISO-Chat-Mode',
  providerHeader = 'X-SISO-Chat-Provider',
}) {
  return async function onRequest({ request, env = {} }) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: RESPONSE_HEADERS })
    }

    if (request.method !== 'POST') {
      return json({ error: 'method not allowed' }, 405)
    }

    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > MAX_REQUEST_BYTES) {
      return json({ error: 'message payload is too large' }, 413)
    }

    let body
    try {
      body = await request.json()
    } catch {
      return json({ error: 'invalid message payload' }, 400)
    }

    const messages = normalizeMessages(body?.messages)
    if (messages.length === 0) {
      return fallbackResponse(emptyReply, modeHeader)
    }

    const provider = getProvider(env)
    if (!provider) {
      return fallbackResponse(fallbackReply(messages), modeHeader)
    }

    try {
      const modelMessages = await convertToModelMessages(messages)
      const result = streamText({
        model: provider.model,
        system: systemPrompt,
        messages: modelMessages,
        maxOutputTokens: 500,
        temperature: 0.2,
        maxRetries: 1,
        onError: () => {},
      })

      return result.toUIMessageStreamResponse({
        headers: {
          ...RESPONSE_HEADERS,
          [providerHeader]: provider.name,
        },
        onError: () => unavailableReply,
      })
    } catch {
      return fallbackResponse(unavailableReply, modeHeader)
    }
  }
}

/**
 * A secret-free health handler for module receipts and deployment probes.
 */
export function createChatHealthHandler({ moduleId = 'chat-assistant' } = {}) {
  return function onRequest({ env = {} }) {
    const provider = getProviderName(env)
    return json({
      status: 'ok',
      module: moduleId,
      provider: provider || 'curated-fallback',
    })
  }
}

export function getProviderName(env = {}) {
  return getProvider(env)?.name || null
}

function getProvider(env) {
  if (env.GROQ_API_KEY) {
    const groq = createOpenAI({
      apiKey: env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
    return {
      name: 'groq',
      model: groq(env.GROQ_MODEL || 'openai/gpt-oss-20b'),
    }
  }

  if (env.XAI_API_KEY) {
    const xai = createOpenAI({
      apiKey: env.XAI_API_KEY,
      baseURL: 'https://api.x.ai/v1',
    })
    return {
      name: 'xai',
      model: xai(env.XAI_MODEL || 'grok-4.5'),
    }
  }

  if (env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY })
    return {
      name: 'openai',
      model: openai(env.OPENAI_MODEL || 'gpt-4o-mini'),
    }
  }

  return null
}

function normalizeMessages(value) {
  if (!Array.isArray(value)) return []

  return value
    .filter((message) => message && ['user', 'assistant', 'system'].includes(message.role))
    .slice(-MAX_MESSAGES)
    .map((message) => {
      const parts = Array.isArray(message.parts)
        ? message.parts.map((part) => {
            if (part?.type !== 'text' || typeof part.text !== 'string') return part
            return { ...part, text: part.text.slice(0, 6000) }
          })
        : typeof message.content === 'string'
          ? [{ type: 'text', text: message.content.slice(0, 6000) }]
          : []
      return { ...message, parts }
    })
    .filter((message) => message.parts.some((part) => part?.type === 'text' && part.text.trim()))
}

function fallbackResponse(text, modeHeader) {
  const stream = createUIMessageStream({
    execute({ writer }) {
      const messageId = crypto.randomUUID()
      writer.write({ type: 'start', messageId })
      writer.write({ type: 'text-start', id: FALLBACK_TEXT_ID })
      writer.write({ type: 'text-delta', id: FALLBACK_TEXT_ID, delta: text })
      writer.write({ type: 'text-end', id: FALLBACK_TEXT_ID })
      writer.write({ type: 'finish', finishReason: 'stop' })
    },
  })

  return createUIMessageStreamResponse({
    stream,
    headers: { ...RESPONSE_HEADERS, [modeHeader]: 'curated-fallback' },
  })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...RESPONSE_HEADERS, 'Content-Type': 'application/json' },
  })
}

const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}
