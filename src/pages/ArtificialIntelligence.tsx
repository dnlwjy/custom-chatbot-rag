import { getChunksByPage } from '../data/knowledgeBase'

function Home() {
  const chunks = getChunksByPage('/')
  return (
    <article>
      <h1>Artificial Intelligence</h1>
      {chunks.map(chunk => (
        <p key={chunk.id}>{chunk.text}</p>
      ))}
    </article>
  )
}

export default Home
