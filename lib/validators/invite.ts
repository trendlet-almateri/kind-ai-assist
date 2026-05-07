import { z } from 'zod'

export const inviteAgentSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be 100 characters or less')
    .trim(),
  username: z
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(50, 'Username must be 50 characters or less')
    .regex(/^[a-z0-9._-]+$/, 'Only lowercase letters, numbers, dots, dashes allowed')
    .trim(),
  email: z
    .string()
    .email('Invalid email address')
    .max(255)
    .trim()
    .toLowerCase(),
  role: z.enum(['admin', 'agent']).default('agent'),
})

export type InviteAgentInput = z.infer<typeof inviteAgentSchema>
