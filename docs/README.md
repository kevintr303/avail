# Avail Documentation

Complete documentation for the Avail domain availability checker platform.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [API Reference](#api-reference)
- [Component Structure](#component-structure)
- [Configuration](#configuration)
- [Development Guide](#development-guide)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

Avail is built on **Next.js 16** using the App Router architecture, providing a modern, type-safe domain availability checking platform.

### Core Technologies

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **UI:** React 19
- **Styling:** Tailwind CSS 4
- **Components:** Radix UI primitives
- **Domain Lookup:** whois-json with RDAP fallback

### Project Structure

```
avail/
├── app/                        # Next.js App Router
│   ├── api/                    # API routes
│   │   ├── check/              # Domain availability checking
│   │   ├── tlds/               # TLD list endpoint
│   │   └── health/             # Health check endpoint
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Main page
│   └── globals.css             # Global styles
├── components/                 # React components
│   ├── ui/                     # Reusable UI components
│   ├── domain-checker.tsx      # Main domain checker component
│   ├── domain-search-panel.tsx # Domain search input and results
│   ├── whois-panel.tsx         # WHOIS information display
│   ├── split-layout.tsx        # Split-pane layout manager
│   ├── safari-window.tsx       # Window component wrapper
│   ├── search-history.tsx      # Search history component
│   ├── theme-selector.tsx      # Theme selection component
│   ├── custom-cursor.tsx       # Custom cursor component
│   └── error-boundary.tsx      # Error boundary component
├── config/                     # Configuration files
│   ├── constants.ts            # App constants
│   └── tlds.json               # TLD configuration
├── lib/                        # Utility libraries
│   ├── rate-limit.ts           # Rate limiting logic
│   ├── storage.ts              # Local storage utilities
│   ├── theme.ts                # Theme management
│   └── utils.ts                # General utilities
└── types/                      # TypeScript type definitions
```

## API Reference

### POST `/api/check`

Check domain availability across multiple TLDs.

#### Request Body

```typescript
{
  domain: string;    // Domain name without TLD (e.g., "example")
  tlds: string[];    // Array of TLDs to check (e.g., ["com", "net", "org"])
}
```

#### Response

```typescript
{
  results: Array<{
    domain: string; // Full domain (e.g., "example.com")
    available: boolean; // Availability status
    whoisData?: Record<string, unknown>; // WHOIS data if taken
    error?: string; // Error message if lookup failed
  }>;
}
```

#### Rate Limiting

- Rate limit headers included in response:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time (ISO 8601)

#### Error Responses

- `400 Bad Request`: Invalid domain or TLDs, too many TLDs (max 100), or domain too long (max 253 chars)
- `403 Forbidden`: Unauthorized origin
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

**Note:** The UI component limits TLD selection to 10 at once for better user experience, but the API endpoint accepts up to 100 TLDs per request.

#### Example

```bash
curl -X POST http://localhost:3000/api/check \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example",
    "tlds": ["com", "net", "org"]
  }'
```

### GET `/api/tlds`

Retrieve list of available TLDs.

#### Response

```typescript
{
  tlds: string[];        // All available TLDs (sorted, popular first)
  popular: string[];     // Popular TLDs subset (30 TLDs)
}
```

#### Rate Limiting

- Rate limit headers included in response (same as `/api/check`)
- `403 Forbidden`: Unauthorized origin
- `429 Too Many Requests`: Rate limit exceeded

#### Caching

- TLD list is cached for 24 hours in memory
- Fetched from IANA registry (`https://data.iana.org/TLD/tlds-alpha-by-domain.txt`)
- Falls back to 30 popular TLDs on error

#### Example

```bash
curl http://localhost:3000/api/tlds
```

### GET `/api/health`

Health check endpoint for monitoring.

#### Response

```typescript
{
  status: "ok";
  timestamp: string; // ISO 8601 timestamp
}
```

## Component Structure

### DomainChecker

Main orchestrator component that manages the application state.

**Location:** `components/domain-checker.tsx`

**Responsibilities:**

- Manages WHOIS window state
- Handles mobile/desktop layout switching
- Coordinates between search and WHOIS panels

**Key Props:** None (root component)

### DomainSearchPanel

Handles domain search input and results display.

**Location:** `components/domain-search-panel.tsx`

**Props:**

```typescript
{
  onResultClick: (result: DomainCheckResult) => void;
}
```

**Features:**

- Domain input validation
- TLD selection (single or multiple, max 10 TLDs at once in the UI)
- Search history management (max 50 entries, displays 8)
- Real-time availability checking
- TLD search and filtering

**Note:** While the UI limits selection to 10 TLDs at once, the API endpoint supports up to 100 TLDs per request.

### WhoisPanel

Displays detailed WHOIS information for a domain.

**Location:** `components/whois-panel.tsx`

**Props:**

```typescript
{
  result: DomainCheckResult;
  onClose: () => void;
}
```

**Features:**

- Formatted WHOIS data display
- Registration dates and registrar info
- Nameserver information
- Responsive layout

### SplitLayout

Manages split-pane layout for desktop and mobile views.

**Location:** `components/split-layout.tsx`

**Props:**

```typescript
{
  panels: Array<{ key: string; node: ReactNode }>;
  newKeys: Set<string>;
  isMobile: boolean;
  mobileActiveIndex: number;
  onMobileNavigate: (index: number) => void;
}
```

**Features:**

- Responsive split-pane layout
- Mobile swipe navigation
- Panel animations
- Window management

## Configuration

### Constants

**Location:** `config/constants.ts`

#### Window Configuration

```typescript
WINDOW_CONFIG = {
  windowPadding: "2.5rem", // Window padding
  gapBetweenPanels: "8", // Gap between panels
  mobileBreakpoint: 1366, // Mobile breakpoint (px)
};
```

#### Cursor Configuration

```typescript
CURSOR_CONFIG = {
  trailSize: 30, // Default trail size
  trailSizeHover: 44, // Hover trail size
  cursorSize: 10, // Cursor size
  cursorSizeClick: 7, // Click cursor size
  trailSmoothing: 0.12, // Trail smoothing factor
  trailOpacity: 0.2, // Default trail opacity
  trailOpacityHover: 0.5, // Hover trail opacity
};
```

#### Animation Configuration

```typescript
ANIMATION_CONFIG = {
  windowEntryDuration: 400, // Window entry animation (ms)
  resizeDuration: 400, // Resize animation (ms)
  staggerDelay: 40, // Stagger delay (ms)
  swipeThreshold: 50, // Swipe threshold (px)
  swipeVelocityThreshold: 0.3, // Swipe velocity threshold
};
```

#### Search Configuration

```typescript
SEARCH_CONFIG = {
  maxHistory: 50, // Maximum history entries
  maxHistoryDisplay: 8, // Maximum displayed entries
  maxHistoryDots: 5, // Maximum dots in truncated history
  whoisTimeout: 8000, // WHOIS lookup timeout (ms)
  defaultTlds: ["com", "net", "org", "io", "dev"],
};
```

### Rate Limiting

**Location:** `lib/rate-limit.ts`

Rate limiting is implemented to prevent abuse. Limits are applied per IP address.

**Current Limits:**

- Maximum requests: 10 per window
- Window duration: 60 seconds (1 minute)
- Origin validation: Enabled (only same-origin requests allowed)
- Cleanup interval: 5 minutes
- Maximum stored entries: 10,000 IP addresses

### Theme Management

**Location:** `lib/theme.ts`

Themes are managed through CSS custom properties and stored in cookies. The theme system includes 5 predefined color themes, each with a unique color palette (primary, secondary, tertiary, quaternary, quinary). Text colors are automatically calculated for WCAG AA accessibility compliance based on the background colors.

**Theme Features:**

- 5 predefined color themes
- Automatic text color calculation for accessibility
- Theme persistence via cookies
- Cookie expiry: 365 days

## Development Guide

### Prerequisites

- Node.js 18.x or higher
- npm, yarn, or pnpm

### Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/kevintr303/avail.git
   cd avail
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start development server:**

   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint to check for code issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting without making changes

### Development Workflow

1. **Making Changes:**
   - Create feature branches from `main`
   - Follow TypeScript best practices
   - Ensure all types are properly defined
   - Format code with `npm run format` before committing
   - Test in both desktop and mobile views

2. **Component Development:**
   - Use Radix UI primitives for accessibility
   - Follow existing component patterns
   - Ensure responsive design
   - Test theme compatibility

3. **API Development:**
   - Implement proper error handling
   - Include rate limiting
   - Add request validation
   - Document response formats

### Code Style

- **TypeScript:** Strict mode enabled
- **Linting:** ESLint with Next.js config (run `npm run lint` to check code)
- **Formatting:** Prettier for consistent code formatting (run `npm run format` to format code)
- **Components:** Functional components with hooks
- **Styling:** Tailwind CSS utility classes

### Testing

While automated tests are not currently included, consider:

- Unit tests for utility functions
- Integration tests for API routes
- E2E tests for critical user flows
- Component testing with React Testing Library

## Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `.next` directory.

### Environment Variables

No environment variables are currently required. The application uses:

- `NODE_ENV`: Automatically set by Next.js (development/production)
- Rate limiting is handled in-memory (no external service required)

### Deployment Options

#### Vercel (Recommended)

1. Push code to GitHub
2. Import repository in Vercel
3. Deploy automatically on push

#### Self-Hosted

1. Build the application:

   ```bash
   npm run build
   ```

2. Start the production server:

   ```bash
   npm start
   ```

3. Use a process manager (PM2, systemd, etc.)
4. Configure reverse proxy (nginx, Caddy, etc.)

### Performance Considerations

- **Caching:**
  - TLD lists cached in memory for 24 hours
  - RDAP bootstrap data cached in memory for 24 hours
  - Next.js fetch cache with 86400 second revalidation
- **Rate Limiting:** 10 requests per minute per IP address
- **Timeouts:** WHOIS lookups timeout after 8 seconds
- **Fallback:** RDAP fallback when WHOIS fails or returns "not found" errors
- **Concurrent Requests:** Domain checks run in parallel using `Promise.all`

## Troubleshooting

### Common Issues

#### Domain Lookups Failing

**Symptoms:** Domains show as unavailable or errors occur

**Solutions:**

- Check network connectivity
- Verify WHOIS service availability
- Check rate limiting status
- Review browser console for errors

#### TLD List Not Loading

**Symptoms:** TLD dropdown is empty or shows limited options

**Solutions:**

- Check IANA registry accessibility
- Verify network connectivity
- Check API endpoint `/api/tlds`
- Review fallback to popular TLDs

#### Rate Limiting Issues

**Symptoms:** 429 errors or blocked requests

**Solutions:**

- Wait for rate limit window to reset
- Check rate limit headers in response
- Review rate limit configuration
- Consider implementing user authentication

#### Theme Not Persisting

**Symptoms:** Theme resets on page reload

**Solutions:**

- Check cookie settings
- Verify browser cookie permissions
- Review theme storage implementation
- Check cookie expiration settings

### Debug Mode

Enable debug logging by setting:

```typescript
process.env.NODE_ENV = "development";
```

This enables:

- Detailed error logging
- API request/response logging
- Component render debugging

### Getting Help

- **Issues:** [GitHub Issues](https://github.com/kevintr303/avail/issues)
- **Documentation:** This file and main README
- **Community:** Check project discussions

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com)
- [WHOIS Protocol](https://www.rfc-editor.org/rfc/rfc3912)
- [RDAP Protocol](https://www.rfc-editor.org/rfc/rfc7483)

---

**Last Updated:** 2026  
**Version:** 1.0.0
