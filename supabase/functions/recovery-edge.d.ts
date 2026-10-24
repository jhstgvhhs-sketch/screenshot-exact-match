// Local checking of Edge handlers without downloading the remote SDK from esm.sh.
// The Supabase API types come from the repository's installed official SDK.
declare module "https://esm.sh/@supabase/supabase-js@2.57.0" {
  export const createClient: typeof import("@supabase/supabase-js").createClient;
}
declare namespace Deno {
  const env: { get(name: string): string | undefined };
  function serve(handler: (request: Request) => Response | Promise<Response>): void;
}
