import { z } from 'zod'

export const positionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Position name is required')
    .max(100, 'Position name must be 100 characters or fewer'),
  academic_year: z.enum(['2nd Year', '3rd Year']),
  max_winners: z.number().int().positive(),
})

export type PositionForm = z.infer<typeof positionSchema>

export const electionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Election name is required')
    .max(200, 'Election name must be 200 characters or fewer'),
  application_start_at: z.string().optional(),
  application_end_at: z.string().optional(),
  voting_start_at: z.string().optional(),
  voting_end_at: z.string().optional(),
  require_all_positions_filled: z.boolean(),
})

export type ElectionForm = z.infer<typeof electionSchema>

export const memberEditSchema = z.object({
  cpm_number: z.string().trim().min(1, 'CPM Number is required'),
  mc_number: z.string().trim().min(1, 'MC Number is required'),
  is_active: z.boolean(),
})

export type MemberEditForm = z.infer<typeof memberEditSchema>

export const candidateSchema = z.object({
  full_name: z.string().trim().min(1, 'Name is required'),
  academic_year: z.enum(['2nd Year', '3rd Year']),
  position: z.number().min(1, 'Position is required'),
  photo_url: z.string().url('Photo URL is required'),
})

export type CandidateForm = z.infer<typeof candidateSchema>
