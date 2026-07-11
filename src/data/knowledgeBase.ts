export interface KnowledgeChunk {
  id: string
  category: string
  pageTitle: string
  url: string
  text: string
}

// 🌟 Single Source of Truth: JSON-LD Schema
export const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://context-aware-chatbot.local/#website",
      "url": "https://context-aware-chatbot.local/",
      "name": "Context-Aware AI & Tech Platform",
      "description": "An interactive semantic resource exploring Artificial Intelligence, Robotics, Quantum Computing, and Space Exploration."
    },
    {
      "@type": "WebPage",
      "@id": "https://context-aware-chatbot.local/#ai",
      "url": "/",
      "name": "Artificial Intelligence",
      "isPartOf": { "@id": "https://context-aware-chatbot.local/#website" },
      "hasPart": [
        {
          "@type": "TechArticle",
          "@id": "https://context-aware-chatbot.local/#ai-1",
          "headline": "AI Integration in Everyday Life",
          "articleBody": "Artificial Intelligence (AI) has become one of the most influential technologies of the modern era. By enabling computers to recognize patterns, process natural language, make predictions, and generate creative content, AI is changing how people interact with technology every day. Applications such as virtual assistants, recommendation engines, facial recognition, autonomous vehicles, and intelligent search systems have become deeply integrated into everyday life, often operating behind the scenes without users even realizing it. Businesses across every industry are leveraging AI to automate repetitive tasks, improve decision-making, enhance customer experiences, and unlock valuable insights from massive datasets."
        },
        {
          "@type": "TechArticle",
          "@id": "https://context-aware-chatbot.local/#ai-2",
          "headline": "The Rise of Generative AI",
          "articleBody": "Recent advances in generative AI have expanded these capabilities even further. Modern AI systems can now write articles, generate realistic images and videos, compose music, develop software, summarize research papers, and assist professionals across fields including medicine, engineering, law, education, and design. These tools are increasingly acting as collaborative partners rather than simple automation software, helping humans work faster while encouraging new forms of creativity and innovation. As AI models continue to improve, they are expected to become more personalized, context-aware, and capable of handling increasingly complex tasks."
        },
        {
          "@type": "TechArticle",
          "@id": "https://context-aware-chatbot.local/#ai-3",
          "headline": "Ethics and Challenges of AI",
          "articleBody": "Despite its enormous potential, AI also raises significant ethical and societal concerns. Questions surrounding privacy, misinformation, bias, transparency, copyright, and workforce transformation continue to shape public discussion and government regulation. Ensuring that AI systems remain fair, accountable, secure, and aligned with human values will be one of the defining challenges of the coming decades. The future of AI is likely to be built on collaboration between humans and intelligent machines, combining computational power with human creativity, empathy, and critical thinking."
        }
      ]
    },
    {
      "@type": "WebPage",
      "@id": "https://context-aware-chatbot.local/#robotics",
      "url": "/about",
      "name": "Robotics",
      "isPartOf": { "@id": "https://context-aware-chatbot.local/#website" },
      "hasPart": [
        {
          "@type": "TechArticle",
          "@id": "https://context-aware-chatbot.local/#robotics-1",
          "headline": "Modern Robotics and Sensors",
          "articleBody": "Robotics is the science of designing and building intelligent machines capable of performing physical tasks with precision, speed, and reliability. Traditionally associated with factory automation, robotics has expanded far beyond industrial manufacturing into healthcare, agriculture, logistics, construction, defense, hospitality, and domestic assistance. Modern robots are equipped with advanced sensors, computer vision systems, and artificial intelligence that allow them to perceive their environment, recognize objects, navigate complex spaces, and interact safely with humans. These capabilities enable robots to perform tasks that would otherwise be repetitive, dangerous, or physically demanding."
        },
        {
          "@type": "TechArticle",
          "@id": "https://context-aware-chatbot.local/#robotics-2",
          "headline": "Collaborative Robots (Cobots) in Workspaces",
          "articleBody": "One of the most exciting developments in robotics is the emergence of collaborative robots, often called cobots, which are designed to work alongside people rather than replace them. In hospitals, robotic systems assist surgeons during highly precise operations. In warehouses, autonomous mobile robots optimize inventory movement and order fulfillment. Agricultural robots monitor crop health, plant seeds, and harvest produce with remarkable efficiency, helping farmers address labor shortages while increasing productivity. As technology continues to improve, humanoid robots are also becoming increasingly capable of performing tasks in homes, offices, and public environments."
        },
        {
          "@type": "TechArticle",
          "@id": "https://context-aware-chatbot.local/#robotics-3",
          "headline": "The Future of Adaptable Robots",
          "articleBody": "Future robotics will likely combine advances in artificial intelligence, machine learning, and edge computing to create machines that continuously learn from experience and adapt to changing conditions. These robots may become trusted assistants capable of supporting elderly care, disaster response, environmental monitoring, deep-sea exploration, and even extraterrestrial missions. While robotics will undoubtedly transform many industries, its greatest potential lies in augmenting human capabilities rather than replacing them, allowing people to focus on creativity, strategic thinking, and meaningful interpersonal interactions."
        }
      ]
    },
    {
      "@type": "WebPage",
      "@id": "https://context-aware-chatbot.local/#quantum",
      "url": "/services",
      "name": "Quantum Computing",
      "isPartOf": { "@id": "https://context-aware-chatbot.local/#website" },
      "hasPart": [
        {
          "@type": "TechArticle",
          "@id": "https://context-aware-chatbot.local/#quantum-1",
          "headline": "Superposition and Entanglement in Quantum Bits",
          "articleBody": "Quantum computing represents one of the most revolutionary advances in computer science. Unlike traditional computers that process information using binary bits, quantum computers rely on quantum bits, or qubits, which exploit the principles of superposition and entanglement. These unique properties allow quantum systems to process many possible solutions simultaneously, making them exceptionally powerful for solving highly complex computational problems that are practically impossible for classical computers. Although still in its early stages, quantum computing has already demonstrated remarkable potential in research laboratories around the world."
        },
        {
          "@type": "TechArticle",
          "@id": "https://context-aware-chatbot.local/#quantum-2",
          "headline": "Scientific and Commercial Quantum Integration",
          "articleBody": "Scientists believe quantum computers could dramatically accelerate innovation across numerous industries. They may enable researchers to simulate molecular structures for faster drug discovery, design advanced materials with extraordinary properties, optimize global logistics networks, improve financial risk analysis, strengthen encryption methods, and develop more accurate climate models. Rather than replacing conventional computers, quantum computers are expected to complement them by solving specialized problems that require enormous computational power. This hybrid approach could unlock entirely new possibilities for science, engineering, and industrial research."
        },
        {
          "@type": "TechArticle",
          "@id": "https://context-aware-chatbot.local/#quantum-3",
          "headline": "Engineering Challenges in Qubit Development",
          "articleBody": "Building practical quantum computers remains an extraordinary engineering challenge. Qubits are extremely sensitive to environmental interference, making error correction and hardware stability difficult to achieve. Researchers continue developing new architectures, cooling systems, and algorithms to overcome these limitations while technology companies and governments invest billions of dollars into quantum research. Although widespread commercial adoption may still be years away, quantum computing is widely regarded as one of the technologies most likely to redefine the future of computation and scientific discovery."
        }
      ]
    },
    {
      "@type": "WebPage",
      "@id": "https://context-aware-chatbot.local/#space",
      "url": "/contact",
      "name": "Space Exploration",
      "isPartOf": { "@id": "https://context-aware-chatbot.local/#website" },
      "hasPart": [
        {
          "@type": "TechArticle",
          "@id": "https://context-aware-chatbot.local/#space-1",
          "headline": "Collaborative Ventures in Space Missions",
          "articleBody": "Space exploration has evolved from a competition between nations into a global effort involving governments, private companies, universities, and international partnerships. Advances in reusable rockets, satellite technology, autonomous spacecraft, and deep-space communication have significantly reduced the cost of reaching orbit while expanding opportunities for scientific discovery and commercial innovation. Missions are currently focused on returning humans to the Moon, preparing for future journeys to Mars, exploring distant planets, and studying the origins of the universe through advanced space telescopes. Every mission contributes valuable knowledge that expands our understanding of both Earth and the cosmos."
        },
        {
          "@type": "TechArticle",
          "@id": "https://context-aware-chatbot.local/#space-2",
          "headline": "Terrestrial Innovations from Space tech",
          "articleBody": "Beyond scientific discovery, space technology has become deeply integrated into everyday life. Satellites provide global internet connectivity, GPS navigation, weather forecasting, environmental monitoring, disaster response, and communication systems that billions of people rely on daily. Technologies originally developed for space missions—including advanced materials, water purification systems, medical devices, and imaging technologies—have also found widespread applications on Earth. This demonstrates that investment in space exploration often produces benefits that extend far beyond the boundaries of space itself."
        },
        {
          "@type": "TechArticle",
          "@id": "https://context-aware-chatbot.local/#space-3",
          "headline": "Colonization and Resource Exploration Goals",
          "articleBody": "Looking ahead, the future of space exploration may include permanent lunar research stations, human settlements on Mars, asteroid mining, space-based manufacturing, and even commercial space tourism. While these ambitions present enormous technical, financial, and ethical challenges, they also represent humanity's enduring desire to explore the unknown. As innovation continues to accelerate, space exploration will remain a powerful driver of scientific progress, inspiring future generations while expanding the boundaries of what civilization can achieve."
        }
      ]
    }
  ]
} as const;

export const KNOWLEDGE_BASE_CHUNKS: KnowledgeChunk[] = []

WEBSITE_SCHEMA['@graph'].forEach((node: any) => {
  if (node['@type'] === 'WebPage') {
    const pageTitle = node.name
    const url = node.url
    const category = node.name
    
    if (Array.isArray(node.hasPart)) {
      node.hasPart.forEach((part: any) => {
        KNOWLEDGE_BASE_CHUNKS.push({
          id: part['@id'].split('#')[1] || part['@id'],
          category,
          pageTitle,
          url,
          text: part.articleBody
        })
      })
    }
  }
})

export function getChunksByPage(url: string): KnowledgeChunk[] {
  return KNOWLEDGE_BASE_CHUNKS.filter(chunk => chunk.url === url)
}
