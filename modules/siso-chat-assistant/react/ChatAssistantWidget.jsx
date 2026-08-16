import { OpenChatWidget } from '@openchatwidget/sdk'
import './chat-assistant.css'

const DEFAULT_ENDPOINT = '/api/chat'

/**
 * Client-neutral SISO host adapter around the Open Chat Widget donor.
 *
 * The host owns the endpoint, brand, logo and theme. The donor only supplies
 * the streaming composer and message rendering mechanics; it never receives a
 * provider key and its global shell does not leak outside this boundary.
 */
export function ChatAssistantWidget({
  endpoint = DEFAULT_ENDPOINT,
  brandName = 'Assistant',
  logoSrc = '',
  ariaLabel = `${brandName} chat assistant`,
  theme = {},
  disableReasoning = true,
  className = '',
}) {
  const cssVariables = {
    '--siso-chat-cocoa': theme.cocoa || '#4d2e10',
    '--siso-chat-bark': theme.bark || '#522700',
    '--siso-chat-sand': theme.sand || '#ede1d4',
    '--siso-chat-paper': theme.paper || '#fffdf9',
    '--siso-chat-panel-width': theme.panelWidth || '400px',
    '--siso-chat-brand-name': JSON.stringify(brandName),
    '--siso-chat-logo': logoSrc
      ? `url("${logoSrc}") center / contain no-repeat`
      : 'none',
  }

  return (
    <div
      className={`siso-chat-assistant ${className}`.trim()}
      data-module="siso-chat-assistant"
      aria-label={ariaLabel}
      style={cssVariables}
    >
      <OpenChatWidget url={endpoint} disableReasoning={disableReasoning} />
    </div>
  )
}

export default ChatAssistantWidget
