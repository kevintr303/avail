import { NextRequest, NextResponse } from "next/server";
import { rateLimit, isOriginAllowed } from "@/lib/rate-limit";
import tldsData from "@/config/tlds.json";

const POPULAR_TLDS = [
  "com",
  "net",
  "org",
  "co",
  "us",
  "io",
  "ai",
  "app",
  "xyz",
  "info",
  "shop",
  "online",
  "store",
  "site",
  "tech",
  "club",
  "me",
  "dev",
  "cloud",
  "live",
  "digital",
  "design",
  "pro",
  "vip",
  "work",
  "top",
  "life",
  "world",
  "space",
  "media",
  "agency",
  "services",
  "studio",
  "today",
  "news",
  "blog",
  "link",
  "click",
  "bet",
  "wiki",
  "guru",
  "photography",
  "expert",
  "group",
  "solutions",
  "marketing",
  "email",
  "company",
  "network",
  "website"
];

function getTlds(): string[] {
  const allTlds = (tldsData.tlds || []).map((tld) => tld.toLowerCase());

  const sortedTlds = [
    ...POPULAR_TLDS.filter((tld) => allTlds.includes(tld)),
    ...allTlds.filter((tld) => !POPULAR_TLDS.includes(tld)).sort((a, b) => a.localeCompare(b)),
  ];

  return sortedTlds;
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

    const sortedTlds = getTlds();

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
      { error: "Failed to load TLDs", tlds: POPULAR_TLDS, popular: POPULAR_TLDS },
      { status: 500 }
    );
  }
}
