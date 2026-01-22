import { NextRequest, NextResponse } from "next/server";
import { rateLimit, isOriginAllowed } from "@/lib/rate-limit";

const POPULAR_TLDS = [
  "com",
  "net",
  "org",
  "io",
  "dev",
  "app",
  "co",
  "ai",
  "xyz",
  "tech",
  "online",
  "store",
  "site",
  "blog",
  "cloud",
  "me",
  "info",
  "biz",
  "tv",
  "us",
  "uk",
  "ca",
  "au",
  "de",
  "fr",
  "jp",
  "cn",
  "in",
  "ru",
  "br",
];

interface CacheEntry {
  tlds: string[];
  timestamp: number;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000;
let cachedTlds: CacheEntry | null = null;

async function fetchIanaTlds(): Promise<string[]> {
  try {
    const response = await fetch("https://data.iana.org/TLD/tlds-alpha-by-domain.txt", {
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch IANA TLDs: ${response.status}`);
    }

    const text = await response.text();
    const lines = text.split("\n");

    const tlds: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.length > 0) {
        const tld = trimmed.toLowerCase();
        if (tld && tld.length >= 2) {
          tlds.push(tld);
        }
      }
    }

    return tlds;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching IANA TLDs:", error);
    }
    return POPULAR_TLDS;
  }
}

export async function GET(request: NextRequest) {
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

    const now = Date.now();
    if (cachedTlds && now - cachedTlds.timestamp < CACHE_DURATION) {
      return NextResponse.json(
        {
          tlds: cachedTlds.tlds,
          popular: POPULAR_TLDS,
        },
        {
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": new Date(rateLimitResult.reset).toISOString(),
          },
        }
      );
    }

    const allTlds = await fetchIanaTlds();

    const sortedTlds = [
      ...POPULAR_TLDS.filter((tld) => allTlds.includes(tld)),
      ...allTlds.filter((tld) => !POPULAR_TLDS.includes(tld)).sort((a, b) => a.localeCompare(b)),
    ];

    cachedTlds = {
      tlds: sortedTlds,
      timestamp: now,
    };

    return NextResponse.json(
      {
        tlds: sortedTlds,
        popular: POPULAR_TLDS,
      },
      {
        headers: {
          "X-RateLimit-Limit": rateLimitResult.limit.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          "X-RateLimit-Reset": new Date(rateLimitResult.reset).toISOString(),
        },
      }
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error in TLDs API:", error);
    }
    return NextResponse.json(
      { error: "Failed to fetch TLDs", tlds: POPULAR_TLDS, popular: POPULAR_TLDS },
      { status: 500 }
    );
  }
}
