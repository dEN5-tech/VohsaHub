import { useState, useRef } from 'preact/hooks';
import type { RefObject } from 'preact';

export interface UseResizablePanelsOptions {
  initialExplorerWidth?: number;
  initialSplitPercent?: number;
}

export interface UseResizablePanelsReturn {
  explorerWidth: number;
  splitPercent: number;
  isResizing: boolean;
  mainSplitContainerRef: RefObject<HTMLDivElement>;
  handleExplorerResizeStart: (e: MouseEvent) => void;
  handleSplitResizeStart: (e: MouseEvent) => void;
  resetExplorerWidth: () => void;
  resetSplitPercent: () => void;
}

export function useResizablePanels(options: UseResizablePanelsOptions = {}): UseResizablePanelsReturn {
  const { initialExplorerWidth = 240, initialSplitPercent = 50 } = options;

  const [explorerWidth, setExplorerWidth] = useState<number>(initialExplorerWidth);
  const [splitPercent, setSplitPercent] = useState<number>(initialSplitPercent);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const mainSplitContainerRef = useRef<HTMLDivElement>(null);

  const handleExplorerResizeStart = (e: MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = explorerWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.max(150, Math.min(650, startWidth + delta));
      setExplorerWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleSplitResizeStart = (e: MouseEvent) => {
    e.preventDefault();
    if (!mainSplitContainerRef.current) return;
    setIsResizing(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!mainSplitContainerRef.current) return;
      const rect = mainSplitContainerRef.current.getBoundingClientRect();
      const relativeX = moveEvent.clientX - rect.left;
      const nextPercent = (relativeX / rect.width) * 100;
      const clamped = Math.max(15, Math.min(85, nextPercent));
      setSplitPercent(clamped);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const resetExplorerWidth = () => setExplorerWidth(240);
  const resetSplitPercent = () => setSplitPercent(50);

  return {
    explorerWidth,
    splitPercent,
    isResizing,
    mainSplitContainerRef,
    handleExplorerResizeStart,
    handleSplitResizeStart,
    resetExplorerWidth,
    resetSplitPercent,
  };
}
