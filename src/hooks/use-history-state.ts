"use client";

import { useCallback, useReducer, useRef } from "react";

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

type Action<T> =
  | { type: "set"; value: T; coalesce: boolean }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; value: T };

const LIMIT = 100;

export function historyReducer<T>(state: HistoryState<T>, action: Action<T>): HistoryState<T> {
  switch (action.type) {
    case "set":
      if (Object.is(action.value, state.present)) return state;
      if (action.coalesce && state.past.length > 0) return { ...state, present: action.value, future: [] };
      return { past: [...state.past, state.present].slice(-LIMIT), present: action.value, future: [] };
    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return { past: [...state.past, state.present], present: next, future: rest };
    }
    case "reset":
      return { past: [], present: action.value, future: [] };
  }
}

/**
 * Undo/redo state. Consecutive edits that share a `coalesceKey` within 600 ms
 * (e.g. typing in one field) are merged into a single undo step.
 */
export function useHistoryState<T>(initial: T | (() => T)) {
  const [state, dispatch] = useReducer(historyReducer<T>, initial, (init): HistoryState<T> => ({
    past: [],
    present: typeof init === "function" ? (init as () => T)() : init,
    future: [],
  }));
  const last = useRef<{ key: string | null; at: number }>({ key: null, at: 0 });

  const set = useCallback((value: T, coalesceKey?: string) => {
    const now = Date.now();
    const coalesce = !!coalesceKey && last.current.key === coalesceKey && now - last.current.at < 600;
    last.current = { key: coalesceKey ?? null, at: now };
    dispatch({ type: "set", value, coalesce });
  }, []);

  const undo = useCallback(() => {
    last.current = { key: null, at: 0 };
    dispatch({ type: "undo" });
  }, []);
  const redo = useCallback(() => {
    last.current = { key: null, at: 0 };
    dispatch({ type: "redo" });
  }, []);
  const reset = useCallback((value: T) => dispatch({ type: "reset", value }), []);

  return {
    value: state.present,
    set,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
