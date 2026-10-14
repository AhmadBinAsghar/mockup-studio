"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Template } from "@/types";

export const MAX_HISTORY = 100;

export interface History {
  past: Template[];
  present: Template;
  future: Template[];
}

export function startHistory(present: Template): History {
  return { past: [], present, future: [] };
}

/** Records a new draft. With `merge`, it replaces the current one instead of adding an undo step. */
export function record(history: History, next: Template, merge: boolean): History {
  if (next === history.present) return history;
  if (merge) return { ...history, present: next };
  return { past: [...history.past, history.present].slice(-MAX_HISTORY), present: next, future: [] };
}

export function undo(history: History): History {
  const previous = history.past[history.past.length - 1];
  if (!previous) return history;
  return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] };
}

export function redo(history: History): History {
  const [next, ...rest] = history.future;
  if (!next) return history;
  return { past: [...history.past, history.present], present: next, future: rest };
}

/**
 * The builder's draft with undo and redo. One mouse drag, slider drag or key hold counts as a
 * single step: edits made while a gesture is in progress are merged, and the gesture ends when
 * the pointer or key is released.
 */
export function useDraftHistory(initial: () => Template) {
  const [history, setHistory] = useState(() => startHistory(initial()));
  const gesture = useRef(false);

  useEffect(() => {
    const end = () => {
      gesture.current = false;
    };
    const events = ["pointerup", "pointercancel", "keyup"] as const;
    events.forEach((name) => document.addEventListener(name, end, true));
    return () => events.forEach((name) => document.removeEventListener(name, end, true));
  }, []);

  const set = useCallback((next: Template) => {
    const merge = gesture.current;
    gesture.current = true;
    setHistory((h) => record(h, next, merge));
  }, []);
  const undoStep = useCallback(() => {
    gesture.current = false;
    setHistory(undo);
  }, []);
  const redoStep = useCallback(() => {
    gesture.current = false;
    setHistory(redo);
  }, []);

  return {
    draft: history.present,
    set,
    undo: undoStep,
    redo: redoStep,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
