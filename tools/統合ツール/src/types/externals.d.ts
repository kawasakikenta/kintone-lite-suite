declare global {
  interface Window {
    cytoscape?: unknown;
    dagre?: unknown;
    ExcelJS?: unknown;
    mermaid?: unknown;
    __KUS_DIFF_WIN__?: Window | null;
    [key: `__KUS_${string}`]: unknown;
  }
}

export {};
