import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import { documentApi } from './documentApi'
import { editsReducer } from './editsSlice'

export const store = configureStore({
  reducer: {
    [documentApi.reducerPath]: documentApi.reducer,
    edits: editsReducer,
  },
  middleware: (getDefault) => getDefault().concat(documentApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
