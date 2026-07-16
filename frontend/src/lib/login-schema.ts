import { z } from 'zod'

export const loginSchema = z.object({
  cpm_number: z.string().trim().min(1, 'CPM Number is required'),
  mc_number: z.string().trim().min(1, 'Password is required'),
})

export type LoginForm = z.infer<typeof loginSchema>
