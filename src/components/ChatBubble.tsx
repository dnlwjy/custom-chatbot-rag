import React from 'react'
import { parseMarkdown } from '../lib/markdown'
import type { Message } from '../lib/useChatLogic'

export interface ChatBubbleProps {
  msg: Message
  renderRAGDetails?: (docs: Message['retrievedDocs']) => React.ReactNode
}

export default function ChatBubble({ msg, renderRAGDetails }: ChatBubbleProps) {
  const isUser = msg.role === 'user'

  return (
    <div className="flex flex-col">
      <div className={`flex max-w-[82%] flex-col gap-1 ${isUser ? 'self-end' : 'self-start'}`}>
        <div
          className={`p-3 px-4 rounded-2xl text-[0.88rem] leading-[1.45] break-words ${
            isUser
              ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-sm shadow-[0_4px_12px_rgba(79,70,229,0.15)]'
              : 'bg-gray-100 text-gray-800 rounded-bl-sm border border-black/3'
          }`}
        >
          {msg.content ? (
            parseMarkdown(msg.content, isUser)
          ) : (
            <div className="flex gap-1 items-center h-[18px]">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full inline-block animate-bounce" style={{ animationDelay: '-0.32s' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full inline-block animate-bounce" style={{ animationDelay: '-0.16s' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full inline-block animate-bounce" />
            </div>
          )}
        </div>
        <span className={`text-[0.68rem] text-gray-400 mt-0.5 ${isUser ? 'self-end mr-1' : 'self-start ml-1'}`}>
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      {/* Show retrieved documents under user's prompt to demonstrate RAG */}
      {isUser && renderRAGDetails && renderRAGDetails(msg.retrievedDocs)}
    </div>
  )
}
