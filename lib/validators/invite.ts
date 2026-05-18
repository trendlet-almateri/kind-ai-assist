import { z } from 'zod'

export const inviteAgentSchema = z.object({
  username: z
    .string()
    .trim()
    .transform((val) =>
      val
        .toLowerCase()
        .replace(/\s+/g, '.')          // spaces → dots
        .replace(/[^a-z0-9._-]/g, '')  // strip any remaining invalid chars
    )
    .pipe(
      z.string()
        .min(2, 'Username must be at least 2 characters')
        .max(50, 'Username must be 50 characters or less')
    ),
  email: z
    .string()
    .email('Invalid email address')
    .max(255)
    .trim()
    .toLowerCase(),
  role: z.enum(['admin', 'agent']).default('agent'),
})

export type InviteAgentInput = z.infer<typeof inviteAgentSchema>
