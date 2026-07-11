import { getChunksByPage } from '../data/knowledgeBase'

function Services() {
  const chunks = getChunksByPage('/services')
  return (
    <article>
      <h1>Quantum Computing</h1>
      {chunks.map(chunk => (
        <p key={chunk.id}>{chunk.text}</p>
      ))}
    </article>
  )
}

export default Services
