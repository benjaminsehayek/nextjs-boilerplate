// Prompt templates for the Website Builder
// Used by both the single-page generate route and the bulk-generate route.

export interface PageGenerationInput {
  businessName: string;
  phone: string | null;
  domain: string;
  pageType: 'location_service' | 'city_landing' | 'blog_post' | 'foundation' | 'website_addition';
  service?: string;
  city?: string;
  state?: string;
  targetKeyword?: string | null;
  customInstructions?: string | null;
  enrichmentBlock?: string;
  serpBlock?: string;
  /** Existing page HTML for 'website_addition' improvement requests */
  existingHtml?: string;
}

// ── System prompt (shared) ───────────────────────────────────────────────────

export const PAGE_SYSTEM_PROMPT = `You are an expert local SEO content writer and web developer. You create location service pages for local businesses that rank in Google and convert visitors into customers. Every page must be unique — not a city-name-swapped template. You write clean, semantic HTML5 without any JavaScript or external stylesheets unless explicitly requested.`;

// ── Build a user prompt for a given page type ────────────────────────────────

export function buildPagePrompt(input: PageGenerationInput): string {
  const metaInstructions = `
On the FIRST lines of your response (before any HTML), output exactly:
META_TITLE: [60 chars max meta title targeting the primary keyword]
META_DESC: [160 chars max meta description with a clear CTA]

Then output the HTML starting from the next line.`.trim();

  switch (input.pageType) {
    case 'location_service':
      return buildLocationServicePrompt(input, metaInstructions);
    case 'city_landing':
      return buildCityLandingPrompt(input, metaInstructions);
    case 'blog_post':
      return buildBlogPrompt(input, metaInstructions);
    case 'foundation':
      return buildFoundationPrompt(input, metaInstructions);
    case 'website_addition':
      return buildWebsiteAdditionPrompt(input, metaInstructions);
    default:
      return buildLocationServicePrompt(input, metaInstructions);
  }
}

function buildLocationServicePrompt(input: PageGenerationInput, metaInstructions: string): string {
  const { businessName, phone, service, city, state, targetKeyword, enrichmentBlock, serpBlock, customInstructions } = input;

  return `Write a location service page for:
Business: ${businessName}
Service: ${service ?? 'General Services'}
Location: ${city ?? ''}, ${state ?? ''}
Phone: ${phone ?? 'N/A'}
${targetKeyword ? `\nPRIMARY KEYWORD: ${targetKeyword}\nTarget this keyword in H1, meta title, first paragraph, and throughout content naturally.` : ''}
${enrichmentBlock ? `\n${enrichmentBlock}` : ''}
${serpBlock ? `\n${serpBlock}` : ''}
${customInstructions ? `\nADDITIONAL INSTRUCTIONS: ${customInstructions}` : ''}

UNIQUENESS REQUIREMENTS — this page must be meaningfully different from other location pages:
- Reference at least one local landmark, neighbourhood, or geographic feature specific to ${city}
- Include service-area-specific detail (local climate, typical home types in ${city})
- The FAQ section must contain at least 2 questions specific to ${city} (not generic)
- Every section must contain ${city}-specific context, not just a city-name substitution

OUTPUT REQUIREMENTS:
- Output valid semantic HTML5 only (no doctype, no head, no body — just page content)
- Include an H1 with "${service} in ${city}, ${state}" or a natural SEO variation
- Include H2 sections: services overview, local context, process/what to expect, FAQ, CTA
- Include 4-6 FAQ items with proper HTML structure
- Include a strong CTA with the phone number
- Target 800–1500 words
- No CSS or JavaScript

${metaInstructions}`;
}

function buildCityLandingPrompt(input: PageGenerationInput, metaInstructions: string): string {
  const { businessName, phone, city, state, targetKeyword, enrichmentBlock, serpBlock, customInstructions } = input;

  return `Write a city landing page for:
Business: ${businessName}
City: ${city ?? ''}, ${state ?? ''}
Phone: ${phone ?? 'N/A'}
${targetKeyword ? `\nPRIMARY KEYWORD: ${targetKeyword}` : ''}
${enrichmentBlock ? `\n${enrichmentBlock}` : ''}
${serpBlock ? `\n${serpBlock}` : ''}
${customInstructions ? `\nADDITIONAL INSTRUCTIONS: ${customInstructions}` : ''}

OUTPUT REQUIREMENTS:
- Valid semantic HTML5 (no doctype/head/body — just page content)
- H1 targeting the city + service area keyword
- Overview of all services offered in this area
- Local context section referencing real landmarks or neighbourhoods in ${city}
- FAQ section with at least 4 questions relevant to ${city}
- CTA with phone number
- Target 600–1000 words
- No CSS or JavaScript

${metaInstructions}`;
}

function buildBlogPrompt(input: PageGenerationInput, metaInstructions: string): string {
  const { businessName, phone, service, city, state, targetKeyword, customInstructions, enrichmentBlock, serpBlock } = input;

  return `Write an informational blog post for:
Business: ${businessName}
Topic/Service: ${service ?? 'Home Services'}
${city ? `Location context: ${city}, ${state}` : ''}
Phone: ${phone ?? 'N/A'}
${targetKeyword ? `\nPRIMARY KEYWORD: ${targetKeyword}` : ''}
${enrichmentBlock ? `\n${enrichmentBlock}` : ''}
${serpBlock ? `\n${serpBlock}` : ''}
${customInstructions ? `\nADDITIONAL INSTRUCTIONS: ${customInstructions}` : ''}

OUTPUT REQUIREMENTS:
- Valid semantic HTML5 (no doctype/head/body — just article content)
- H1 as a compelling, keyword-rich title
- Clear H2 sections covering the topic in depth
- Include a practical tips or how-to section if appropriate
- Include 3-5 FAQ items at the end
- Include a soft CTA linking back to the service (call to action, not hard sell)
- Target 1000–2000 words
- Authoritative, helpful tone — written for homeowners
- No CSS or JavaScript

${metaInstructions}`;
}

function buildFoundationPrompt(input: PageGenerationInput, metaInstructions: string): string {
  const { businessName, phone, service, city, state, targetKeyword, customInstructions } = input;
  const pageTitle = service ?? 'About Us';

  return `Write a foundation page (${pageTitle}) for:
Business: ${businessName}
${city ? `Primary Location: ${city}, ${state}` : ''}
Phone: ${phone ?? 'N/A'}
${targetKeyword ? `\nPRIMARY KEYWORD: ${targetKeyword}` : ''}
${customInstructions ? `\nADDITIONAL INSTRUCTIONS: ${customInstructions}` : ''}

OUTPUT REQUIREMENTS:
- Valid semantic HTML5 (no doctype/head/body — just page content)
- Professional tone that builds trust and credibility
- H1 as the page title
- Clearly structured sections (who we are, what we do, why choose us, CTA)
- Include a CTA with phone number
- Target 400–800 words
- No CSS or JavaScript

${metaInstructions}`;
}

function buildWebsiteAdditionPrompt(input: PageGenerationInput, metaInstructions: string): string {
  const { businessName, phone, service, city, state, targetKeyword, customInstructions, existingHtml } = input;

  return `Improve or create a supplemental web page for:
Business: ${businessName}
Service/Topic: ${service ?? 'General'}
${city ? `Location: ${city}, ${state}` : ''}
Phone: ${phone ?? 'N/A'}
${targetKeyword ? `\nPRIMARY KEYWORD: ${targetKeyword}` : ''}
${customInstructions ? `\nADDITIONAL INSTRUCTIONS: ${customInstructions}` : ''}
${existingHtml ? `\nEXISTING PAGE HTML:\n${existingHtml.slice(0, 3000)}\n\nImprove the above page based on the instructions.` : ''}

OUTPUT REQUIREMENTS:
- Valid semantic HTML5 (no doctype/head/body — just page content)
- Improved or new content targeting the keyword
- No CSS or JavaScript

${metaInstructions}`;
}

// ── Schema.org generation prompt ─────────────────────────────────────────────

export function buildSchemaPrompt(
  pageTitle: string,
  pageType: string,
  businessName: string,
  city: string | null,
  state: string | null,
  phone: string | null,
  domain: string,
): string {
  return `Generate a JSON-LD schema.org object for this web page:

Page title: ${pageTitle}
Page type: ${pageType}
Business name: ${businessName}
Location: ${city ?? ''}, ${state ?? ''}
Phone: ${phone ?? ''}
Domain: ${domain}

Choose the most appropriate schema type(s) from: LocalBusiness, Service, WebPage, BlogPosting, FAQPage, BreadcrumbList.
Combine multiple types using @graph if needed.

Output ONLY valid JSON-LD — no explanation, no markdown fences, no prose. Start with { and end with }.`;
}
