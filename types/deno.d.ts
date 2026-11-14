declare module 'npm:zod' {
  export * from 'zod';
  export { z } from 'zod';
}

declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
    toObject(): Record<string, string>;
  };

  export function serve(handler: (req: Request) => Response | Promise<Response>): unknown;
}
