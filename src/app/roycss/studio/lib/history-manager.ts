/**
 * History Manager
 * @module roycss/studio/lib/history-manager
 * @description Undo/redo functionality for the editor
 */

import { useEditorStore, CanvasElement } from './editor-state';

/** History entry */
interface HistoryEntry {
  timestamp: number;
  action: string;
  elements: Record<string, CanvasElement>;
  selectedId: string | null;
}

/** Maximum history entries */
const MAX_HISTORY = 50;

class HistoryManager {
  private history: HistoryEntry[] = [];
  private currentIndex: number = -1;
  private isRecording: boolean = true;

  /**
   * Push a new state to history
   */
  push(action: string): void {
    if (!this.isRecording) return;

    const state = useEditorStore.getState();
    
    // Remove any future states if we're not at the end
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Create new entry
    const entry: HistoryEntry = {
      timestamp: Date.now(),
      action,
      elements: JSON.parse(JSON.stringify(state.elements)),
      selectedId: state.selectedElementId
    };

    // Add to history
    this.history.push(entry);

    // Trim if too long
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }

    // Update store
    useEditorStore.setState({
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    });
  }

  /**
   * Undo last action
   */
  undo(): HistoryEntry | null {
    if (!this.canUndo()) return null;

    this.isRecording = false;
    this.currentIndex--;

    const entry = this.history[this.currentIndex];
    if (entry) {
      useEditorStore.setState({
        elements: JSON.parse(JSON.stringify(entry.elements)),
        selectedElementId: entry.selectedId,
        canUndo: this.canUndo(),
        canRedo: this.canRedo()
      });
    }

    this.isRecording = true;
    return entry;
  }

  /**
   * Redo next action
   */
  redo(): HistoryEntry | null {
    if (!this.canRedo()) return null;

    this.isRecording = false;
    this.currentIndex++;

    const entry = this.history[this.currentIndex];
    if (entry) {
      useEditorStore.setState({
        elements: JSON.parse(JSON.stringify(entry.elements)),
        selectedElementId: entry.selectedId,
        canUndo: this.canUndo(),
        canRedo: this.canRedo()
      });
    }

    this.isRecording = true;
    return entry;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Get current history index
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * Get total history length
   */
  getLength(): number {
    return this.history.length;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
    useEditorStore.setState({ canUndo: false, canRedo: false });
  }

  /**
   * Get history for display
   */
  getHistory(): Array<{ action: string; timestamp: number; index: number }> {
    return this.history.map((entry, i) => ({
      action: entry.action,
      timestamp: entry.timestamp,
      index: i
    }));
  }
}

// Singleton instance
export const historyManager = new HistoryManager();

// Keyboard shortcuts
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Z = Undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      historyManager.undo();
    }
    
    // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y = Redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      historyManager.redo();
    }
  });
}

export default HistoryManager;
