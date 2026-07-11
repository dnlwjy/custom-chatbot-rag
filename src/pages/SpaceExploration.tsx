import { getChunksByPage } from '../data/knowledgeBase'

function Contact() {
  const chunks = getChunksByPage('/contact')
  return (
    <article>
      <h1>Space Exploration</h1>
      {chunks.map(chunk => (
        <p key={chunk.id}>{chunk.text}</p>
      ))}
    </article>
  )
}

export default Contact
