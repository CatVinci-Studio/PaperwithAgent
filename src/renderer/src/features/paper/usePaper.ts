import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { PaperPatch } from '@shared/types'
import { api } from '@/lib/ipc'

export function usePaperDetail(id: string | null) {
  return useQuery({
    queryKey: ['paper', id],
    queryFn: () => api.papers.get(id!),
    enabled: !!id,
    staleTime: 5000,
  })
}

export function useUpdatePaper() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: PaperPatch }) =>
      api.papers.update(id, patch),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['paper', id] })
      qc.invalidateQueries({ queryKey: ['papers'] })
    },
  })
}

export function usePdfPath(id: string | null) {
  return useQuery({
    queryKey: ['pdf-path', id],
    queryFn: () => api.pdf.getPath(id!),
    enabled: !!id,
    staleTime: 60000,
  })
}
