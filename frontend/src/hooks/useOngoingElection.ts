import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchOngoingElection } from '@/api/elections'
import {
  ONGOING_ELECTION_POLL_MS,
  ONGOING_ELECTION_QUERY_KEY,
  ONGOING_ELECTION_STALE_MS,
} from '@/lib/query-sync'
import { shouldOwnPoll } from '@/lib/tab-coordinator'
import { useDocumentVisible } from '@/lib/useDocumentVisible'

interface UseOngoingElectionOptions {
  /** When false, read cached election state without background polling (e.g. header strip). */
  poll?: boolean
}

/** Shared ongoing-election query for member surfaces (single poll + visibility gate). */
export function useOngoingElection({ poll = true }: UseOngoingElectionOptions = {}) {
  const queryClient = useQueryClient()
  const documentVisible = useDocumentVisible()

  return useQuery({
    queryKey: ONGOING_ELECTION_QUERY_KEY,
    queryFn: async () => {
      if (!shouldOwnPoll(ONGOING_ELECTION_QUERY_KEY, ONGOING_ELECTION_POLL_MS - 1_000)) {
        const cached = queryClient.getQueryData<Awaited<ReturnType<typeof fetchOngoingElection>>>(
          ONGOING_ELECTION_QUERY_KEY,
        )
        if (cached !== undefined) return cached
      }
      return fetchOngoingElection()
    },
    staleTime: ONGOING_ELECTION_STALE_MS,
    refetchInterval: () => (poll && documentVisible ? ONGOING_ELECTION_POLL_MS : false),
    refetchIntervalInBackground: false,
  })
}
