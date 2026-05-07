/**
 * server/ai/openai.ts
 * OpenAI client singleton — server-only.
 *
 * WHY singleton: OpenAI client setup is expensive. One instance per process.
 * WHY server-only: API key must never reach the browser.
 */

import 'server-only'
import OpenAI from 'openai'

let client: OpenAI | undefined

export function getOpenAIClient(): OpenAI {
  if (client) return client

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set')
  }

  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return client
}
