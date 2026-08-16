# SISO chat assistant module

This is the reusable module boundary for the chat capability selected from
`Open-Chat-Widget/openchatwidget`. The maintained SISO fork is
[`sisodias/siso-chat-widget`](https://github.com/sisodias/siso-chat-widget),
branch `siso-module`; this module is published under that branch in
`modules/siso-chat-assistant/`. It is intentionally host-first: a client host
owns the route, brand, prompt/context, endpoint and secret binding; the donor
package supplies only the streaming composer and message renderer.

## What is reusable

- `react/ChatAssistantWidget.jsx` — React 18+ host adapter with a small brand
  and endpoint contract.
- `react/chat-assistant.css` — scoped responsive styling. It hides donor
  attribution, uses the host logo, and keeps desktop width configurable.
- `server/chat-handler.js` — Cloudflare Pages-compatible handler factory with
  Groq-first provider routing, xAI/OpenAI secondary routing, message limits,
  UI-message streaming, a no-key fallback, and a health probe.
- `module-manifest.json` — SISO module-core contract; no secrets or client data.
- `upstream-manifest.json` — donor pin, licence and reviewed local delta.

## Host integration

```jsx
import { ChatAssistantWidget } from './modules/siso-chat-assistant/react/ChatAssistantWidget.jsx'

<ChatAssistantWidget
  endpoint="/api/chat"
  brandName="Client name"
  logoSrc="/images/client-logo.png"
  theme={{
    cocoa: '#2b2522',
    bark: '#171413',
    sand: '#eee8e2',
    panelWidth: '400px',
  }}
/>
```

The host's Pages Function owns the business prompt and fallback content:

```js
import { createChatHandler } from './modules/siso-chat-assistant/server/chat-handler.js'

export const onRequest = createChatHandler({
  systemPrompt: 'Only answer from this client-approved brief...',
  fallbackReply: () => 'The team can help you through the contact page.',
})
```

Set provider secrets only on the edge runtime, never in `VITE_*` variables or
browser code:

```sh
wrangler pages secret put GROQ_API_KEY --project-name <pages-project>
```

`GROQ_MODEL` defaults to `openai/gpt-oss-20b`. Without a provider secret,
the handler deliberately returns its host-supplied curated fallback and marks
the response `X-SISO-Chat-Mode: curated-fallback`; that is demo mode, not an AI
response.

## Current host

MelanoTresses consumes this module through
`src/modules/chat/MelanoChatWidget.jsx`. That file contains only Melano's
brand values and grounded business prompt. A BYKONZ host can use the same
adapter with its own logo, tokens, endpoint and event-focused prompt without
copying the Melano content or donor shell.

The donor is tracked as a pinned MIT dependency in `upstream-manifest.json`.
The fork keeps the upstream package intact and adds the SISO module boundary;
the module itself does not contain client secrets or MelanoTresses facts.
