export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  time?: string;
  date?: string; // format YYYY-MM-DD
}

export interface QuickLink {
  id: string;
  name: string;
  url: string;
  iconName: string; // lucide icon name or emoji
}

export interface LinkFolder {
  id: string;
  name: string;
  links: QuickLink[];
}

// A slot in the Quick Links grid is either a single link or a folder of links.
export type NexusItem = QuickLink | LinkFolder;

export const isFolder = (item: NexusItem): item is LinkFolder =>
  Array.isArray((item as LinkFolder).links);

export interface Quote {
  text: string;
  author: string;
}

export interface UserSettings {
  name: string;
  searchEngine: 'google' | 'duckduckgo' | 'ecosia' | 'bing' | 'yahoo' | 'baidu' | 'yandex';
  bgUrl: string;
  fontScale: number; // e.g., 100
  layout: 'minimalist' | 'grid';
  darkMode: boolean;
  theme: 'dark' | 'light' | 'system';
  language: 'zh' | 'en';
  currentIntent: string;
  tabsAutoExpand: boolean; // Auto-expand tab groups by default
  quickLinksOpenInNewTab: boolean; // Open quick access links in a new tab
  defaultTab: 'home' | 'dashboard' | 'tasks' | 'tabs'; // Which view to land on when a new tab opens
}

export const DEFAULT_QUICK_LINKS: QuickLink[] = [
  { id: '1', name: 'GitHub', url: 'https://github.com', iconName: 'Github' },
  { id: '2', name: 'Gmail', url: 'https://mail.google.com', iconName: 'Mail' },
  { id: '3', name: 'Figma', url: 'https://figma.com', iconName: 'PenTool' },
  { id: '4', name: 'Notion', url: 'https://notion.so', iconName: 'BookOpen' },
  { id: '5', name: 'YouTube', url: 'https://youtube.com', iconName: 'Youtube' },
  { id: '6', name: 'Discord', url: 'https://discord.com', iconName: 'MessageSquare' },
  { id: '7', name: 'Spotify', url: 'https://spotify.com', iconName: 'Music' },
  { id: '8', name: 'Amazon', url: 'https://amazon.com', iconName: 'ShoppingBag' }
];

export const BACKGROUND_PRESETS = [
  {
    id: 'mountain',
    name: 'Twilight Mountain Range',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA6zEPNLgxzjRP6yyOdOuZu49jgMoK3rVeWe8atHn7MkSo7e73B0Fo8MEUnzQY3Js8qfm7VMzyd9u6-1jqYsWQeaRMHf56Woy1VGhttTYMQta7TYktbOMxSOMB453mTcm7Jusw-19J4T6rBZ1O0gnvz5aQnOpKNM5vW5qkwVw9YtEqsc4cvkN9ggUFv2Z_P6TTfBDx39SBqz2dCNvQQ0QFaYmabehnxYeE1cDbz7BNWMk6wZQwGPmFXkwUjV-x_0DFmT-d371wI8DE',
  },
  {
    id: 'starry',
    name: 'Celestial Night Horizon',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDz5vHT8Kuq0LF3utWLaG9Jyoe26QqUAfVtfh24QQ5EHjUnTCC5DHNUJA8poeHcPdMYkvcyoPB_ZkO6WNX3EMFH-t1ZAQx5Vd2Qc3jhehKBK_u7GUrhRa5sY0dubwvDMF1GaM_DUpvht_DDkVw3149lR3Hu6lDhGUiPOlcWbyA3ghFuYlxyHQvlNPNCp4opsydxnNPocGaLtEWB4DR-5qUzMrW6zZyGcTxCWFaPkdKXioh3s2Ph0LbWIGLN1BSlCpSJuyY4q1rdcyk',
  },
  {
    id: 'sunset',
    name: 'Sunset Rolling Hills',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCX6MVap5bhIrp4lhuGJh3zWSMB-bx3tTDcpiNtVLtWx-BAbfiUtfT7hqhlJl1UpXqlp7GSdCH450rQrW87k-hymAnctYKCpJy8etFvO8fGevngaOV6MpiME0pPSjOazVGDx8WX5NkVGr2CP2dIxWhIRRJcl2XNdbIheyCRzKNB1TddlGMsCp9qDcqC8VOZ_Ce6QF1ft3J4wjxxiSkT-jKQ6cCYuCgv4CZd4LF55LgdZ7NS1DRftjjZkzEzCDLWhMvUsSj4fq9v1hQ',
  },
  {
    id: 'abstract',
    name: 'Cosmic Nebula Swirl',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBMjbf8Tndg0f8UzqdIoH_2kYB1X6WjP-2KT9M__OQe4DbA0ISFXT3vTHpfqIfim_8J15bfexXegSTGxHQUWuA0Hl5FiW0QUmAvGEVpXfX-mI6frTWxJsTPkzU13NMbw5c-YZgdSFxiwaE-lhw1iT-4CAGkjpS9Cvb-YPPSFwEnT91aBXePKGNhOqLLIi2JTRg1b-PhnBamQDB3nSCxWMV8j3AyJcygcLDz9mCEbPxQuWv39gcmQl_QomscnI0OL5fFIfj8aSFhDTQ',
  },
  {
    id: 'random-landscape',
    name: 'Random Landscape (Network)',
    url: 'random:landscape',
  },
  {
    id: 'random-anime',
    name: 'Random Anime (Network)',
    url: 'random:anime',
  },
  {
    id: 'random-tech',
    name: 'Random Tech (Network)',
    url: 'random:tech',
  }
];

export const QUOTES_LIST: Quote[] = [
  { text: "The soul that sees beauty may sometimes walk alone.", author: "Johann Wolfgang von Goethe" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Muddy water is best cleared by leaving it alone.", author: "Alan Watts" },
  { text: "Quiet the mind and the soul will speak.", author: "Ma Jaya Sati Bhagavati" },
  { text: "Focus is a matter of deciding what things you're not going to do.", author: "John Carmack" },
  { text: "The presentation of secrets in silence is the foundation of elegance.", author: "Zen Wisdom" },
  { text: "Adopt the pace of nature: her secret is patience.", author: "Ralph Waldo Emerson" },
  { text: "Do not seek to follow in the footsteps of the wise. Seek what they sought.", author: "Basho" }
];

// Tab Management Types
export interface BrowserTab {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  windowId: number;
  active: boolean;
  pinned: boolean;
}

export interface TabGroup {
  id: string;
  name: string;
  domain?: string; // for auto-grouped tabs
  iconName?: string;
  color?: string;
  tabs: BrowserTab[];
  isManual: boolean; // true if user created, false if auto-generated
  collapsed?: boolean;
}

export interface ReadLaterItem {
  id: string;
  title: string;
  url: string;
  favIconUrl?: string;
  addedAt: number; // timestamp
  tags?: string[];
  notes?: string;
}

export const HOMEPAGE_PATTERNS = [
  /^https?:\/\/[^\/]+\/?$/,
  /^https?:\/\/[^\/]+\/?(index|home|welcome)\.(html?|php|aspx?)$/i,
  /^https?:\/\/www\.[^\/]+\/?$/
];
