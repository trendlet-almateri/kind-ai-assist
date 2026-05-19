/**
 * server/ai/trendletTools.ts
 * OpenAI function-calling tool definitions for the Trendlet Support API,
 * plus the executor that dispatches tool_calls to the correct client function.
 *
 * Usage in replyEngine:
 *   import { trendletToolDefs, executeTrendletTool } from './trendletTools'
 */

import 'server-only'
import type OpenAI from 'openai'
import {
  getOrderDetails,
  searchOrdersByEmail,
  getShipmentTracking,
} from './trendletClient'

// ── Tool definitions — Chat Completions format (nested under function:{}) ────

export const trendletToolDefs: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'getOrderDetails',
      description:
        'Get full details for a specific order number, including every sub-order ' +
        'with its own status (label_en / label_ar), statusChangedAt, and tracking info. ' +
        'Use this when the customer provides an order number.',
      parameters: {
        type: 'object',
        properties: {
          orderNumber: {
            type: 'string',
            description: 'The customer\'s order number (e.g. "1209").',
          },
        },
        required: ['orderNumber'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchOrdersByEmail',
      description:
        'Search for all orders placed by a customer using their email address. ' +
        'Returns a list of order summaries. Use this when the customer provides an email ' +
        'but not an order number.',
      parameters: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: 'The email address the customer used at checkout.',
          },
        },
        required: ['email'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getShipmentTracking',
      description:
        'Get shipment and tracking details for a specific order number. ' +
        'Returns tracking numbers, shipment status, shipped/delivered dates, ' +
        'and which sub-orders are in each shipment.',
      parameters: {
        type: 'object',
        properties: {
          orderNumber: {
            type: 'string',
            description: 'The customer\'s order number.',
          },
        },
        required: ['orderNumber'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'escalate_to_human',
      description:
        'Escalate the conversation to a human agent. ' +
        'Call this when the customer explicitly asks to speak with a human, ' +
        'says "أبي أكلم إنسان", "talk to agent", or "human support".',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
]

// ── Tool definitions — Responses API format (flat: name/description/parameters on root) ──
// Responses API FunctionTool: { type, name, description, parameters, strict }
// strict:false so we don't need additionalProperties:false at every level.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trendletResponsesToolDefs: any[] = [
  {
    type: 'function',
    name: 'getOrderDetails',
    description:
      'Get full details for a specific order number, including every sub-order ' +
      'with its own status (label_en / label_ar), statusChangedAt, and tracking info. ' +
      'Use this when the customer provides an order number.',
    parameters: {
      type: 'object',
      properties: {
        orderNumber: { type: 'string', description: 'The customer\'s order number (e.g. "1209").' },
      },
      required: ['orderNumber'],
    },
    strict: false,
  },
  {
    type: 'function',
    name: 'searchOrdersByEmail',
    description:
      'Search for all orders placed by a customer using their email address. ' +
      'Returns a list of order summaries. Use this when the customer provides an email ' +
      'but not an order number.',
    parameters: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'The email address the customer used at checkout.' },
      },
      required: ['email'],
    },
    strict: false,
  },
  {
    type: 'function',
    name: 'getShipmentTracking',
    description:
      'Get shipment and tracking details for a specific order number. ' +
      'Returns tracking numbers, shipment status, shipped/delivered dates, ' +
      'and which sub-orders are in each shipment.',
    parameters: {
      type: 'object',
      properties: {
        orderNumber: { type: 'string', description: 'The customer\'s order number.' },
      },
      required: ['orderNumber'],
    },
    strict: false,
  },
  {
    type: 'function',
    name: 'escalate_to_human',
    description:
      'Escalate the conversation to a human agent. ' +
      'Call this when the customer explicitly asks to speak with a human, ' +
      'says "أبي أكلم إنسان", "talk to agent", or "human support".',
    parameters: { type: 'object', properties: {}, required: [] },
    strict: false,
  },
]

// ── Executor ──────────────────────────────────────────────────────────────────

/**
 * Dispatch a tool_call from OpenAI to the correct Trendlet client function.
 * Returns a JSON string — safe to use as the `content` of a tool result message.
 */
export async function executeTrendletTool(
  name:  string,
  args:  Record<string, string>
): Promise<string> {
  let result

  switch (name) {
    case 'getOrderDetails':
      result = await getOrderDetails(args.orderNumber ?? '')
      break

    case 'searchOrdersByEmail':
      result = await searchOrdersByEmail(args.email ?? '')
      break

    case 'getShipmentTracking':
      result = await getShipmentTracking(args.orderNumber ?? '')
      break

    case 'escalate_to_human':
      result = { escalated: true }
      break

    default:
      result = {
        found: false,
        error: { code: 'INVALID_INPUT', message: `Unknown tool: ${name}` },
      }
  }

  return JSON.stringify(result)
}
