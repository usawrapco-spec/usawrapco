/**
 * Website Media Scraper for USA Wrap Co
 *
 * Crawls usawrapco.com main pages and extracts all image URLs.
 * Outputs a structured JSON file at lib/data/website-media.json.
 *
 * Usage:
 *   npx tsx scripts/scrape-website-media.ts
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = "https://usawrapco.com";

const PAGES_TO_SCRAPE = ["/", "/about", "/services", "/gallery", "/contact"];

const OUTPUT_PATH = resolve(__dirname, "../lib/data/website-media.json");

// Common section heuristics based on class names / ids / element positions
const SECTION_PATTERNS: { pattern: RegExp; section: string }[] = [
  { pattern: /hero/i, section: "hero" },
  { pattern: /banner/i, section: "banner" },
  { pattern: /header/i, section: "header" },
  { pattern: /footer/i, section: "footer" },
  { pattern: /nav/i, section: "navigation" },
  { pattern: /gallery/i, section: "gallery" },
  { pattern: /portfolio/i, section: "portfolio" },
  { pattern: /testimonial/i, section: "testimonials" },
  { pattern: /service/i, section: "services" },
  { pattern: /about/i, section: "about" },
  { pattern: /contact/i, section: "contact" },
  { pattern: /team/i, section: "team" },
  { pattern: /cta|call-to-action/i, section: "cta" },
  { pattern: /logo/i, section: "logo" },
  { pattern: /slider|carousel|swiper/i, section: "slider" },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScrapedImage {
  url: string;
  alt: string | null;
  page: string;
  section: string | null;
  width: number | null;
  height: number | null;
}

interface ScrapedData {
  scraped_at: string;
  base_url: string;
  pages_attempted: string[];
  pages_scraped: string[];
  pages_failed: string[];
  total_images: number;
  images: ScrapedImage[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve a potentially relative URL against the base */
function toAbsoluteUrl(raw: string, pageUrl: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return null;
  }
  try {
    return new URL(trimmed, pageUrl).href;
  } catch {
    return null;
  }
}

/** Try to guess the section an image belongs to from surrounding HTML context */
function guessSection(surroundingHtml: string): string | null {
  for (const { pattern, section } of SECTION_PATTERNS) {
    if (pattern.test(surroundingHtml)) {
      return section;
    }
  }
  return null;
}

/** Parse a numeric attribute value, returning null if not a number */
function parseNumericAttr(value: string | undefined): number | null {
  if (!value) return null;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

/** Deduplicate images by URL+page combination */
function deduplicateImages(images: ScrapedImage[]): ScrapedImage[] {
  const seen = new Set<string>();
  return images.filter((img) => {
    const key = `${img.url}::${img.page}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

/** Extract images from <img> tags */
function extractImgTags(html: string, pageUrl: string, pagePath: string): ScrapedImage[] {
  const results: ScrapedImage[] = [];
  // Match <img ...> tags (self-closing or not)
  const imgTagRegex = /<img\b[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = imgTagRegex.exec(html)) !== null) {
    const tag = match[0];

    // Extract src (handle src="..." or src='...' or src=value)
    const srcMatch = tag.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/i);
    const src = srcMatch ? (srcMatch[1] ?? srcMatch[2] ?? srcMatch[3]) : null;
    if (!src) continue;

    const absoluteUrl = toAbsoluteUrl(src, pageUrl);
    if (!absoluteUrl) continue;

    // Extract alt
    const altMatch = tag.match(/\balt\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const alt = altMatch ? (altMatch[1] ?? altMatch[2] ?? null) : null;

    // Extract width/height
    const widthMatch = tag.match(/\bwidth\s*=\s*(?:"(\d+)"|'(\d+)'|(\d+))/i);
    const heightMatch = tag.match(/\bheight\s*=\s*(?:"(\d+)"|'(\d+)'|(\d+))/i);
    const width = parseNumericAttr(widthMatch?.[1] ?? widthMatch?.[2] ?? widthMatch?.[3]);
    const height = parseNumericAttr(heightMatch?.[1] ?? heightMatch?.[2] ?? heightMatch?.[3]);

    // Get surrounding context (200 chars before and after) for section guessing
    const contextStart = Math.max(0, match.index - 300);
    const contextEnd = Math.min(html.length, match.index + tag.length + 300);
    const context = html.slice(contextStart, contextEnd);
    const section = guessSection(context);

    results.push({
      url: absoluteUrl,
      alt,
      page: pagePath,
      section,
      width,
      height,
    });
  }

  return results;
}

/** Extract images from inline style background-image declarations */
function extractBackgroundImages(html: string, pageUrl: string, pagePath: string): ScrapedImage[] {
  const results: ScrapedImage[] = [];
  // Match background-image: url(...) or background: ... url(...)
  const bgRegex = /background(?:-image)?\s*:\s*[^;]*url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi;
  let match: RegExpExecArray | null;

  while ((match = bgRegex.exec(html)) !== null) {
    const rawUrl = match[1] ?? match[2] ?? match[3];
    if (!rawUrl) continue;

    const absoluteUrl = toAbsoluteUrl(rawUrl, pageUrl);
    if (!absoluteUrl) continue;

    // Section context
    const contextStart = Math.max(0, match.index - 300);
    const contextEnd = Math.min(html.length, match.index + match[0].length + 300);
    const context = html.slice(contextStart, contextEnd);
    const section = guessSection(context);

    results.push({
      url: absoluteUrl,
      alt: null,
      page: pagePath,
      section,
      width: null,
      height: null,
    });
  }

  return results;
}

/** Extract og:image and twitter:image meta tags */
function extractMetaImages(html: string, pageUrl: string, pagePath: string): ScrapedImage[] {
  const results: ScrapedImage[] = [];
  // Match <meta property="og:image" content="..."> and <meta name="twitter:image" content="...">
  const metaRegex =
    /<meta\b[^>]*(?:property\s*=\s*["']og:image["']|name\s*=\s*["']twitter:image["'])[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = metaRegex.exec(html)) !== null) {
    const tag = match[0];
    const contentMatch = tag.match(/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const content = contentMatch ? (contentMatch[1] ?? contentMatch[2]) : null;
    if (!content) continue;

    const absoluteUrl = toAbsoluteUrl(content, pageUrl);
    if (!absoluteUrl) continue;

    results.push({
      url: absoluteUrl,
      alt: null,
      page: pagePath,
      section: "meta",
      width: null,
      height: null,
    });
  }

  // Also check the reverse attribute order: content before property
  const metaRegex2 =
    /<meta\b[^>]*content\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*(?:property\s*=\s*["']og:image["']|name\s*=\s*["']twitter:image["'])[^>]*>/gi;

  while ((match = metaRegex2.exec(html)) !== null) {
    const content = match[1] ?? match[2];
    if (!content) continue;

    const absoluteUrl = toAbsoluteUrl(content, pageUrl);
    if (!absoluteUrl) continue;

    results.push({
      url: absoluteUrl,
      alt: null,
      page: pagePath,
      section: "meta",
      width: null,
      height: null,
    });
  }

  return results;
}

/** Extract images from <source> tags inside <picture> elements */
function extractSourceTags(html: string, pageUrl: string, pagePath: string): ScrapedImage[] {
  const results: ScrapedImage[] = [];
  const sourceRegex = /<source\b[^>]*\bsrcset\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let match: RegExpExecArray | null;

  while ((match = sourceRegex.exec(html)) !== null) {
    const srcset = match[1] ?? match[2];
    if (!srcset) continue;

    // srcset can contain multiple URLs separated by commas
    const entries = srcset.split(",");
    for (const entry of entries) {
      const parts = entry.trim().split(/\s+/);
      const rawUrl = parts[0];
      if (!rawUrl) continue;

      const absoluteUrl = toAbsoluteUrl(rawUrl, pageUrl);
      if (!absoluteUrl) continue;

      const contextStart = Math.max(0, match.index - 300);
      const contextEnd = Math.min(html.length, match.index + match[0].length + 300);
      const context = html.slice(contextStart, contextEnd);
      const section = guessSection(context);

      results.push({
        url: absoluteUrl,
        alt: null,
        page: pagePath,
        section,
        width: null,
        height: null,
      });
    }
  }

  return results;
}

/** Extract images from srcset attributes on <img> tags */
function extractSrcsetImages(html: string, pageUrl: string, pagePath: string): ScrapedImage[] {
  const results: ScrapedImage[] = [];
  const srcsetRegex = /<img\b[^>]*\bsrcset\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let match: RegExpExecArray | null;

  while ((match = srcsetRegex.exec(html)) !== null) {
    const srcset = match[1] ?? match[2];
    if (!srcset) continue;

    const entries = srcset.split(",");
    for (const entry of entries) {
      const parts = entry.trim().split(/\s+/);
      const rawUrl = parts[0];
      if (!rawUrl) continue;

      const absoluteUrl = toAbsoluteUrl(rawUrl, pageUrl);
      if (!absoluteUrl) continue;

      const contextStart = Math.max(0, match.index - 300);
      const contextEnd = Math.min(html.length, match.index + match[0].length + 300);
      const context = html.slice(contextStart, contextEnd);
      const section = guessSection(context);

      results.push({
        url: absoluteUrl,
        alt: null,
        page: pagePath,
        section,
        width: null,
        height: null,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Page fetching
// ---------------------------------------------------------------------------

async function fetchPage(url: string): Promise<{ html: string; status: number } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; USAWrapCoScraper/1.0; +https://usawrapco.com)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { html: "", status: response.status };
    }

    const html = await response.text();
    return { html, status: response.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  [ERROR] Failed to fetch ${url}: ${message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(60));
  console.log("  USA Wrap Co - Website Media Scraper");
  console.log("=".repeat(60));
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Pages to scrape: ${PAGES_TO_SCRAPE.join(", ")}`);
  console.log(`  Output: ${OUTPUT_PATH}`);
  console.log("=".repeat(60));
  console.log();

  const allImages: ScrapedImage[] = [];
  const pagesScraped: string[] = [];
  const pagesFailed: string[] = [];

  for (const pagePath of PAGES_TO_SCRAPE) {
    const pageUrl = `${BASE_URL}${pagePath}`;
    console.log(`[SCRAPING] ${pageUrl}`);

    const result = await fetchPage(pageUrl);

    if (!result) {
      console.log(`  -> Network error, skipping\n`);
      pagesFailed.push(pagePath);
      continue;
    }

    if (result.status !== 200) {
      console.log(`  -> HTTP ${result.status}, skipping\n`);
      pagesFailed.push(pagePath);
      continue;
    }

    console.log(`  -> Received ${result.html.length.toLocaleString()} bytes`);

    // Extract images from all sources
    const imgTagImages = extractImgTags(result.html, pageUrl, pagePath);
    console.log(`  -> <img> tags: ${imgTagImages.length} images`);

    const bgImages = extractBackgroundImages(result.html, pageUrl, pagePath);
    console.log(`  -> background-image: ${bgImages.length} images`);

    const metaImages = extractMetaImages(result.html, pageUrl, pagePath);
    console.log(`  -> meta tags: ${metaImages.length} images`);

    const sourceImages = extractSourceTags(result.html, pageUrl, pagePath);
    console.log(`  -> <source> srcset: ${sourceImages.length} images`);

    const srcsetImages = extractSrcsetImages(result.html, pageUrl, pagePath);
    console.log(`  -> <img> srcset: ${srcsetImages.length} images`);

    const pageImages = [
      ...imgTagImages,
      ...bgImages,
      ...metaImages,
      ...sourceImages,
      ...srcsetImages,
    ];

    console.log(`  -> Total for page: ${pageImages.length} images`);
    console.log();

    allImages.push(...pageImages);
    pagesScraped.push(pagePath);
  }

  // Deduplicate
  const uniqueImages = deduplicateImages(allImages);
  console.log("-".repeat(60));
  console.log(`Total images found: ${allImages.length}`);
  console.log(`After deduplication: ${uniqueImages.length}`);
  console.log(`Pages scraped: ${pagesScraped.length}/${PAGES_TO_SCRAPE.length}`);
  if (pagesFailed.length > 0) {
    console.log(`Pages failed: ${pagesFailed.join(", ")}`);
  }

  // Build output
  const output: ScrapedData = {
    scraped_at: new Date().toISOString(),
    base_url: BASE_URL,
    pages_attempted: PAGES_TO_SCRAPE,
    pages_scraped: pagesScraped,
    pages_failed: pagesFailed,
    total_images: uniqueImages.length,
    images: uniqueImages,
  };

  // Ensure output directory exists
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });

  // Write JSON
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\nOutput written to: ${OUTPUT_PATH}`);
  console.log("=".repeat(60));
  console.log("Done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
