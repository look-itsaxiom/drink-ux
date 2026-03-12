import { v0 } from 'v0-sdk'

/**
 * Example: How a Paperclip agent generates a new screen using v0
 * 
 * Requirements:
 * 1. export V0_API_KEY='your_key'
 * 2. npm install v0-sdk
 */

async function generateDesign(prompt: string) {
  console.log(`🎨 Requesting design for: "${prompt}"...`)
  
  const chat = await v0.chats.create({
    message: `Generate a React component for the Drink-UX app using Tailwind CSS. 
    Context: Mobile-first PWA for a luxury coffee shop.
    Brand: Warm, inviting, craft coffee. 
    Design Tokens: Primary #6B4226, Secondary #D4A574, Background #FDF8F5.
    Requirement: ${prompt}`,
  })

  // The chat object contains URLs the agent can post for board review
  console.log(`✅ Design generated!`)
  console.log(`🔗 Board Review URL: ${chat.webUrl}`)
  console.log(`🖼️ Preview URL: ${chat.latestVersion?.demoUrl}`)
  
  // The agent can then pull the code locally if it needs to commit it
  // Or use: npx v0 add ${chat.id}
}

generateDesign("A high-fidelity 'Visual Drink Builder' screen where users can drag and drop toppings.")
