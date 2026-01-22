declare module "whois-json" {
  interface WhoisOptions {
    timeout?: number;
    follow?: number;
    verbose?: boolean;
  }

  function whois(domain: string, options?: WhoisOptions): Promise<Record<string, unknown>>;
  export = whois;
}
