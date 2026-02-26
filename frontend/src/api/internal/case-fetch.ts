/* eslint-disable @typescript-eslint/no-explicit-any */
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  Object.prototype.toString.call(v) === '[object Object]';

const toCamel = (s: string) =>
  s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const toSnake = (s: string) =>
  s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`).replace(/^_/, '');

const camelizeDeep = (v: any): any => {
  if (Array.isArray(v)) return v.map(camelizeDeep);
  if (isPlainObject(v)) {
    const out: Record<string, any> = {};
    for (const [k, val] of Object.entries(v))
      out[toCamel(k)] = camelizeDeep(val);
    return out;
  }
  return v;
};

const snakifyDeep = (v: any): any => {
  if (Array.isArray(v)) return v.map(snakifyDeep);
  if (isPlainObject(v)) {
    const out: Record<string, any> = {};
    for (const [k, val] of Object.entries(v))
      out[toSnake(k)] = snakifyDeep(val);
    return out;
  }
  return v;
};

// Orval fetch mutator: (url, RequestInit) => Promise<T>
export const customFetch = async <T>(
  url: string,
  init?: RequestInit,
): Promise<T> => {
  const nextInit: RequestInit = init ? { ...init } : {};
  const headers = new Headers(nextInit.headers);

  // 只处理 JSON body
  const contentType = headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (isJson && typeof nextInit.body === 'string') {
    try {
      const parsed = JSON.parse(nextInit.body);
      nextInit.body = JSON.stringify(snakifyDeep(parsed));
    } catch {
      // 不是 JSON 字符串就跳过
    }
  }

  const res = await fetch(url, { ...nextInit, headers });

  // 按 orval fetch 默认结构返回：{ status, data }
  const resContentType = res.headers.get('content-type') ?? '';
  const resIsJson = resContentType.includes('application/json');

  const data = resIsJson ? camelizeDeep(await res.json()) : await res.text();
  return { status: res.status, data } as any as T;
};

export default customFetch;
