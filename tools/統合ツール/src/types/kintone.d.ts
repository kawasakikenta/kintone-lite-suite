declare global {
  interface Window {
    kintone?: KintoneGlobal;
    __KUS__?: Record<string, unknown>;
    __KUS_TOOL_WINDOW__?: Window | null;
    __KUS_BUNDLE_LOADING__?: boolean;
  }

  const kintone: KintoneGlobal | undefined;

  interface KintoneGlobal {
    api: KintoneApi;
    app: KintoneApp;
    getUser?: () => KintoneUser;
    getLoginUser?: () => KintoneUser;
    events?: {
      on: (event: string | string[], handler: (e: unknown) => unknown) => void;
      off: (event: string | string[], handler?: (e: unknown) => unknown) => void;
    };
    [key: string]: any;
  }

  interface KintoneApi {
    (
      pathOrUrl: string,
      method: string,
      params: Record<string, unknown>,
      callback?: (resp: unknown) => void,
      errback?: (err: unknown) => void
    ): Promise<unknown>;
    url: (path: string, detectGuestSpace?: boolean) => string;
    urlForGet: (path: string, params: Record<string, unknown>, detectGuestSpace?: boolean) => string;
    getConcurrencyLimit?: () => number;
  }

  interface KintoneApp {
    getId: () => number | null;
    getQuery?: () => string | null;
    getQueryCondition?: () => string | null;
    record: {
      get: <T = KintoneRecord>() => { record: T };
      set: <T = KintoneRecord>(record: { record: T }) => void;
    };
  }

  interface KintoneUser {
    id: string;
    code: string;
    name: string;
    email: string;
    language: string;
  }
}

export type KintoneFieldValue = {
  value: unknown;
  type?: string;
};

export type KintoneRecord = Record<string, KintoneFieldValue>;

export type KintoneAppId = number | string;

export interface KintoneFieldProperty {
  type: string;
  code: string;
  label: string;
  noLabel?: boolean;
  required?: boolean;
  unique?: boolean;
  defaultValue?: unknown;
  options?: Record<string, { label: string; index: string }>;
  fields?: Record<string, KintoneFieldProperty>;
  [key: string]: unknown;
}

export type KintoneFieldsResponse = {
  properties: Record<string, KintoneFieldProperty>;
  revision: string;
};

export {};
