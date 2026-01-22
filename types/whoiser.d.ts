declare module "whoiser" {
  interface WhoiserOptions {
    timeout?: number;
    follow?: number;
    raw?: boolean;
    ignorePrivacy?: boolean;
  }

  type WhoiserResult = Record<string, Record<string, unknown>>;

  function whoiser(domain: string, options?: WhoiserOptions): Promise<WhoiserResult>;

  namespace whoiser {
    function domain(domain: string, options?: WhoiserOptions): Promise<WhoiserResult>;
    function ip(ip: string, options?: WhoiserOptions): Promise<WhoiserResult>;
    function asn(asn: string, options?: WhoiserOptions): Promise<WhoiserResult>;
  }

  export = whoiser;
}
