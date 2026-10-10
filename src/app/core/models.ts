export type Lang = 'es' | 'en';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export type Category =
  | 'technology'
  | 'science'
  | 'health'
  | 'economy'
  | 'business'
  | 'politics'
  | 'history'
  | 'society'
  | 'culture'
  | 'education'
  | 'environment'
  | 'sports'
  | 'other';

export const CATEGORIES: Category[] = [
  'technology',
  'science',
  'health',
  'economy',
  'business',
  'politics',
  'history',
  'society',
  'culture',
  'education',
  'environment',
  'sports',
  'other',
];

export type SourceType =
  | 'academic'
  | 'government'
  | 'international'
  | 'news'
  | 'reference'
  | 'organization'
  | 'industry'
  | 'other';

export type ChartType = 'bar' | 'horizontalBar' | 'line' | 'area' | 'pie' | 'doughnut' | 'radar';

export interface ChartSpec {
  id: string;
  type: ChartType;
  title: string;
  description: string;
  unit: string | null;
  labels: string[];
  series: { name: string; data: (number | null)[] }[];
  sourceIds: number[];
}

export interface Metric {
  label: string;
  value: string;
  numericValue: number | null;
  unit: string | null;
  context: string;
  trend: 'up' | 'down' | 'neutral' | null;
  sourceId: number | null;
}

export interface Report {
  title: string;
  category: Category;
  tldr: string;
  summary: string;
  keyPoints: { title: string; detail: string; sourceIds: number[] }[];
  metrics: Metric[];
  charts: ChartSpec[];
  timeline: { date: string; title: string; description: string }[];
  sections: { heading: string; body: string }[];
  perspectives: { consensus: string[]; debates: string[] };
  faq: { question: string; answer: string }[];
  relatedTopics: string[];
  confidence: { level: 'high' | 'medium' | 'low'; rationale: string };
}

export interface Source {
  id: number;
  title: string;
  url: string;
  domain: string;
  publisher: string;
  publishedAt: string | null;
  type: SourceType;
  credibility: number;
  snippet: string | null;
  cited: boolean;
}

export interface InterestData {
  article: string;
  project: string;
  points: { period: string; views: number }[];
  total: number;
  avgMonthly: number;
  trendPct: number | null;
}

export interface AcademicData {
  query: string;
  total: number;
  byYear: { year: number; count: number }[];
  growthPct: number | null;
  countries: { code: string; name: string; count: number }[];
  fields: { name: string; count: number }[];
  topWorks: { title: string; year: number | null; citations: number; url: string | null; venue: string | null }[];
}

export interface ResearchResult {
  topic: string;
  language: Lang;
  report: Report;
  sources: Source[];
  enrichment: {
    wikipedia: {
      title: string;
      url: string;
      lang: Lang;
      description: string | null;
      extract: string;
      thumbnail: string | null;
      languages: number;
      englishTitle: string | null;
    } | null;
    interest: InterestData | null;
    academic: AcademicData | null;
    related: string[];
  };
  meta: {
    provider: 'claude' | 'open-data';
    model: string | null;
    researchMs: number;
    searchQueries: string[];
    sourceCount: number;
    warnings: string[];
    generatedAt: string;
  };
}

export type ProgressStage = 'start' | 'searching' | 'sources' | 'enriching' | 'analyzing' | 'structuring' | 'finalizing';

export interface ProgressEvent {
  stage: ProgressStage;
  percent: number;
  query?: string;
  sources?: { title: string; url: string; domain: string }[];
}

export interface ResearchPayload {
  eventId: string;
  savedSearchId: string | null;
  result: ResearchResult;
}

export type ResearchStreamEvent =
  | { type: 'progress'; data: ProgressEvent }
  | { type: 'result'; data: ResearchPayload }
  | { type: 'error'; data: { code: string; message: string } };

export interface EventSummary {
  id: string;
  topic: string;
  category: Category | null;
  language: Lang;
  provider: string;
  status: string;
  researchMs: number;
  sourceCount: number;
  createdAt: string;
  savedSearchId: string | null;
}

export interface SavedSearchSummary {
  id: string;
  topic: string;
  title: string;
  category: Category | null;
  language: Lang;
  summary: string;
  tldr: string | null;
  tags: string[];
  provider: string;
  isFavorite: boolean;
  viewCount: number;
  sourceCount: number;
  chartCount: number;
  metricCount: number;
  createdAt: string;
  updatedAt: string;
  lastViewedAt: string | null;
}

export interface SavedSearch extends SavedSearchSummary {
  eventId: string | null;
  rawData: ResearchResult;
}

export interface SearchList {
  items: SavedSearchSummary[];
  total: number;
  categories: { category: Category; count: number }[];
}

export interface PeriodPoint {
  period: string;
  searches: number;
  saved: number;
  timeMs: number;
}

export interface StatsOverview {
  timezone: string;
  totals: {
    totalSearches: number;
    uniqueTopics: number;
    savedCount: number;
    favoriteCount: number;
    totalTimeMs: number;
    researchTimeMs: number;
    readingTimeMs: number;
    totalSources: number;
    avgResearchMs: number;
    thisWeek: number;
    lastWeek: number;
    thisMonth: number;
    lastMonth: number;
    timeThisWeekMs: number;
    timeLastWeekMs: number;
    avgCredibility: number | null;
  };
  streak: { current: number; longest: number; activeDaysLast30: number };
  daily: PeriodPoint[];
  weekly: PeriodPoint[];
  monthly: PeriodPoint[];
  hourly: { hour: number; count: number }[];
  categories: { category: Category; count: number }[];
  topTopics: {
    topic: string;
    count: number;
    lastSearchedAt: string;
    category: Category | null;
    savedSearchId: string | null;
    latestEventId: string;
  }[];
  sourceTypes: { type: SourceType; count: number }[];
  recentEvents: EventSummary[];
  recentSaved: SavedSearchSummary[];
  favorites: SavedSearchSummary[];
}

export interface Health {
  status: string;
  database: 'up' | 'down';
  provider: 'claude' | 'open-data';
  model: string | null;
}
