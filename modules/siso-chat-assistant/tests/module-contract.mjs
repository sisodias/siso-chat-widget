import assert from 'node:assert/strict'
import { createChatHandler, createChatHealthHandler } from '../server/chat-handler.js'

const chat = createChatHandler({
  systemPrompt: 'Answer only from the test brief.',
  fallbackReply: () => 'Test fallback response.',
})

const response = await chat({
  request: new Request('https://example.test/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', parts: [{ type: 'text', text: 'Hello' }] }],
    }),
  }),
  env: {},
})

assert.equal(response.status, 200)
assert.equal(response.headers.get('x-siso-chat-mode'), 'curated-fallback')
assert.match(await response.text(), /Test fallback response\./)

let normalisedContent = false
const contentChat = createChatHandler({
  systemPrompt: 'Answer only from the test brief.',
  fallbackReply: (messages) => {
    normalisedContent = messages[0]?.parts?.[0]?.text === 'Hello from content.'
    return 'Content fallback response.'
  },
})
const contentResponse = await contentChat({
  request: new Request('https://example.test/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello from content.' }] }),
  }),
  env: {},
})
assert.equal(contentResponse.status, 200)
assert.equal(normalisedContent, true)

const health = createChatHealthHandler({ moduleId: 'chat-assistant-test' })
const healthResponse = await health({
  request: new Request('https://example.test/api/chat/health'),
  env: {},
})

assert.equal(healthResponse.status, 200)
assert.deepEqual(await healthResponse.json(), {
  status: 'ok',
  module: 'chat-assistant-test',
  provider: 'curated-fallback',
})

console.log('siso-chat-assistant module contract: PASS')
