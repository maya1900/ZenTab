import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LucideIcon } from './LucideIcon';
import { UserSettings, Task } from '../types';
import { translations } from '../translations';
import { getStoredValue, setStoredValue, STORAGE_KEYS } from '../storage';
import { buildSearchUrl, getSearchEngineLabel, getSearchEngineOptions } from '../searchEngines';

interface HomeViewProps {
  settings: UserSettings;
  updateSettings: (key: keyof UserSettings, value: any) => void;
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ settings, updateSettings, tasks, setTasks }) => {
  const [time, setTime] = useState('');
  const [greetingKey, setGreetingKey] = useState<'goodMorning' | 'goodAfternoon' | 'goodEvening'>('goodMorning');
  const [isEditingName, setIsEditingName] = useState(false);
  const [inputName, setInputName] = useState(settings.name);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [intentInput, setIntentInput] = useState('');
  const [isSelectingEngine, setIsSelectingEngine] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const t = translations[settings.language || 'en'];
  const searchEngineOptions = getSearchEngineOptions(settings);
  const selectedSearchEngineLabel = getSearchEngineLabel(settings);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSelectingEngine(false);
      }
    };
    
    if (isSelectingEngine) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSelectingEngine]);

  useEffect(() => {
    let isMounted = true;

    getStoredValue<string[]>(STORAGE_KEYS.searchHistory, []).then((history) => {
      if (isMounted) setSearchHistory(history);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Keyboard shortcut listener to focus search tool (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update clock & dynamic greeting based on current hours
  useEffect(() => {
    const clockTimer = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTime(`${hours}:${minutes}`);

      // Set greeting
      const currentHour = now.getHours();
      if (currentHour < 12) {
        setGreetingKey('goodMorning');
      } else if (currentHour < 18) {
        setGreetingKey('goodAfternoon');
      } else {
        setGreetingKey('goodEvening');
      }
    };

    clockTimer();
    const interval = setInterval(clockTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleNameSave = () => {
    if (inputName.trim()) {
      updateSettings('name', inputName.trim());
    }
    setIsEditingName(false);
  };

  const saveSearchHistory = (query: string) => {
    if (!settings.searchHistoryEnabled) return;

    const nextHistory = [
      query,
      ...searchHistory.filter((item) => item.toLowerCase() !== query.toLowerCase())
    ].slice(0, 10);

    setSearchHistory(nextHistory);
    setStoredValue(STORAGE_KEYS.searchHistory, nextHistory);
  };

  const runSearch = (query: string) => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return;

    saveSearchHistory(normalizedQuery);
    const searchUrl = buildSearchUrl(settings, normalizedQuery);
    if (settings.searchOpenInNewTab) {
      window.open(searchUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.location.assign(searchUrl);
    }
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(searchQuery);
  };

  const handleHistoryItemClick = (query: string) => {
    runSearch(query);
  };

  const handleRemoveHistoryItem = (query: string) => {
    const nextHistory = searchHistory.filter((item) => item !== query);
    setSearchHistory(nextHistory);
    setStoredValue(STORAGE_KEYS.searchHistory, nextHistory);
    searchInputRef.current?.focus();
  };

  const handleClearSearchHistory = () => {
    setSearchHistory([]);
    setStoredValue(STORAGE_KEYS.searchHistory, []);
    searchInputRef.current?.focus();
  };

  const filteredSearchHistory = searchHistory.filter((item) =>
    item.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const shouldShowSearchHistory = settings.searchHistoryEnabled && isSearchFocused && !isSelectingEngine && filteredSearchHistory.length > 0;

  // Toggle search engine on clicking search icon
  const handleToggleSearchEngine = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSelectingEngine(!isSelectingEngine);
  };

  const matchingTask = tasks.find(t => t.text === settings.currentIntent);
  const isIntentCompleted = matchingTask ? matchingTask.completed : false;

  const handleIntentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (intentInput.trim()) {
      const intentValue = intentInput.trim();
      updateSettings('currentIntent', intentValue);
      
      // Auto-add to tasks if not already there
      const existingTask = tasks.find(t => t.text.toLowerCase() === intentValue.toLowerCase() && !t.completed);
      if (!existingTask) {
        setTasks([
          ...tasks,
          {
            id: Date.now().toString(),
            text: intentValue,
            completed: false,
            date: new Date().toISOString().split('T')[0],
            priority: 'high',
          }
        ]);
      }
      
      setIntentInput('');
    }
  };

  const handleClearIntent = (completeTask = false) => {
    if (completeTask && settings.currentIntent) {
      if (matchingTask) {
        setTasks(tasks.map(t => t.id === matchingTask.id ? { ...t, completed: true } : t));
      }
    }
    updateSettings('currentIntent', '');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] w-full px-4 text-center ">
      {/* Central Time & Greeting Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="mb-12"
      >
        <h1 
          id="zen-clock"
          className="font-sans text-[72px] sm:text-[96px] font-bold text-emphasis tracking-tighter leading-none select-none drop-shadow-[0_0_25px_var(--color-primary)] opacity-95 mb-4"
        >
          {time || '00:00'}
        </h1>

        {/* Customizable Greeting */}
        <div className="flex items-center justify-center gap-2 group min-h-[44px]">
          {isEditingName ? (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center bg-surface-container/60 backdrop-blur-md rounded-lg px-2 py-1 border border-primary/20"
            >
              <input
                type="text"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                autoFocus
                maxLength={30}
                className="bg-transparent border-none text-emphasis text-xl sm:text-2xl font-semibold focus:outline-none focus:ring-0 text-center w-48 font-sans"
              />
              <button onClick={handleNameSave} className="text-primary hover:text-emphasis ml-1 p-1">
                <LucideIcon name="Check" size={18} />
              </button>
            </motion.div>
          ) : (
            <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => { setInputName(settings.name); setIsEditingName(true); }}>
              <p className="font-sans text-xl sm:text-3xl text-on-surface-variant/90 font-medium tracking-wide">
                {t[greetingKey]}, <span className="text-emphasis font-semibold hover:border-b hover:border-emphasis select-none transition-all">{settings.name || 'Alex'}</span>.
              </p>
              <button 
                className="opacity-0 group-hover:opacity-100 text-on-surface-variant/60 hover:text-primary transition-opacity p-1 ml-1"
                title={t.editName}
              >
                <LucideIcon name="Edit" size={16} />
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Translucent Google/DuckDuckGo/Ecosia Search Bar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className={`relative w-full max-w-xl sm:max-w-2xl mb-12 ${shouldShowSearchHistory ? 'z-50' : 'z-20'}`}
      >
        <form
          onSubmit={handleSearchSubmit}
          className="relative bg-surface-container/30 border border-outline-variant/10 backdrop-blur-xl rounded-[28px] px-5 py-3.5 flex items-center shadow-[0_4px_30px_rgba(0,0,0,0.1)] focus-within:bg-surface-container/50 focus-within:shadow-[0_0_30px_rgba(192,193,255,0.15)] focus-within:border-primary/40 transition-all duration-500 group"
        >
          {/* Search Icon Click toggles search engines dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              type="button" 
              onClick={handleToggleSearchEngine}
              className="text-on-surface-variant hover:text-primary transition-colors mr-3 cursor-pointer flex items-center justify-center p-1"
              title="Click to select search engine / 点击选择搜索引擎"
            >
              <LucideIcon name="Search" className="opacity-75 group-focus-within:opacity-100" size={20} />
            </button>
            <AnimatePresence>
              {isSelectingEngine && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-2 w-40 bg-surface-container-high border border-outline-variant/20 rounded-xl shadow-2xl py-2 z-50 backdrop-blur-3xl overflow-hidden"
                >
                  {searchEngineOptions.map(engine => (
                    <button
                      type="button"
                      key={engine.id}
                      onClick={() => {
                        updateSettings('searchEngine', engine.id);
                        setIsSelectingEngine(false);
                        searchInputRef.current?.focus();
                      }}
                      className={`w-full text-left px-4 py-2 text-sm font-sans flex items-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${
                        settings.searchEngine === engine.id ? 'text-primary font-medium bg-primary/10' : 'text-on-surface-variant hover:text-emphasis'
                      }`}
                    >
                      <span className="truncate">{engine.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 160)}
            placeholder={`${t.searchPlaceholder} ${selectedSearchEngineLabel}...`}
            className="bg-transparent border-none focus:outline-none focus:ring-0 text-emphasis placeholder-emphasis text-base sm:text-lg w-full font-sans outline-none"
          />

          <div className="hidden sm:flex items-center gap-1 text-on-surface-variant/30 text-xs font-semibold select-none pr-1">
            <kbd className="px-1.5 py-0.5 bg-surface-container-highest/60 rounded border border-outline-variant/10 text-on-surface-variant">⌘</kbd>
            <kbd className="px-1.5 py-0.5 bg-surface-container-highest/60 rounded border border-outline-variant/10 text-on-surface-variant">K</kbd>
          </div>

          <AnimatePresence>
            {shouldShowSearchHistory && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                onMouseDown={(event) => event.preventDefault()}
                className="absolute left-0 right-0 top-full mt-3 z-[70] cursor-default overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-high/95 py-2 text-left shadow-2xl backdrop-blur-3xl"
              >
                <div className="flex items-center justify-between gap-3 px-4 pb-2 mb-1 border-b border-outline-variant/10">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-primary/70 font-sans">
                    {t.searchHistoryLabel}
                  </span>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={handleClearSearchHistory}
                    className="text-[11px] font-semibold text-on-surface-variant/60 hover:text-emphasis transition-colors"
                  >
                    {t.clearSearchHistory}
                  </button>
                </div>
                {filteredSearchHistory.map((item) => (
                  <div
                    key={item}
                    className="group/history flex items-center gap-3 px-4 py-2.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  >
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleHistoryItemClick(item)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left text-on-surface-variant hover:text-emphasis"
                      title={item}
                    >
                      <LucideIcon name="History" size={17} className="shrink-0 opacity-70" />
                      <span className="truncate text-sm sm:text-base font-sans">{item}</span>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleRemoveHistoryItem(item)}
                      className="shrink-0 p-1.5 rounded-full text-on-surface-variant/50 opacity-0 group-hover/history:opacity-100 hover:text-emphasis hover:bg-black/10 dark:hover:bg-white/10 transition-all"
                      title={settings.language === 'zh' ? '删除这条搜索记录' : 'Remove this search'}
                    >
                      <LucideIcon name="X" size={14} />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>

      {/* Focus / Daily Intent Component */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="relative z-10 text-center min-h-[140px] px-2 w-full max-w-md"
      >
        <AnimatePresence mode="wait">
          {!settings.currentIntent ? (
            <motion.div
              key="no-intent"
              initial={{ opacity: 0, filter: 'blur(5px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(5px)' }}
              className="space-y-4"
            >
              <p className="font-sans text-xs tracking-[0.25em] text-primary/70 font-semibold uppercase">
                {t.currentIntent}
              </p>
              <form onSubmit={handleIntentSubmit} className="relative group max-w-md mx-auto">
                <input
                  type="text"
                  value={intentInput}
                  onChange={(e) => setIntentInput(e.target.value)}
                  placeholder={t.intentPlaceholder}
                  className="bg-transparent border-b border-outline-variant/30 focus:border-primary/80 transition-all duration-700 py-2.5 px-4 text-center text-lg sm:text-2xl text-emphasis w-full placeholder-emphasis outline-none focus:ring-0"
                />
                <div className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-primary group-focus-within:w-full transition-all duration-700 ease-out"></div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="active-intent"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4 bg-surface-container/20 border border-outline-variant/10 backdrop-blur-md p-6 rounded-2xl flex flex-col items-center justify-center shadow-lg"
            >
              <p className="font-sans text-[11px] tracking-[0.25em] text-primary/70 font-semibold uppercase">
                {t.todaysCoreGoal}
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center py-2">
                {/* Custom glowing circular checkbox */}
                <button
                  onClick={() => {
                    if (matchingTask) {
                      setTasks(tasks.map((t) => t.id === matchingTask.id ? { ...t, completed: !t.completed } : t));
                    }
                  }}
                  className={`w-6.5 h-6.5 rounded-full border-2 transition-all duration-300 flex items-center justify-center cursor-pointer ${
                    isIntentCompleted 
                    ? 'bg-primary/20 border-primary scale-105 shadow-[0_0_12px_rgba(192,193,255,0.4)]'
                    : 'border-on-surface-variant/35 hover:border-primary'
                  }`}
                  title={isIntentCompleted ? 'Mark incomplete' : 'Mark as complete'}
                >
                  <LucideIcon 
                    name="Check" 
                    className={`text-primary transition-all duration-300 ${isIntentCompleted ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} 
                    size={16} 
                  />
                </button>

                <p className={`font-sans text-xl sm:text-2xl text-emphasis font-medium break-all select-none transition-all duration-500 leading-tight ${
                  isIntentCompleted ? 'line-through text-on-surface-variant/40 italic' : ''
                }`}>
                  {settings.currentIntent}
                </p>

                {/* Clear objective / restart goal */}
                <button
                  onClick={() => handleClearIntent(false)}
                  className="text-on-surface-variant/40 hover:text-error transition-colors p-1"
                  title={t.clearGoal}
                >
                  <LucideIcon name="X" size={18} />
                </button>
              </div>

              {isIntentCompleted && (
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-emerald-400 text-xs font-semibold tracking-wide"
                >
                  {t.intentionMet}
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
