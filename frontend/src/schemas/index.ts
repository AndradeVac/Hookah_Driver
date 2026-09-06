import { z } from 'zod'

export const loginSchema = z.object({
  username: z.email(),
  password: z.string().min(8),
})

export type LoginForm = z.infer<typeof loginSchema>
