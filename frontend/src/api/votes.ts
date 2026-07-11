import { apiGet, apiPost } from '@/api/client'
import type { Ballot } from '@/types/api'

export async function fetchBallot() {
  return apiGet<Ballot>('/votes/ballot/')
}

export async function submitVote(positionId: number, candidateId: number) {
  return apiPost<{
    id: number
    position_id: number
    position_name: string
    candidate_id: number
    candidate_name: string
    voted_at: string
  }>('/votes/', { position_id: positionId, candidate_id: candidateId })
}
