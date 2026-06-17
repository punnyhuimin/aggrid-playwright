import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import { mockCompanyDoc, type CompanyDoc } from '../rtkEditDemo/mockServerDoc'

export const documentApi = createApi({
  reducerPath: 'api',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Document'],
  // Prevent RTKQuery from evicting the cache when the user switches tabs
  // and no component subscribes to the query. Edits must survive navigation.
  keepUnusedDataFor: Infinity,
  endpoints: (build) => ({
    getDocument: build.query<CompanyDoc, string>({
      queryFn: () => ({ data: mockCompanyDoc }),
      keepUnusedDataFor: Infinity,
    }),
    saveDocument: build.mutation<void, CompanyDoc>({
      queryFn: async () => {
        // Simulate a 700 ms network round-trip
        await new Promise<void>((resolve) => setTimeout(resolve, 700))
        return { data: undefined }
      },
    }),
  }),
})

export const { useGetDocumentQuery, useSaveDocumentMutation } = documentApi
