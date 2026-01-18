/**
 * Custom Redux Hooks
 * 
 * Provides type-safe hooks for accessing Redux store:
 * - useAppDispatch: Typed dispatch hook
 * - useAppSelector: Typed selector hook
 * 
 * These hooks should be used instead of plain `useDispatch` and `useSelector`
 * to ensure type safety throughout the application.
 * 
 * @see Requirements 2.4
 */

import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

/**
 * Type-safe dispatch hook
 * 
 * Use this instead of plain `useDispatch` to get proper typing
 * for async thunks and action creators.
 * 
 * @example
 * const dispatch = useAppDispatch();
 * dispatch(someAction(payload));
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * Type-safe selector hook
 * 
 * Use this instead of plain `useSelector` to get proper typing
 * for the state parameter.
 * 
 * @example
 * const polls = useAppSelector((state) => state.poll.history);
 * const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
 */
export const useAppSelector = <T>(selector: (state: RootState) => T): T =>
  useSelector(selector);

/**
 * Hook to get the entire root state (use sparingly)
 * 
 * Prefer using specific selectors to avoid unnecessary re-renders.
 */
export const useAppState = (): RootState => useSelector((state: RootState) => state);
