import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import type { KnowledgeChunk } from '../data/knowledgeBase'

export interface Message {
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

interface UseChatLogicProps {
  knowledgeBase: KnowledgeChunk[]
  botName: string
  welcomeMessage?: string
  demoMode: boolean
}

export function useChatLogic({
  knowledgeBase,
  botName,
  welcomeMessage,
  demoMode
}: UseChatLogicProps) {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false)

  // Settings state (loads from localStorage or defaults)
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
  const mockIntervalRef = useRef<any>(null)

  // Get active key from localStorage or project env
  const getApiKey = () => {
    return apiKey || (import.meta.env.VITE_OPENAI_API_KEY as string) || ''
  }

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
          'What is a Qubit?',
          'How does quantum superposition work?',
          'What is quantum entanglement?'
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
        if (parsed.length === knowledgeBase.length) {
          setEmbeddingsDb(parsed)
          setDbStatus('ready')
          return
        }
      }

      const textsToEmbed = knowledgeBase.map((c) => c.text)
      const vectors = await fetchBatchEmbeddings(textsToEmbed, key)

      const newDb: CachedEmbedding[] = knowledgeBase.map((chunk, idx) => ({
        id: chunk.id,
        vector: vectors[idx]
      }))

      localStorage.setItem(cacheKey, JSON.stringify(newDb))
      setEmbeddingsDb(newDb)
      setDbStatus('ready')
    } catch (err: any) {
      console.error('Failed to build vector DB:', err)
      
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
    if (demoMode) {
      setDbStatus('ready')
    } else {
      initializeVectorDb()
    }
  }, [apiKey, demoMode])

  // Reset conversation with welcome message on route change
  useEffect(() => {
    const context = getPageContext()
    const welcomeMsg: Message = {
      id: 'welcome-' + location.pathname,
      role: 'assistant',
      content: welcomeMessage || `Hello! I am your RAG-powered AI assistant.

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
    initializeVectorDb(true)
  }

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsStreaming(false)
    }
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current)
      mockIntervalRef.current = null
      setIsStreaming(false)
    }
  }

  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim()
    if (!trimmed || isStreaming) return

    setInputValue('')

    const greetings = [
      'hi', 'hello', 'hey', 'yo', 'greetings', 'help',
      'good morning', 'good afternoon', 'good evening',
      'who are you', 'what is this website', 'what can you do',
      'how to use'
    ]
    const queryLower = trimmed.toLowerCase()

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

    if (demoMode) {
      // 1. MOCK RAG PHASE - Search over knowledgeBase using local keyword math
      const punctuation = ".,/#!$%^&*__;:{}=-`~()?";
      const queryWords = trimmed.toLowerCase()
        .split('')
        .filter(char => !punctuation.includes(char))
        .join('')
        .split(' ')
        .filter(word => word.length > 2)

      let matchedDocs: any[] = []
      
      if (queryWords.length > 0) {
        const scored = knowledgeBase.map(chunk => {
          const docTextLower = chunk.text.toLowerCase()
          const pageTitleLower = chunk.pageTitle.toLowerCase()
          let matchCount = 0
          queryWords.forEach(word => {
            if (docTextLower.includes(word)) {
              matchCount += 1
              if (pageTitleLower.includes(word)) {
                matchCount += 1.5
              }
            }
          })
          
          const score = matchCount > 0 ? Math.min(30 + (matchCount * 15), 98) : 0
          return { ...chunk, score }
        })

        matchedDocs = scored
          .filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
      }

      const retrievedDocs: Message['retrievedDocs'] = matchedDocs.map(chunk => ({
        id: chunk.id,
        pageTitle: chunk.pageTitle,
        score: chunk.score,
        text: chunk.text
      }))

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id ? { ...msg, retrievedDocs } : msg
        )
      )

      // Check for out of scope
      const isGreeting = greetings.some(e =>
        queryLower === e ||
        queryLower.startsWith(e + ' ') ||
        queryLower.startsWith(e + '?') ||
        queryLower.startsWith(e + '!')
      )
      const maxScore = retrievedDocs.length > 0 ? Math.max(...retrievedDocs.map(d => d.score)) : 0

      let responseText = ""

      if (!isGreeting && maxScore < 30) {
        responseText = "I am sorry, but that topic is out of scope for this website. I can only assist you with questions related to Artificial Intelligence, Robotics, Quantum Computing, and Space Exploration."
      } else if (isGreeting) {
        responseText = `Hello! I am your ${botName} (running in Demo Mode). 

I can answer questions using context from the current page (**${pageContext}**) or search across all pages of the site using local mock RAG. Ask me anything about Artificial Intelligence, Robotics, Quantum Computing, or Space Exploration!`
      } else {
        const topDoc = matchedDocs[0]
        responseText = `This will be a response generated by the RAG AI about **${topDoc.pageTitle}**.

Based on the retrieved website documentation:
> *"${topDoc.text.slice(0, 160)}..."*

Here is what we know:
1. This is a **Mock Demo Response** illustrating the client-side RAG engine.
2. The user query matched the **${topDoc.category}** category with a simulated similarity score of **${maxScore}%**.
3. In a production environment, this matched text block would be fed into the OpenAI model to generate a custom answer.`
      }

      let currentContent = ''
      let charIndex = 0
      
      const interval = setInterval(() => {
        if (charIndex < responseText.length) {
          currentContent += responseText.charAt(charIndex)
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: currentContent }
                : msg
            )
          )
          charIndex++
        } else {
          clearInterval(interval)
          setIsStreaming(false)
          mockIntervalRef.current = null
        }
      }, 15)

      mockIntervalRef.current = interval as any
      return
    }

    const keyToUse = getApiKey()

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
      if (dbStatus === 'ready' && embeddingsDb.length > 0) {
        const queryVector = await fetchEmbedding(trimmed, keyToUse)

        const scoredChunks = knowledgeBase.map((chunk) => {
          const cached = embeddingsDb.find((e) => e.id === chunk.id)
          const score = cached ? calculateCosineSimilarity(queryVector, cached.vector) : 0
          return { ...chunk, score }
        })

        const sorted = scoredChunks
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)

        retrievedDocs = sorted.map((chunk) => ({
          id: chunk.id,
          pageTitle: chunk.pageTitle,
          score: Math.round(chunk.score * 100),
          text: chunk.text
        }))

        promptContext = retrievedDocs
          .map((doc, idx) => `[Document ${idx + 1}] Source page: ${doc.pageTitle}\nContent: ${doc.text}`)
          .join('\n\n')

        const isGreeting = greetings.some(e =>
          queryLower === e ||
          queryLower.startsWith(e + ' ') ||
          queryLower.startsWith(e + '?') ||
          queryLower.startsWith(e + '!')
        )
        const maxScore = retrievedDocs.length > 0 ? Math.max(...retrievedDocs.map(d => d.score)) : 0

        if (!isGreeting && maxScore < 30) {
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === userMessage.id) {
                return { ...msg, retrievedDocs }
              }
              if (msg.id === assistantMessageId) {
                return {
                  ...msg,
                  content: "I am sorry, but that topic is out of scope for this website. I can only assist you with questions related to Artificial Intelligence, Robotics, Quantum Computing, and Space Exploration."
                }
              }
              return msg
            })
          )
          setIsStreaming(false)
          return
        }
      } else {
        const main = document.querySelector('main')
        const currentContent = main ? main.innerText.slice(0, 1500) : ''
        promptContext = `[Document 1] Source page: ${pageContext}\nContent: ${currentContent}`
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id ? { ...msg, retrievedDocs } : msg
        )
      )

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
      const decoder = new TextDecoder()
      let accumulatedResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim()
            if (dataStr === '[DONE]') continue

            try {
              const parsed = JSON.parse(dataStr)
              const delta = parsed.choices?.[0]?.delta?.content || ''
              accumulatedResponse += delta

              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id === assistantMessageId) {
                    return { ...msg, content: accumulatedResponse }
                  }
                  return msg
                })
              )
            } catch (e) {
              // Ignore empty/malformed chunks
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted')
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

  return {
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
    pageContext,
    getSuggestionChips,
    initializeVectorDb,
    getApiKey,
    handleSaveSettings,
    handleStopStream,
    handleSendMessage,
    messagesEndRef,
    textareaRef
  }
}
