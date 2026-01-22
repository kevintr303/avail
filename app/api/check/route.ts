import { NextRequest, NextResponse } from "next/server";
import whois from "whois-json";
import { rateLimit, isOriginAllowed } from "@/lib/rate-limit";

interface CheckRequest {
  domain: string;
  tlds: string[];
}

interface RdapResponse {
  handle?: string;
  ldhName?: string;
  nameservers?: Array<{ ldhName?: string }>;
  events?: Array<{ eventAction?: string; eventDate?: string }>;
  status?: string[];
  entities?: Array<{ roles?: string[]; vcardArray?: unknown[] }>;
}

interface BootstrapCache {
  mapping: Record<string, string>;
  timestamp: number;
}

const BOOTSTRAP_CACHE_DURATION = 24 * 60 * 60 * 1000;
let bootstrapCache: BootstrapCache | null = null;

async function loadRdapBootstrap(): Promise<Record<string, string>> {
  const now = Date.now();
  if (bootstrapCache && now - bootstrapCache.timestamp < BOOTSTRAP_CACHE_DURATION) {
    return bootstrapCache.mapping;
  }

  try {
    const response = await fetch("https://data.iana.org/rdap/dns.json", {
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch RDAP bootstrap: ${response.status}`);
    }

    const data = (await response.json()) as {
      services?: Array<[string[], string[]]>;
    };

    const mapping: Record<string, string> = {};

    if (data.services) {
      for (const [tlds, urls] of data.services) {
        if (tlds && urls && urls.length > 0) {
          const rdapBaseUrl = urls[0];
          for (const tld of tlds) {
            if (tld) {
              mapping[tld.toLowerCase()] = rdapBaseUrl;
            }
          }
        }
      }
    }

    bootstrapCache = {
      mapping,
      timestamp: now,
    };

    return mapping;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error loading RDAP bootstrap:", error);
    }
    return {};
  }
}

const UNAVAILABLE_INDICATORS = [
  "domainName",
  "registrantOrganization",
  "registrar",
  "creationDate",
  "registrarRegistrationExpirationDate",
  "updatedDate",
  "nameServer",
];

function isDomainTaken(data: Record<string, unknown> | null): boolean {
  if (!data) return false;
  if (typeof data !== "object") return false;
  if (Object.keys(data).length === 0) return false;

  return UNAVAILABLE_INDICATORS.some(
    (key) => data[key] !== undefined && data[key] !== null && data[key] !== ""
  );
}

function isDomainTakenFromRdap(rdapData: RdapResponse | null): boolean {
  if (!rdapData) return false;
  if (typeof rdapData !== "object") return false;

  return !!(
    rdapData.ldhName ||
    rdapData.handle ||
    rdapData.nameservers?.length ||
    rdapData.events?.length ||
    rdapData.status?.length
  );
}

async function getRdapServer(tld: string): Promise<string | null> {
  const bootstrapMapping = await loadRdapBootstrap();
  const rdapBaseUrl = bootstrapMapping[tld.toLowerCase()];
  if (rdapBaseUrl) {
    return rdapBaseUrl;
  }
  return null;
}

function constructRdapUrl(baseUrl: string, domain: string): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}/domain/${domain}`;
}

async function lookupRdap(domain: string, tld: string): Promise<RdapResponse | null> {
  try {
    const rdapBase = await getRdapServer(tld);

    if (!rdapBase) {
      throw new Error("No RDAP server available for this TLD");
    }

    const rdapUrl = constructRdapUrl(rdapBase, domain);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(rdapUrl, {
      signal: controller.signal,
      headers: {
        Accept: "application/rdap+json",
      },
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`RDAP lookup failed: ${response.status}`);
    }

    const data = (await response.json()) as RdapResponse;
    return data;
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    throw error;
  }
}

function convertRdapToWhoisFormat(rdapData: RdapResponse | null): Record<string, unknown> {
  const whoisData: Record<string, unknown> = {};
  if (rdapData) {
    if (rdapData.ldhName) whoisData.domainName = rdapData.ldhName;
    if (rdapData.nameservers) {
      whoisData.nameServer = rdapData.nameservers.map((ns) => ns.ldhName).filter(Boolean);
    }
    if (rdapData.events) {
      const creationEvent = rdapData.events.find((e) => e.eventAction === "registration");
      if (creationEvent?.eventDate) {
        whoisData.creationDate = creationEvent.eventDate;
      }
      const expirationEvent = rdapData.events.find((e) => e.eventAction === "expiration");
      if (expirationEvent?.eventDate) {
        whoisData.registrarRegistrationExpirationDate = expirationEvent.eventDate;
      }
    }
    if (rdapData.entities) {
      const registrar = rdapData.entities.find((e) => e.roles?.includes("registrar"));
      if (registrar) {
        whoisData.registrar = "Registrar";
      }
    }
  }
  return whoisData;
}

async function checkDomainAvailability(
  domain: string,
  tld: string
): Promise<{
  available: boolean;
  whoisData: Record<string, unknown> | null;
  error?: string;
}> {
  const fullDomain = `${domain}.${tld}`;

  try {
    const data = await whois(fullDomain, { timeout: 8000 });
    const whoisData = data as Record<string, unknown>;
    const taken = isDomainTaken(whoisData);

    return {
      available: !taken,
      whoisData: taken ? whoisData : null,
    };
  } catch (whoisError: unknown) {
    const errorMessage = whoisError instanceof Error ? whoisError.message : String(whoisError);
    const isNotFound =
      errorMessage.toLowerCase().includes("no match") ||
      errorMessage.toLowerCase().includes("not found") ||
      errorMessage.toLowerCase().includes("no entries found") ||
      errorMessage.toLowerCase().includes("no data found");

    if (isNotFound) {
      return {
        available: true,
        whoisData: null,
      };
    }

    try {
      const rdapData = await lookupRdap(fullDomain, tld);
      const taken = isDomainTakenFromRdap(rdapData);
      const whoisData = convertRdapToWhoisFormat(rdapData);

      return {
        available: !taken,
        whoisData: taken ? whoisData : null,
      };
    } catch (rdapError) {
      const rdapErrorMessage = rdapError instanceof Error ? rdapError.message : String(rdapError);
      return {
        available: false,
        whoisData: null,
        error: `Lookup failed: ${rdapErrorMessage}`,
      };
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isOriginAllowed(request)) {
      return NextResponse.json({ error: "Unauthorized origin" }, { status: 403 });
    }

    const rateLimitResult = rateLimit(request);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(rateLimitResult.reset).toISOString(),
          },
        }
      );
    }

    const body: CheckRequest = await request.json();
    const { domain, tlds } = body;

    if (!domain || !tlds || tlds.length === 0) {
      return NextResponse.json({ error: "Domain and TLDs are required" }, { status: 400 });
    }

    if (tlds.length > 100) {
      return NextResponse.json({ error: "Too many TLDs requested (max 100)" }, { status: 400 });
    }

    if (domain.length > 253) {
      return NextResponse.json(
        { error: "Domain name too long (max 253 characters)" },
        { status: 400 }
      );
    }

    const cleanDomain = domain
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");

    if (!cleanDomain) {
      return NextResponse.json({ error: "Invalid domain name" }, { status: 400 });
    }

    const results = await Promise.all(
      tlds.map(async (tld) => {
        const fullDomain = `${cleanDomain}.${tld}`;
        const result = await checkDomainAvailability(cleanDomain, tld);

        return {
          domain: fullDomain,
          available: result.available,
          whoisData: result.whoisData,
          ...(result.error && { error: result.error }),
        };
      })
    );

    return NextResponse.json(
      { results },
      {
        headers: {
          "X-RateLimit-Limit": rateLimitResult.limit.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          "X-RateLimit-Reset": new Date(rateLimitResult.reset).toISOString(),
        },
      }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
