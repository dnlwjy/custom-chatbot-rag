import { getChunksByPage } from '../data/knowledgeBase'

function About() {
  const chunks = getChunksByPage('/about')
  return (
    <article>
      <h1>Robotics</h1>
      {chunks.map(chunk => (
        <p key={chunk.id}>{chunk.text}</p>
      ))}
    </article>
  )
}

export default About
