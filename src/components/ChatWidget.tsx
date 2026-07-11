import { KNOWLEDGE_BASE_CHUNKS, type KnowledgeChunk } from '../data/knowledgeBase'
import { useChatLogic, type Message } from '../lib/useChatLogic'
import { parseMarkdown } from '../lib/markdown'

export interface ChatWidgetProps {
  knowledgeBase?: KnowledgeChunk[]
  botName?: string
  welcomeMessage?: string
  demoMode?: boolean
}

export default function ChatWidget({
  knowledgeBase = KNOWLEDGE_BASE_CHUNKS,
  botName = 'RAG AI Assistant',
  welcomeMessage,
  demoMode = true
}: ChatWidgetProps) {
  const {
    isOpen,
    setIsOpen,
    showSettings,
    setShowSettings,
    hasNewMessage,
    messages,
    inputValue,
    setInputValue,
    isStreaming,
    apiKey,
    setApiKey,
    model,
    setModel,
    temperature,
    setTemperature,
    dbStatus,
    dbError,
    embeddingsDb,
    getSuggestionChips,
    initializeVectorDb,
    getApiKey,
    handleSaveSettings,
    handleStopStream,
    handleSendMessage,
    messagesEndRef,
    textareaRef
  } = useChatLogic({
    knowledgeBase,
    botName,
    welcomeMessage,
    demoMode
  })

  // Helper to render RAG retrieval details
  const renderRAGDetails = (docs: Message['retrievedDocs']) => {
    if (!docs || docs.length === 0) return null
    return (
      <details className="self-end max-w-[82%] -mt-2.5 mb-1.5 text-[0.72rem] text-gray-500 border border-black/5 bg-black/[0.015] rounded-md p-1 px-2 cursor-pointer box-border">
        <summary className="outline-none font-medium select-none">🔍 Vector RAG Retrieval Log ({docs.length} matches)</summary>
        <div className="mt-1.5 flex flex-col gap-1.5 border-t border-dashed border-black/10 pt-1.5">
          {docs.map((doc, idx) => (
            <div key={doc.id} className="flex flex-col gap-0.5">
              <div className="flex justify-between font-semibold text-indigo-600">
                <strong>Rank #{idx + 1}</strong>: {doc.pageTitle} page
                <span className="bg-indigo-600/10 text-indigo-600 py-0.5 px-1 rounded text-[0.65rem]">Match: {doc.score}%</span>
              </div>
              <p className="m-0 text-gray-600 italic text-[0.7rem] leading-[1.3]">"{doc.text.slice(0, 100)}..."</p>
            </div>
          ))}
        </div>
      </details>
    )
  }

  // Render database connection badge
  const renderDbBadge = () => {
    if (demoMode) {
      return <span className="text-[0.65rem] py-0.5 px-1.5 rounded font-semibold max-w-fit mt-1 border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">RAG DB Ready (Demo Mode)</span>
    }
    switch (dbStatus) {
      case 'ready':
        return <span className="text-[0.65rem] py-0.5 px-1.5 rounded font-semibold max-w-fit mt-1 border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">RAG DB Ready ({embeddingsDb.length} nodes)</span>
      case 'loading':
        return <span className="text-[0.65rem] py-0.5 px-1.5 rounded font-semibold max-w-fit mt-1 border bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse">Initializing RAG Vectors...</span>
      case 'error':
        return <span className="text-[0.65rem] py-0.5 px-1.5 rounded font-semibold max-w-fit mt-1 border bg-red-500/10 text-red-500 border-red-500/20" title={dbError}>RAG DB Setup Failed ⚠️</span>
      default:
        return <span className="text-[0.65rem] py-0.5 px-1.5 rounded font-semibold max-w-fit mt-1 border bg-gray-500/10 text-gray-500 border-gray-500/20">RAG DB Pending Key</span>
    }
  }

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 text-white flex items-center justify-center border-none cursor-pointer shadow-[0_4px_20px_rgba(79,70,229,0.35)] transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] hover:scale-110 hover:rotate-5 hover:shadow-[0_6px_24px_rgba(79,70,229,0.5)] active:scale-95 z-[1000]"
        onClick={() => setIsOpen(!isOpen)}
        title="Chat with AI"
        aria-label="Toggle chat widget"
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" className="w-[26px] h-[26px] fill-current">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-[26px] h-[26px] fill-current">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
          </svg>
        )}
        {hasNewMessage && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full animate-pulse" />}
      </button>

      {/* Sidebar Chat Box */}
      <div
        className={`fixed z-[1001] flex flex-col overflow-hidden bg-white/82 backdrop-blur-2xl shadow-[0_12px_48px_rgba(0,0,0,0.15)] border border-black/8 rounded-[20px] 
          max-[480px]:bottom-0 max-[480px]:right-0 max-[480px]:w-full max-[480px]:h-full max-[480px]:max-h-full max-[480px]:rounded-none max-[480px]:border-none
          transition-all duration-[350ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]
          bottom-24 right-6 w-[380px] h-[600px] max-h-[calc(100vh-140px)]
          ${isOpen
            ? 'opacity-100 pointer-events-auto translate-y-0 scale-100 max-[480px]:translate-y-0'
            : 'opacity-0 pointer-events-none translate-y-[30px] scale-[0.95] max-[480px]:translate-y-[100%] max-[480px]:scale-100 max-[480px]:opacity-100'
          }`}
      >
        {/* Chat Header */}
        <div className="p-4 px-5 border-b border-black/6 flex justify-between items-center bg-white/50">
          <div className="flex flex-col">
            <h3 className="text-[0.95rem] font-bold text-gray-800 m-0 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block" /> {botName}
            </h3>
            {renderDbBadge()}
          </div>

          <div className="flex gap-1.5">
            <button
              className="bg-transparent border-none text-gray-600 cursor-pointer p-1.5 rounded-md flex items-center justify-center transition-all duration-200 hover:bg-black/5 hover:text-gray-900"
              onClick={() => setShowSettings(true)}
              title="Chat Settings / Rebuild Index"
              aria-label="Chat Settings"
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path
                  fill="currentColor"
                  d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
                />
              </svg>
            </button>
            <button
              className="bg-transparent border-none text-gray-600 cursor-pointer p-1.5 rounded-md flex items-center justify-center transition-all duration-200 hover:bg-black/5 hover:text-gray-900"
              onClick={() => setIsOpen(false)}
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Suggestion Chips */}
        {messages.length === 1 && !isStreaming && (
          <div className="flex flex-wrap gap-2 p-3 px-5 pb-0">
            {getSuggestionChips().map((chip, idx) => (
              <button
                key={idx}
                className="bg-white border border-black/8 rounded-xl py-1.5 px-3 text-[0.78rem] text-gray-600 cursor-pointer transition-all duration-200 shadow-[0_2px_6px_rgba(0,0,0,0.02)] hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-600/2 hover:-translate-y-0.5"
                onClick={() => handleSendMessage(chip)}
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col">
              <div className={`flex max-w-[82%] flex-col gap-1 ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
                <div
                  className={`p-3 px-4 rounded-2xl text-[0.88rem] leading-[1.45] break-words ${msg.role === 'user'
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-sm shadow-[0_4px_12px_rgba(79,70,229,0.15)]'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm border border-black/3'
                    }`}
                >
                  {msg.content ? (
                    parseMarkdown(msg.content, msg.role === 'user')
                  ) : (
                    <div className="flex gap-1 items-center h-[18px]">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full inline-block animate-bounce" style={{ animationDelay: '-0.32s' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full inline-block animate-bounce" style={{ animationDelay: '-0.16s' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full inline-block animate-bounce" />
                    </div>
                  )}
                </div>
                <span className={`text-[0.68rem] text-gray-400 mt-0.5 ${msg.role === 'user' ? 'self-end mr-1' : 'self-start ml-1'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {/* Show retrieved documents under user's prompt to demonstrate RAG */}
              {msg.role === 'user' && renderRAGDetails(msg.retrievedDocs)}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Stop Stream Button */}
        {isStreaming && (
          <button
            className="flex items-center gap-1.5 bg-red-500/8 border border-red-500/15 rounded-lg py-1.5 px-3 text-[0.75rem] font-semibold text-red-500 cursor-pointer self-center mb-2 transition-all duration-200 hover:bg-red-500/15"
            onClick={handleStopStream}
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
              <path d="M6 19h12V5H6v14z" />
            </svg>
            Stop generating
          </button>
        )}

        {/* Chat Input */}
        <div className="p-4 px-5 border-t border-black/6 flex gap-2.5 items-end bg-white/50">
          <div className="flex gap-2.5 w-full items-end">
            <textarea
              ref={textareaRef}
              className="flex-1 border border-black/8 rounded-xl py-2.5 px-3.5 text-[0.88rem] resize-none outline-none max-h-[120px] h-10 leading-[1.4] bg-white text-gray-800 transition-all duration-200 focus:border-indigo-600 focus:shadow-[0_0_0_3px_rgba(79,70,229,0.1)]"
              placeholder={dbStatus === 'ready' ? "Ask anything (Cross-page RAG active)..." : "Enter API key to unlock RAG..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(inputValue)
                }
              }}
              disabled={isStreaming}
              rows={1}
            />
            <button
              className="w-10 h-10 rounded-xl bg-indigo-600 text-white border-none cursor-pointer flex items-center justify-center transition-all duration-200 shrink-0 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:transform-none"
              onClick={() => handleSendMessage(inputValue)}
              disabled={isStreaming || !inputValue.trim()}
              aria-label="Send message"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Settings Panel Overlay */}
        {showSettings && (
          <div className="absolute top-0 left-0 w-full h-full bg-white/95 backdrop-blur-md z-[1005] flex flex-col p-6 box-border animate-[fade-in_0.25s_ease-out]">
            <div className="flex justify-between items-center mb-5">
              <h4 className="text-base font-bold text-gray-800 m-0">RAG Engine Settings</h4>
              <button
                className="bg-transparent border-none text-gray-600 cursor-pointer p-1.5 rounded-md flex items-center justify-center transition-all duration-200 hover:bg-black/5 hover:text-gray-900"
                onClick={() => setShowSettings(false)}
                aria-label="Close settings"
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="flex flex-col gap-4 overflow-y-auto pr-1">
              <div className="flex flex-col gap-1.5">
                <label className="block text-[0.72rem] font-bold text-gray-500 uppercase tracking-wider mb-1" htmlFor="setting-api-key">OpenAI API Key</label>
                <input
                  id="setting-api-key"
                  type="password"
                  className="w-full border border-black/8 rounded-lg p-2.5 text-[0.88rem] bg-white text-gray-800 outline-none transition-all duration-200 focus:border-indigo-600 focus:shadow-[0_0_0_3px_rgba(79,70,229,0.1)]"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <span className="block text-[0.68rem] text-gray-400 mt-1">
                  Required to generate embeddings and run vector searches. Saved locally in browser.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="block text-[0.72rem] font-bold text-gray-500 uppercase tracking-wider mb-1" htmlFor="setting-model">Completions Model</label>
                <select
                  id="setting-model"
                  className="w-full border border-black/8 rounded-lg p-2.5 text-[0.88rem] bg-white text-gray-800 outline-none transition-all duration-200 focus:border-indigo-600 focus:shadow-[0_0_0_3px_rgba(79,70,229,0.1)]"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  <option value="gpt-5-nano">gpt-5-nano (Default)</option>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="block text-[0.72rem] font-bold text-gray-500 uppercase tracking-wider mb-1" htmlFor="setting-temp">Temperature ({temperature})</label>
                <input
                  id="setting-temp"
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.1"
                  className="w-full border border-black/8 rounded-lg p-2.5 text-[0.88rem] bg-white text-gray-800 outline-none transition-all duration-200 focus:border-indigo-600 focus:shadow-[0_0_0_3px_rgba(79,70,229,0.1)]"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                />
              </div>

              <div className="mt-2.5 p-3 border border-black/6 rounded-lg bg-black/[0.015]">
                <span className="block text-[0.8rem] font-semibold text-gray-700 mb-1">Vector Database Actions:</span>
                <button
                  type="button"
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-3 text-[0.8rem] rounded-lg cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => initializeVectorDb(true)}
                  disabled={!getApiKey()}
                >
                  Force Rebuild Embedding Vectors
                </button>
              </div>

              <button type="submit" className="mt-5 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold cursor-pointer transition-all duration-200 shadow-[0_4px_12px_rgba(79,70,229,0.2)] hover:-translate-y-0.5 active:translate-y-0">
                Save & Close
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  )
}
