import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import { documentApi } from './documentApi'
import { subtaskApi } from './subtaskApi'
import { editsReducer } from './editsSlice'
import { subtaskEditsReducer } from './subtaskEditsSlice'

export const store = configureStore({
  reducer: {
    [documentApi.reducerPath]: documentApi.reducer,
    [subtaskApi.reducerPath]: subtaskApi.reducer,
    edits: editsReducer,
    editsSubtasks: subtaskEditsReducer,
  },
  middleware: (getDefault) =>
    getDefault().concat(documentApi.middleware).concat(subtaskApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
