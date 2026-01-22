import { NextRequest, NextResponse } from "next/server";
import whoiser from "whoiser";
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
  entities?: Array<{
    roles?: string[];
    vcardArray?: unknown[];
    publicIds?: Array<{ type?: string; identifier?: string }>;
    entities?: Array<{ roles?: string[]; vcardArray?: unknown[] }>;
  }>;
  secureDNS?: {
    delegationSigned?: boolean;
    maxSigLife?: number;
  };
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
  "Domain Name",
  "Registrar",
  "Registrant Organization",
  "Creation Date",
  "Created Date",
  "Registry Expiry Date",
  "Registrar Registration Expiration Date",
  "Updated Date",
  "Name Server",
  "Nameserver",
  "Registry Domain ID",
  "Registrar WHOIS Server",
  "Registrar URL",
];

function isDomainTaken(data: Record<string, unknown> | null): boolean {
  if (!data) return false;
  if (typeof data !== "object") return false;
  if (Object.keys(data).length === 0) return false;

  const textField = data["Text"] || data["text"];
  if (textField) {
    const textString = Array.isArray(textField) ? textField.join(" ") : String(textField);
    const lowerText = textString.toLowerCase();
    if (
      lowerText.includes("not found") ||
      lowerText.includes("no match") ||
      lowerText.includes("no entries found") ||
      lowerText.includes("no data found") ||
      lowerText.includes("domain not found")
    ) {
      return false;
    }
  }

  return UNAVAILABLE_INDICATORS.some((key) => {
    const value = data[key];
    if (value === undefined || value === null || value === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  });
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
      const lastChangedEvent = rdapData.events.find((e) => e.eventAction === "last changed");
      if (lastChangedEvent?.eventDate) {
        whoisData.updatedDate = lastChangedEvent.eventDate;
      }
    }
    if (rdapData.status) {
      whoisData["Domain Status"] = rdapData.status;
    }
    if (rdapData.entities) {
      const registrar = rdapData.entities.find((e) => e.roles?.includes("registrar"));
      if (registrar) {
        const registrarName = extractVcardField(registrar.vcardArray, "fn");
        whoisData.registrar = registrarName || "Registrar";

        const registrarId = registrar.publicIds?.find((id: { type?: string }) => id.type === "IANA Registrar ID");
        if (registrarId && "identifier" in registrarId) {
          whoisData["Registrar IANA ID"] = registrarId.identifier;
        }

        const abuseEntity = registrar.entities?.find((e: { roles?: string[] }) => e.roles?.includes("abuse"));
        if (abuseEntity) {
          const abuseEmail = extractVcardField(abuseEntity.vcardArray, "email");
          const abusePhone = extractVcardField(abuseEntity.vcardArray, "tel");
          if (abuseEmail) whoisData["Abuse Contact Email"] = abuseEmail;
          if (abusePhone) whoisData["Abuse Contact Phone"] = abusePhone;
        }
      }
    }
    if (rdapData.secureDNS) {
      whoisData["DNSSEC"] = rdapData.secureDNS.delegationSigned ? "signed" : "unsigned";
    }
  }
  return whoisData;
}

function extractVcardField(vcardArray: unknown, fieldName: string): string | null {
  if (!Array.isArray(vcardArray) || vcardArray.length < 2) return null;
  const vcardData = vcardArray[1];
  if (!Array.isArray(vcardData)) return null;

  for (const entry of vcardData) {
    if (Array.isArray(entry) && entry.length >= 4 && entry[0] === fieldName) {
      return String(entry[3] || "");
    }
  }
  return null;
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

  let whoisData: Record<string, unknown> | null = null;
  let whoisTaken = false;

  try {
    const whoiserResult = await whoiser(fullDomain, { timeout: 8000 });

    if (whoiserResult && typeof whoiserResult === 'object') {
      const servers = Object.keys(whoiserResult);
      if (servers.length > 0) {
        const firstServerData = whoiserResult[servers[0]];
        if (firstServerData && typeof firstServerData === 'object') {
          whoisData = firstServerData as Record<string, unknown>;
          whoisTaken = isDomainTaken(whoisData);
        }
      }
    }
  } catch (whoisError) {
    const whoisErrorMessage = whoisError instanceof Error ? whoisError.message : String(whoisError);
    const isNotFound =
      whoisErrorMessage.toLowerCase().includes("no match") ||
      whoisErrorMessage.toLowerCase().includes("not found") ||
      whoisErrorMessage.toLowerCase().includes("no entries found") ||
      whoisErrorMessage.toLowerCase().includes("no data found");

    if (isNotFound) {
      let rdapData: Record<string, unknown> | null = null;
      let rdapTaken = false;

      try {
        const rdapResult = await lookupRdap(fullDomain, tld);
        rdapTaken = isDomainTakenFromRdap(rdapResult);
        rdapData = convertRdapToWhoisFormat(rdapResult);
      } catch (rdapError) {
        return {
          available: true,
          whoisData: null,
        };
      }

      return {
        available: !rdapTaken,
        whoisData: rdapTaken && Object.keys(rdapData).length > 0 ? rdapData : null,
      };
    }

    let rdapData: Record<string, unknown> | null = null;
    let rdapTaken = false;

    try {
      const rdapResult = await lookupRdap(fullDomain, tld);
      rdapTaken = isDomainTakenFromRdap(rdapResult);
      rdapData = convertRdapToWhoisFormat(rdapResult);
    } catch (rdapError) {
      return {
        available: false,
        whoisData: null,
        error: `Lookup failed: ${whoisErrorMessage}`,
      };
    }

    return {
      available: !rdapTaken,
      whoisData: rdapTaken && Object.keys(rdapData).length > 0 ? rdapData : null,
    };
  }

  const textField = whoisData?.["Text"] || whoisData?.["text"];
  const textString = textField ? (Array.isArray(textField) ? textField.join(" ") : String(textField)) : "";
  const isTldNotSupported = textString.toLowerCase().includes("tld is not supported");

  if (isTldNotSupported) {
    const rdapServer = await getRdapServer(tld);
    if (rdapServer) {
      let rdapData: Record<string, unknown> | null = null;
      let rdapTaken = false;

      try {
        const rdapResult = await lookupRdap(fullDomain, tld);
        rdapTaken = isDomainTakenFromRdap(rdapResult);
        rdapData = convertRdapToWhoisFormat(rdapResult);
      } catch (rdapError) {
      }

      return {
        available: !rdapTaken,
        whoisData: rdapTaken && rdapData && Object.keys(rdapData).length > 0 ? rdapData : null,
      };
    } else {
      return {
        available: !whoisTaken,
        whoisData: whoisTaken && whoisData && Object.keys(whoisData).length > 0 ? whoisData : null,
      };
    }
  }

  let rdapData: Record<string, unknown> | null = null;
  let rdapTaken = false;

  try {
    const rdapResult = await lookupRdap(fullDomain, tld);
    rdapTaken = isDomainTakenFromRdap(rdapResult);
    rdapData = convertRdapToWhoisFormat(rdapResult);
  } catch (rdapError) {
  }

  const mergedData: Record<string, unknown> = {
    ...rdapData,
    ...whoisData,
  };

  const taken = whoisTaken || rdapTaken;

  return {
    available: !taken,
    whoisData: taken && Object.keys(mergedData).length > 0 ? mergedData : null,
  };
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
