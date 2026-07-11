import React from 'react'

export const parseMarkdown = (text: string, isUserMessage: boolean = false) => {
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
        <div key={`code-${bIdx}`} className="my-2.5 rounded-lg overflow-hidden border border-black/8 bg-[#1e1e2e]">
          <div className="flex justify-between items-center py-1.5 px-3 bg-white/5 border-b border-white/5 text-[#a6adc8] text-[0.72rem] font-mono uppercase">
            <span>{lang}</span>
            <button 
              className="bg-transparent border-none text-[#89b4fa] cursor-pointer text-[0.7rem] py-0.5 px-1.5 rounded transition-all duration-200 hover:bg-white/8 hover:text-[#b4befe]" 
              onClick={handleCopy}
            >
              Copy
            </button>
          </div>
          <pre className="m-0 p-3 overflow-x-auto">
            <code className="font-mono text-[0.78rem] text-[#cdd6f4]">{codeText.trim()}</code>
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
                  return (
                    <code 
                      key={cIdx} 
                      className={`font-mono text-[0.82rem] py-0.5 px-1.2 rounded ${
                        isUserMessage ? 'bg-white/15 text-white' : 'bg-black/5 text-gray-800'
                      }`}
                    >
                      {cPart.slice(1, -1)}
                    </code>
                  )
                }
                return cPart
              })
            })

            return <p key={`line-${lIdx}`} className="m-0">{renderedLine}</p>
          })}
        </React.Fragment>
      )
    }
  })
}
