import { Match } from '../types';

/**
 * Decodes basic HTML entities commonly found in search results.
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, ''); // Strip any leftover HTML tags
}

/**
 * Scrapes DuckDuckGo HTML search results for a query and returns snippets.
 */
export async function scrapeSearchSnippets(query: string): Promise<string> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`DuckDuckGo request failed with status: ${response.status}`);
    }

    const html = await response.text();
    
    // Parse result titles and snippets using regexes
    const titleRegex = /<a class="result__url"[^>]*>([\s\S]*?)<\/a>/g;
    const snippetRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

    const titles: string[] = [];
    const snippets: string[] = [];

    let match;
    while ((match = titleRegex.exec(html)) !== null) {
      titles.push(decodeHtmlEntities(match[1].trim()));
    }

    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(decodeHtmlEntities(match[1].trim()));
    }

    if (snippets.length === 0) {
      // Fallback: if class-based scraping failed, strip tags and return a portion of raw body text
      const cleanBody = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return cleanBody.substring(0, 3000);
    }

    // Combine titles and snippets to provide rich context to the LLM
    const results: string[] = [];
    const count = Math.min(titles.length, snippets.length, 6); // Top 6 results are usually enough
    for (let i = 0; i < count; i++) {
      results.push(`${i + 1}. Title: ${titles[i]}\nSnippet: ${snippets[i]}`);
    }

    return results.join('\n\n');
  } catch (error) {
    console.error('Scraper error:', error);
    throw error;
  }
}

/**
 * Builds a search query specifically targeted for a World Cup match score.
 */
export function buildMatchQuery(match: Match): string {
  // Format: "2026 FIFA World Cup Germany vs Curacao final score match results"
  // If it's a knockout match, it might contain "Winner Match 73". We should check and format properly.
  return `2026 FIFA World Cup ${match.teamA} vs ${match.teamB} final score match results`;
}
