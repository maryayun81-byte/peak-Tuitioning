'use client';

import { useState, useEffect } from 'react';

// ⚠️ CRITICAL: Excalidraw CSS must be imported for the canvas to work correctly.
// Without this, the toolbar renders vertically and pointer events are broken.
import '@excalidraw/excalidraw/index.css';

interface ExcalidrawWrapperProps {
  initialData?: {
    elements?: any[];
    appState?: Record<string, any>;
  };
  onChange?: (elements: any[], appState: any, files: any) => void;
  viewModeEnabled?: boolean;
  zenModeEnabled?: boolean;
  libraryItems?: any[];
  excalidrawApiRef?: React.MutableRefObject<any>;
}

export default function ExcalidrawWrapper({
  initialData,
  onChange,
  viewModeEnabled = false,
  zenModeEnabled = false,
  libraryItems = [],
  excalidrawApiRef,
}: ExcalidrawWrapperProps) {
  const [ExcalidrawComponent, setExcalidrawComponent] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    import('@excalidraw/excalidraw')
      .then((mod) => {
        setExcalidrawComponent(() => mod.Excalidraw);
      })
      .catch((err) => {
        console.error('Failed to load Excalidraw:', err);
        setLoadError('Could not load the drawing engine. Please reload the page.');
      });
  }, []);

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-slate-700 dark:text-slate-300 font-bold mb-2">Drawing Engine Error</p>
          <p className="text-slate-500 text-sm">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!ExcalidrawComponent) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 dark:border-indigo-900 rounded-full" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-black text-slate-700 dark:text-slate-300 tracking-widest uppercase text-xs">Loading Draw Studio</p>
            <p className="text-xs text-slate-400 mt-1">Initializing canvas engine...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <ExcalidrawComponent
        ref={(api: any) => {
          if (excalidrawApiRef) excalidrawApiRef.current = api;
        }}
        initialData={{
          elements: initialData?.elements ?? [],
          appState: {
            viewBackgroundColor: '#f8fafc',
            gridSize: null,
            ...initialData?.appState,
          },
          libraryItems: libraryItems,
        }}
        onChange={onChange}
        viewModeEnabled={viewModeEnabled}
        zenModeEnabled={zenModeEnabled}
        gridModeEnabled={false}
        theme="light"
        name="Chemistry Draw Studio"
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: true,
            clearCanvas: true,
            export: {
              saveFileToDisk: true,
              exportToBackend: undefined,
            },
            loadScene: true,
            saveToActiveFile: true,
            toggleTheme: true,
            saveAsImage: true,
          },
          tools: {
            image: true,
          },
        }}
      />
      <style>{`
        .excalidraw {
          --color-primary: #4f46e5 !important;
          --color-primary-darker: #4338ca !important;
          --color-primary-darkest: #3730a3 !important;
          --color-primary-light: #eef2ff !important;
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}
