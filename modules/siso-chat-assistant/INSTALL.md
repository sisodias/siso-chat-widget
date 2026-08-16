# Installing the SISO chat assistant module

This is the host-install contract for a React 18+ Cloudflare Pages site. The
module owns the branded widget boundary, message normalization, provider
routing, UI-message streaming, and safe fallback semantics. The host owns its
logo, prompt, route, client facts, and provider secret binding.

The maintained fork is [`sisodias/siso-chat-widget`](https://github.com/sisodias/siso-chat-widget),
branch [`siso-module`](https://github.com/sisodias/siso-chat-widget/tree/siso-module).
Vendor `modules/siso-chat-assistant` from that ref or copy it into the host
repository alongside the host adapter.

## 1. Mount the host adapter

```jsx
import { ChatAssistantWidget } from './modules/siso-chat-assistant/react/ChatAssistantWidget.jsx'
import './modules/siso-chat-assistant/react/chat-assistant.css'

<ChatAssistantWidget
  endpoint="/api/chat"
  brandName="Client name"
  logoSrc="/images/client-logo.png"
  theme={{ panelWidth: '400px' }}
/>
```

Keep client-specific facts in the host's Pages Function:

```js
import { createChatHandler } from './modules/siso-chat-assistant/server/chat-handler.js'

export const onRequest = createChatHandler({
  systemPrompt: 'Only answer from this client-approved brief...',
  fallbackReply: () => 'Please contact the team for help.',
})
```

The handler accepts both AI SDK UI messages (`parts`) and ordinary text
messages (`content`) and normalizes them before the model call.

## 2. Configure the provider at the edge

```bash
npx wrangler pages secret put GROQ_API_KEY --project-name <client-pages-project>
```

The key is server-only. Never place it in `VITE_*`, browser code, GitHub files,
or checked-in environment files. `GROQ_MODEL` defaults to
`openai/gpt-oss-20b`; set a host-specific non-secret model variable only after
checking the provider's current model availability.

Verify the host without exposing the key:

```bash
curl -fsS https://<client-domain>/api/chat/health
```

Then submit a harmless UI-message or text-message request and verify the SSE
response has the provider header and text deltas. If the provider is absent,
the handler deliberately returns the host's grounded curated fallback.

## 3. Host release checklist

- [ ] Host logo, brand name, panel width, prompt, and grounded fallback supplied.
- [ ] Same-origin `/api/chat` and `/api/chat/health` routes mounted.
- [ ] Provider secret configured only on the intended Pages project.
- [ ] UI-message and ordinary `content` message smokes pass.
- [ ] Public route, mobile panel, attribution removal, and console-error checks pass.
