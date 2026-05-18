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

// ── Tool definitions (passed to OpenAI `tools` array) ────────────────────────

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
        additionalProperties: false,
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
        additionalProperties: false,
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
        additionalProperties: false,
      },
    },
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

    default:
      result = {
        found: false,
        error: { code: 'INVALID_INPUT', message: `Unknown tool: ${name}` },
      }
  }

  return JSON.stringify(result)
}
