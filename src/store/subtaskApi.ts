import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import { mockCompanyDoc, extractSubtaskEntities, type SubtaskEntity } from '../rtkEditDemo/mockServerDoc'

// Simulated subtask microservice — owns a flat list of subtask entities keyed by taskId.
const allSubtasks: SubtaskEntity[] = extractSubtaskEntities(mockCompanyDoc)

export const subtaskApi = createApi({
  reducerPath: 'subtaskApi',
  baseQuery: fakeBaseQuery(),
  keepUnusedDataFor: Infinity,
  endpoints: (build) => ({
    getSubtasksByTask: build.query<SubtaskEntity[], string>({
      queryFn: (taskId) => ({
        data: allSubtasks.filter((s) => s.taskId === taskId),
      }),
      keepUnusedDataFor: Infinity,
    }),

    saveSubtasks: build.mutation<void, SubtaskEntity[]>({
      queryFn: async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 700))
        return { data: undefined }
      },
    }),
  }),
})

export const { useGetSubtasksByTaskQuery, useSaveSubtasksMutation } = subtaskApi
