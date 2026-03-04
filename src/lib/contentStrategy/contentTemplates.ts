export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  promptTemplate: string; // uses {{SERVICE}}, {{CITY}}, {{KEYWORD}}, {{BUSINESS_NAME}}
}

export const CONTENT_TEMPLATES: ContentTemplate[] = [
  {
    id: 'service-page',
    name: 'Service Page',
    description: 'Dedicated page for a specific service offering',
    promptTemplate: `Write a professional service page for {{BUSINESS_NAME}} offering {{SERVICE}} in {{CITY}}. Target keyword: "{{KEYWORD}}". Include: H1, introduction paragraph, 3 benefit sections with H2s, service process steps, local trust signals, and a call to action. Only use the provided keyword and service name. Do not invent statistics.`,
  },
  {
    id: 'blog-post',
    name: 'Blog Post',
    description: 'Educational blog post targeting a local keyword',
    promptTemplate: `Write an educational blog post for {{BUSINESS_NAME}} in {{CITY}} targeting "{{KEYWORD}}". Include: engaging title, introduction, 4-5 H2 sections with practical advice, local references to {{CITY}}, and a conclusion with CTA. Target length: 800-1000 words. Only use the provided keyword. Do not invent statistics.`,
  },
  {
    id: 'faq-page',
    name: 'FAQ Page',
    description: 'FAQ page optimized for voice search and featured snippets',
    promptTemplate: `Write an FAQ page for {{BUSINESS_NAME}}'s {{SERVICE}} service in {{CITY}}. Target keyword: "{{KEYWORD}}". Include 8-10 questions and answers. Questions should be natural language phrases customers actually ask. Answers: 2-4 sentences each, direct and helpful. Include local context ({{CITY}}) in 2-3 answers.`,
  },
  {
    id: 'location-page',
    name: 'Location Page',
    description: 'Geographic service area landing page',
    promptTemplate: `Write a location-specific landing page for {{BUSINESS_NAME}} serving {{CITY}}. Target keyword: "{{KEYWORD}}". Include: H1 with location and service, intro mentioning {{CITY}} neighborhood context, service offerings list, why choose us section, local landmarks/context (keep general), and contact CTA. Do not invent specific local statistics.`,
  },
  {
    id: 'about-us',
    name: 'About Us',
    description: 'Trust-building About Us page',
    promptTemplate: `Write an About Us page for {{BUSINESS_NAME}}, a {{SERVICE}} company in {{CITY}}. Target keyword: "{{KEYWORD}}". Include: compelling company story (keep realistic/general), team/values section, service area mention, certifications placeholder [CERTIFICATIONS], and trust signals. Keep it authentic — do not invent specific years, awards, or statistics.`,
  },
];
