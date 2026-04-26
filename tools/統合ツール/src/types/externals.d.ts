declare global {
  interface Window {
    JSZip?: unknown;
    alasql?: unknown;
    cytoscape?: unknown;
    dagre?: unknown;
    JSONEditor?: unknown;
    Toastify?: unknown;
    driver?: unknown;
    ExcelJS?: unknown;
    XLSX?: unknown;
    mermaid?: unknown;
    __KUS_AUTOBOOT__?: boolean;
    __KUS_DIFF_WIN__?: Window | null;
    [key: `__KUS_${string}`]: unknown;
  }
}

export {};
