
export type Platform = 'Twitter' | 'YouTube' | 'LinkedIn' | 'Threads';

export interface Source {
  id: string;
  platform: Platform;
  name: string;
  url: string;
  status: 'active' | 'inactive';
  lastScraped?: string;
}

export interface ScrapedContent {
  id: string;
  sourceId: string;
  sourceName: string;
  platform: Platform;
  title: string;
  originalText: string;
  thumbnail?: string;
  url: string;
  createdAt: string;
}

export type ContentType = 
  | 'empathy' 
  | 'case_study' 
  | 'casual' 
  | 'insight' 
  | 'question' 
  | 'listicle' 
  | 'storytelling';

export interface ProcessedContent {
  id: string;
  originalId: string;
  contentType: ContentType;
  prompt: string;
  resultText: string;
  createdAt: string;
}

export interface QueueItem {
  id: string;
  content: string;
  status: 'pending' | 'scheduled' | 'uploaded' | 'failed';
  targetPlatforms: Platform[];
  scheduledAt?: string;
  createdAt: string;
}

export enum NavigationTab {
  Dashboard = 'dashboard',
  Sources = 'sources',
  Scraped = 'scraped',
  Processor = 'processor',
  Queue = 'queue'
}
