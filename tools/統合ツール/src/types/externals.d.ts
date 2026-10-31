declare global {
  interface Window {
    JSZip?: unknown;
    cytoscape?: unknown;
    dagre?: unknown;
    ExcelJS?: unknown;
    XLSX?: unknown;
    mermaid?: unknown;
    __KUS_DIFF_WIN__?: Window | null;
    [key: `__KUS_${string}`]: unknown;
  }
}

export {};
