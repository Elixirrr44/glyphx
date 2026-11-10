/** Tiny in-memory store that drives the global Unicode inspector dialog. */

export interface InspectorState {
  open: boolean;
  text: string;
  title: string;
}

let state: InspectorState = { open: false, text: "", title: "" };
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export const inspectorStore = {
  get: () => state,
  getServerSnapshot: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  open(text: string, title = "Unicode inspector") {
    state = { open: true, text, title };
    notify();
  },
  close() {
    state = { ...state, open: false };
    notify();
  },
};

export const openInspector = (text: string, title?: string) => inspectorStore.open(text, title);
