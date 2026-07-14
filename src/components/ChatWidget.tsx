import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { KNOWLEDGE_BASE_CHUNKS } from '../data/knowledgeBase'
import './ChatWidget.css'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  retrievedDocs?: Array<{
    id: string
    pageTitle: string
    score: number
    text: string
  }>
}

interface CachedEmbedding {
  id: string
  vector: number[]
}

export default function ChatWidget() {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false)

  // Settings state (loads from localStorage or env default)
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('openai_api_key') || ''
  })
  const [model, setModel] = useState(() => {
    return localStorage.getItem('openai_model') || 'gpt-5-nano'
  })
  const [temperature, setTemperature] = useState(() => {
    const saved = localStorage.getItem('openai_temp')
    return saved ? parseFloat(saved) : 0.7
  })

  // RAG / Vector DB states
  const [dbStatus, setDbStatus] = useState<'pending' | 'loading' | 'ready' | 'error'>('pending')
  const [dbError, setDbError] = useState('')
  const [embeddingsDb, setEmbeddingsDb] = useState<CachedEmbedding[]>([])

  // Chat conversation state
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Map route to user-friendly page context name
  const getPageContext = () => {
    switch (location.pathname) {
      case '/':
        return 'Artificial Intelligence'
      case '/about':
        return 'Robotics'
      case '/services':
        return 'Quantum Computing'
      case '/contact':
        return 'Space Exploration'
      default:
        return 'General'
    }
  }

  const pageContext = getPageContext()

  // Suggestion chips based on active page
  const getSuggestionChips = () => {
    switch (location.pathname) {
      case '/':
        return [
          'What is generative AI?',
          'Explain Neural Networks in simple terms.',
          'What are the main ethical concerns of AI?'
        ]
      case '/about':
        return [
          'What is the difference between automation and robotics?',
          'How do robots use sensors to perceive environment?',
          'Tell me about humanoid robot developments.'
        ]
      case '/services':
        return [
          'What is a qubit and superposition?',
          'How does quantum computing break encryption?',
          'What industries will quantum computing affect most?'
        ]
      case '/contact':
        return [
          'What are some planned Mars missions?',
          'Why is space exploration beneficial for Earth?',
          'What are the key goals of Artemis program?'
        ]
      default:
        return [
          'What can you do?',
          'Explain the topics on this website.',
          'Tell me a science joke.'
        ]
    }
  }

  // --- RAG / VECTOR DB LOGIC ---

  // Get active key from localStorage or project env
  const getApiKey = () => {
    return apiKey || (import.meta.env.VITE_OPENAI_API_KEY as string) || ''
  }

  // Function to compute cosine similarity (dot product since OpenAI vectors are normalized)
  const calculateCosineSimilarity = (vecA: number[], vecB: number[]) => {
    if (vecA.length !== vecB.length) return 0
    let dotProduct = 0
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i]
    }
    return dotProduct
  }

  // Generate vector embedding for a single text (uses text-embedding-3-small)
  const fetchEmbedding = async (text: string, key: string): Promise<number[]> => {
    const url = key ? 'https://api.openai.com/v1/embeddings' : '/api/embeddings'
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (key) {
      headers['Authorization'] = `Bearer ${key}`
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `Embedding API HTTP ${res.status}`)
    }

    const json = await res.json()
    // For direct OpenAI API response it is json.data[0].embedding.
    // Our proxy returns the exact same payload.
    return json.data[0].embedding
  }

  // Fetch embeddings in batch for all database chunks
  const fetchBatchEmbeddings = async (texts: string[], key: string): Promise<number[][]> => {
    const url = key ? 'https://api.openai.com/v1/embeddings' : '/api/embeddings'
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (key) {
      headers['Authorization'] = `Bearer ${key}`
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `Embedding Batch API HTTP ${res.status}`)
    }

    const json = await res.json()
    return json.data.map((item: any) => item.embedding)
  }

  // Initialize/build vector database
  const initializeVectorDb = async (forceRebuild = false) => {
    const key = getApiKey()

    setDbStatus('loading')
    setDbError('')

    try {
      const cacheKey = `rag_embeddings_db`
      const cached = localStorage.getItem(cacheKey)

      if (cached && !forceRebuild) {
        const parsed = JSON.parse(cached)
        // Verify cache length matches current chunk count
        if (parsed.length === KNOWLEDGE_BASE_CHUNKS.length) {
          setEmbeddingsDb(parsed)
          setDbStatus('ready')
          return
        }
      }

      // Fetch batch embeddings (will run directly if key is configured, or route to /api/embeddings proxy)
      const textsToEmbed = KNOWLEDGE_BASE_CHUNKS.map((c) => c.text)
      const vectors = await fetchBatchEmbeddings(textsToEmbed, key)

      const newDb: CachedEmbedding[] = KNOWLEDGE_BASE_CHUNKS.map((chunk, idx) => ({
        id: chunk.id,
        vector: vectors[idx]
      }))

      localStorage.setItem(cacheKey, JSON.stringify(newDb))
      setEmbeddingsDb(newDb)
      setDbStatus('ready')
    } catch (err: any) {
      console.error('Failed to build vector DB:', err)

      // If we don't have a local key AND the proxy fails (e.g. running locally without Vercel API routes),
      // we gracefully fall back to 'pending' to prompt the developer for a key.
      if (!key) {
        setDbStatus('pending')
      } else {
        setDbError(err.message || 'Error creating embeddings')
        setDbStatus('error')
      }
    }
  }

  // Trigger vector DB initialization on mount or key/settings change
  useEffect(() => {
    initializeVectorDb()
  }, [apiKey])

  // --- CHAT CONVERSATION FLOW ---

  // Reset conversation with welcome message on route change
  useEffect(() => {
    const context = getPageContext()
    const welcomeMsg: Message = {
      id: 'welcome-' + location.pathname,
      role: 'assistant',
      content: `Hello! I am your RAG-powered AI assistant.

I have loaded a semantic search index of the **entire website** (12 paragraphs across all 4 pages). 

You can ask me questions about **${context}**, or test the RAG capability by asking about any other topic (e.g. asking about *Qubits* while on the *Robotics* page). I will search for and retrieve the most relevant sections in real time!`,
      timestamp: new Date()
    }

    setMessages([welcomeMsg])

    if (!isOpen && messages.length > 0) {
      setHasNewMessage(true)
    }
  }, [location.pathname])

  // Scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Clear badge
  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false)
    }
  }, [isOpen])

  // Toggle 'chat-open' class on body to shift page layout
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('chat-open')
    } else {
      document.body.classList.remove('chat-open')
    }
    return () => {
      document.body.classList.remove('chat-open')
    }
  }, [isOpen])

  // Auto-resize input textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [inputValue])

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem('openai_api_key', apiKey)
    localStorage.setItem('openai_model', model)
    localStorage.setItem('openai_temp', temperature.toString())
    setShowSettings(false)
    // Force rebuild on settings change to make sure the key works
    initializeVectorDb(true)
  }

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsStreaming(false)
    }
  }

  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim()
    if (!trimmed || isStreaming) return

    setInputValue('')

    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: trimmed,
      timestamp: new Date()
    }

    const assistantMessageId = Math.random().toString(36).substring(7)
    const assistantMessagePlaceholder: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMessage, assistantMessagePlaceholder])
    setIsStreaming(true)

    const keyToUse = getApiKey()

    // If no key is set locally, AND we don't have a ready RAG vector database (e.g. proxy is offline or not configured)
    if (!keyToUse && dbStatus !== 'ready') {
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                ...msg,
                content: `⚠️ **OpenAI API Key is missing.** 
                  
To activate the RAG engine and chat with the AI, configure your OpenAI API Key by clicking the **Settings Gear Icon** at the top right of this sidebar. Get a key from the [OpenAI Platform](https://platform.openai.com/).`
              }
              : msg
          )
        )
        setIsStreaming(false)
      }, 600)
      return
    }

    let retrievedDocs: Message['retrievedDocs'] = []
    let promptContext = ''

    try {
      // 1. RAG PHASE - Semantic Search Vector Retrieval
      if (dbStatus === 'ready' && embeddingsDb.length > 0) {
        // Fetch embedding for the user's query
        const queryVector = await fetchEmbedding(trimmed, keyToUse)

        // Calculate similarity scores against all database chunks
        const scoredChunks = KNOWLEDGE_BASE_CHUNKS.map((chunk) => {
          const cached = embeddingsDb.find((e) => e.id === chunk.id)
          const score = cached ? calculateCosineSimilarity(queryVector, cached.vector) : 0
          return { ...chunk, score }
        })

        // Sort by score and grab top 3
        const sorted = scoredChunks
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)

        retrievedDocs = sorted.map((chunk) => ({
          id: chunk.id,
          pageTitle: chunk.pageTitle,
          score: Math.round(chunk.score * 100), // convert similarity to %
          text: chunk.text
        }))

        // Format chunks into prompt text context
        promptContext = retrievedDocs
          .map((doc, idx) => `[Document ${idx + 1}] Source page: ${doc.pageTitle}\nContent: ${doc.text}`)
          .join('\n\n')

        // Guardrail: Intercept off-topic questions client-side to save OpenAI tokens
        const isGreeting = /^(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening|yo|greetings|help|who\s+are\s+you|what\s+is\s+this\s+website|what\s+can\s+you\s+do|how\s+to\s+use)(\b|\?|$)/i.test(trimmed);
        const maxScore = retrievedDocs.length > 0 ? Math.max(...retrievedDocs.map(d => d.score)) : 0;

        if (!isGreeting && maxScore < 30) {
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === userMessage.id) {
                return { ...msg, retrievedDocs };
              }
              if (msg.id === assistantMessageId) {
                return {
                  ...msg,
                  content: "I am sorry, but that topic is out of scope for this website. I can only assist you with questions related to Artificial Intelligence, Robotics, Quantum Computing, and Space Exploration."
                };
              }
              return msg;
            })
          );
          setIsStreaming(false);
          return;
        }
      } else {
        // Fallback: If DB isn't ready, scrape just the current active page
        const main = document.querySelector('main')
        const currentContent = main ? main.innerText.slice(0, 1500) : ''
        promptContext = `[Document 1] Source page: ${pageContext}\nContent: ${currentContent}`
      }

      // Add retrieved info to user message for UI display
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id ? { ...msg, retrievedDocs } : msg
        )
      )

      // 2. GENERATION PHASE - Query ChatGPT
      const systemPrompt = `You are a helpful, premium, context-aware chatbot assistant utilizing a Vector RAG database.
The user is currently browsing the page titled "${pageContext}".

Below are the most semantically relevant content blocks retrieved from the website database matching the user's specific query:
---------------------
${promptContext}
---------------------

Please answer the user's questions using the retrieved documents above. 

CRITICAL SCOPE & BOUNDARY RULES:
- You are strictly an assistant for this website. You are ONLY allowed to answer questions directly related to the topics of this website: Artificial Intelligence, Robotics, Quantum Computing, and Space Exploration (and their general sub-fields).
- If the user asks a silly question, an off-topic question, or requests actions unrelated to these science and technology topics (e.g., asking for cooking recipes, coding exercises unrelated to the site, writing poems, playing games, sports news, general history, etc.), you MUST politely decline to answer.
- If a query is out of scope, respond EXACTLY with: "I am sorry, but that topic is out of scope for this website. I can only assist you with questions related to Artificial Intelligence, Robotics, Quantum Computing, and Space Exploration."
- Try to cite the source page (e.g. "According to the Quantum Computing page...") when answering.
- Be friendly, accurate, and concise.
- Use Markdown formatting: bold (**), italics (*), lists, and code blocks with languages (e.g. \`\`\`javascript ... \`\`\`).`

      const conversationHistory = [
        { role: 'system', content: systemPrompt },
        ...messages.slice(1).map((m) => ({
          role: m.role,
          content: m.content
        })),
        { role: 'user', content: trimmed }
      ]

      const controller = new AbortController()
      abortControllerRef.current = controller

      const url = keyToUse ? 'https://api.openai.com/v1/chat/completions' : '/api/chat'
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (keyToUse) {
        headers['Authorization'] = `Bearer ${keyToUse}`
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: model,
          messages: conversationHistory,
          ...(model !== 'gpt-5-nano' ? { temperature } : {}),
          stream: true
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `HTTP ${response.status} ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('Response body is empty')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let streamTextValue = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          const cleanLine = line.trim()
          if (!cleanLine) continue
          if (cleanLine === 'data: [DONE]') continue

          if (cleanLine.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(cleanLine.substring(6))
              const content = parsed.choices?.[0]?.delta?.content || ''
              if (content) {
                streamTextValue += content
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: streamTextValue }
                      : msg
                  )
                )
              }
            } catch (e) {
              console.error('Error parsing streaming line:', e)
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream aborted by user')
      } else {
        console.error('Chat error:', error)
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                ...msg,
                content: `❌ **Error connecting to OpenAI API:**
                  
${error.message || 'An unexpected error occurred. Please verify your internet connection and API key.'}`
              }
              : msg
          )
        )
      }
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  // Markdown parsing
  const parseMarkdown = (text: string) => {
    if (!text) return null
    const blocks = text.split(/(```[\s\S]*?```)/g)

    return blocks.map((block, bIdx) => {
      if (block.startsWith('```')) {
        const match = block.match(/```(\w*)\n([\s\S]*?)```/)
        const lang = match ? match[1] : 'code'
        const codeText = match ? match[2] : block.slice(3, -3)

        const handleCopy = (e: React.MouseEvent) => {
          navigator.clipboard.writeText(codeText.trim())
          const btn = e.currentTarget as HTMLButtonElement
          const prevText = btn.innerText
          btn.innerText = 'Copied!'
          setTimeout(() => {
            btn.innerText = prevText
          }, 1500)
        }

        return (
          <div key={`code-${bIdx}`} className="chat-code-block-container">
            <div className="chat-code-block-header">
              <span>{lang}</span>
              <button className="chat-code-block-copy-btn" onClick={handleCopy}>
                Copy
              </button>
            </div>
            <pre>
              <code>{codeText.trim()}</code>
            </pre>
          </div>
        )
      } else {
        const lines = block.split('\n')
        return (
          <React.Fragment key={`text-${bIdx}`}>
            {lines.map((line, lIdx) => {
              if (!line.trim() && lIdx !== 0 && lIdx !== lines.length - 1) {
                return <br key={`br-${lIdx}`} />
              }

              const boldParts = line.split(/(\*\*.*?\*\*)/g)
              const renderedLine = boldParts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={pIdx}>{part.slice(2, -2)}</strong>
                }
                const codeParts = part.split(/(`.*?`)/g)
                return codeParts.map((cPart, cIdx) => {
                  if (cPart.startsWith('`') && cPart.endsWith('`')) {
                    return <code key={cIdx}>{cPart.slice(1, -1)}</code>
                  }
                  return cPart
                })
              })

              return <p key={`line-${lIdx}`}>{renderedLine}</p>
            })}
          </React.Fragment>
        )
      }
    })
  }

  // Helper to render RAG retrieval details (for study/demonstration)
  const renderRAGDetails = (docs: Message['retrievedDocs']) => {
    if (!docs || docs.length === 0) return null
    return (
      <details className="rag-debug-details">
        <summary>🔍 Vector RAG Retrieval Log ({docs.length} matches)</summary>
        <div className="rag-debug-content">
          {docs.map((doc, idx) => (
            <div key={doc.id} className="rag-debug-item">
              <div className="rag-debug-meta">
                <strong>Rank #{idx + 1}</strong>: {doc.pageTitle} page
                <span className="rag-debug-score">Match: {doc.score}%</span>
              </div>
              <p className="rag-debug-text">"{doc.text.slice(0, 100)}..."</p>
            </div>
          ))}
        </div>
      </details>
    )
  }

  // Render database connection badge
  const renderDbBadge = () => {
    switch (dbStatus) {
      case 'ready':
        return <span className="db-badge ready">RAG DB Ready ({embeddingsDb.length} nodes)</span>
      case 'loading':
        return <span className="db-badge loading">Initializing RAG Vectors...</span>
      case 'error':
        return <span className="db-badge error" title={dbError}>RAG DB Setup Failed ⚠️</span>
      default:
        return <span className="db-badge pending">RAG DB Pending Key</span>
    }
  }

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        className="chat-widget-fab"
        onClick={() => setIsOpen(!isOpen)}
        title="Chat with AI"
        aria-label="Toggle chat widget"
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
          </svg>
        )}
        {hasNewMessage && <span className="chat-fab-badge" />}
      </button>

      {/* Sidebar Chat Box */}
      <div className={`chat-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Chat Header */}
        <div className="chat-header">
          <div className="chat-header-info">
            <h3 className="chat-header-title">
              <span className="chat-status-dot" /> AI RAG Assistant
            </h3>
            {renderDbBadge()}
          </div>

          <div className="chat-header-actions">
            <button
              className="chat-header-btn"
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
              className="chat-header-btn"
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
          <div className="chat-suggestions">
            {getSuggestionChips().map((chip, idx) => (
              <button
                key={idx}
                className="suggestion-chip"
                onClick={() => handleSendMessage(chip)}
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Messages List */}
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className="chat-msg-block-container" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className={`chat-message-wrapper ${msg.role}`}>
                <div className="chat-message-bubble">
                  {msg.content ? (
                    parseMarkdown(msg.content)
                  ) : (
                    <div className="typing-indicator">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  )}
                </div>
                <span className="chat-message-time">
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
          <button className="chat-stop-btn" onClick={handleStopStream}>
            <svg viewBox="0 0 24 24">
              <path d="M6 19h12V5H6v14z" />
            </svg>
            Stop generating
          </button>
        )}

        {/* Chat Input */}
        <div className="chat-input-container">
          <div className="chat-input-row">
            <textarea
              ref={textareaRef}
              className="chat-input-textarea"
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
              className="chat-send-btn"
              onClick={() => handleSendMessage(inputValue)}
              disabled={isStreaming || !inputValue.trim()}
              aria-label="Send message"
            >
              <svg viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Settings Panel Overlay */}
        {showSettings && (
          <div className="chat-settings-overlay">
            <div className="chat-settings-header">
              <h4 className="chat-settings-title">RAG Engine Settings</h4>
              <button
                className="chat-header-btn"
                onClick={() => setShowSettings(false)}
                aria-label="Close settings"
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="chat-settings-form">
              <div className="chat-settings-group">
                <label htmlFor="setting-api-key">OpenAI API Key</label>
                <input
                  id="setting-api-key"
                  type="password"
                  className="chat-settings-input"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <span className="chat-settings-help">
                  Required to generate embeddings and run vector searches. Saved locally in browser.
                </span>
              </div>

              <div className="chat-settings-group">
                <label htmlFor="setting-model">Completions Model</label>
                <select
                  id="setting-model"
                  className="chat-settings-select"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  <option value="gpt-5-nano">gpt-5-nano (Default)</option>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                </select>
              </div>

              <div className="chat-settings-group">
                <label htmlFor="setting-temp">Temperature ({temperature})</label>
                <input
                  id="setting-temp"
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.1"
                  className="chat-settings-input"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                />
              </div>

              <div className="chat-settings-group" style={{ marginTop: '10px', padding: '12px', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Vector Database Actions:</span>
                <button
                  type="button"
                  className="chat-settings-save-btn"
                  style={{ background: '#4b5563', padding: '8px', fontSize: '0.8rem', width: '100%', marginTop: '4px' }}
                  onClick={() => initializeVectorDb(true)}
                  disabled={!getApiKey()}
                >
                  Force Rebuild Embedding Vectors
                </button>
              </div>

              <button type="submit" className="chat-settings-save-btn">
                Save & Close
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  )
}
