import { CustomSearchEngine, UserSettings } from './types';

export interface SearchEngineOption {
  id: string;
  label: string;
  urlTemplate: string;
  custom?: boolean;
}

export const BUILT_IN_SEARCH_ENGINES: SearchEngineOption[] = [
  { id: 'google', label: 'Google', urlTemplate: 'https://google.com/search?q={query}' },
  { id: 'duckduckgo', label: 'DuckDuckGo', urlTemplate: 'https://duckduckgo.com/?q={query}' },
  { id: 'ecosia', label: 'Ecosia', urlTemplate: 'https://ecosia.org/search?q={query}' },
  { id: 'bing', label: 'Bing', urlTemplate: 'https://www.bing.com/search?q={query}' },
  { id: 'yahoo', label: 'Yahoo', urlTemplate: 'https://search.yahoo.com/search?p={query}' },
  { id: 'baidu', label: 'Baidu', urlTemplate: 'https://www.baidu.com/s?wd={query}' },
  { id: 'yandex', label: 'Yandex', urlTemplate: 'https://yandex.com/search/?text={query}' }
];

export const toCustomSearchOption = (engine: CustomSearchEngine): SearchEngineOption => ({
  id: engine.id,
  label: engine.name,
  urlTemplate: engine.urlTemplate,
  custom: true
});

export const getSearchEngineOptions = (settings: UserSettings): SearchEngineOption[] => [
  ...BUILT_IN_SEARCH_ENGINES,
  ...(settings.customSearchEngines || []).map(toCustomSearchOption)
];

export const getSearchEngineLabel = (settings: UserSettings) =>
  getSearchEngineOptions(settings).find((engine) => engine.id === settings.searchEngine)?.label || 'Google';

export const buildSearchUrl = (settings: UserSettings, query: string) => {
  const encodedQuery = encodeURIComponent(query);
  const engine = getSearchEngineOptions(settings).find((option) => option.id === settings.searchEngine) || BUILT_IN_SEARCH_ENGINES[0];
  const template = engine.urlTemplate.trim();

  if (template.includes('{query}')) {
    return template.replaceAll('{query}', encodedQuery);
  }

  const separator = template.includes('?') ? '&' : '?';
  return `${template}${separator}q=${encodedQuery}`;
};

export const isValidSearchTemplate = (template: string) => {
  try {
    const previewUrl = template.includes('{query}')
      ? template.replaceAll('{query}', 'zentab')
      : template;
    const url = new URL(previewUrl);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};
