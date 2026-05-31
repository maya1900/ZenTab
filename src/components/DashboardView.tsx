import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LucideIcon, AVAILABLE_LINK_ICONS } from './LucideIcon';
import { QuickLink, NexusItem, LinkFolder, isFolder, Quote, QUOTES_LIST, DEFAULT_QUICK_LINKS, UserSettings, Task } from '../types';
import { translations } from '../translations';

interface DashboardViewProps {
  quickLinks: NexusItem[];
  setQuickLinks: React.Dispatch<React.SetStateAction<NexusItem[]>>;
  settings: UserSettings;
  updateSettings: (key: keyof UserSettings, value: any) => void;
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
}

interface SimulatedWeather {
  temp: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'foggy';
  desc: string;
  humidity: string;
  windSpeed: string;
  hourly: { time: string; temp: number; icon: string }[];
}

interface SearchResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

type DragSource =
  | { kind: 'top'; id: string }
  | { kind: 'folder-link'; folderId: string; linkId: string };

type DropIntent = 'before' | 'after' | 'folder';

interface DragPreviewItem {
  name: string;
  iconName: string;
  isFolder: boolean;
}

interface PointerDragState {
  pointerId: number;
  source: DragSource;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  active: boolean;
  item: DragPreviewItem;
}

const CITY_WEATHER_DATABASE: Record<string, SimulatedWeather> = {
  amsterdam: {
    temp: 22,
    condition: 'sunny',
    desc: 'Clear Sky • Amsterdam',
    humidity: '64%',
    windSpeed: '12 km/h',
    hourly: [
      { time: '14:00', temp: 21, icon: 'Cloud' },
      { time: '15:00', temp: 23, icon: 'Sun' },
      { time: '16:00', temp: 24, icon: 'Sun' },
      { time: '17:00', temp: 22, icon: 'CloudSun' }
    ]
  },
  beijing: {
    temp: 28,
    condition: 'sunny',
    desc: 'Breezy & Warm • Beijing',
    humidity: '40%',
    windSpeed: '9 km/h',
    hourly: [
      { time: '14:00', temp: 26, icon: 'Sun' },
      { time: '15:00', temp: 28, icon: 'Sun' },
      { time: '16:00', temp: 29, icon: 'Sun' },
      { time: '17:00', temp: 27, icon: 'CloudSun' }
    ]
  },
  tokyo: {
    temp: 19,
    condition: 'rainy',
    desc: 'Light Drizzle • Tokyo',
    humidity: '88%',
    windSpeed: '15 km/h',
    hourly: [
      { time: '14:00', temp: 18, icon: 'CloudRain' },
      { time: '15:00', temp: 19, icon: 'CloudRain' },
      { time: '16:00', temp: 19, icon: 'Cloud' },
      { time: '17:00', temp: 20, icon: 'CloudSun' }
    ]
  },
  london: {
    temp: 15,
    condition: 'cloudy',
    desc: 'Overcast Skies • London',
    humidity: '75%',
    windSpeed: '22 km/h',
    hourly: [
      { time: '14:00', temp: 14, icon: 'Cloud' },
      { time: '15:00', temp: 15, icon: 'Cloud' },
      { time: '16:00', temp: 16, icon: 'Cloud' },
      { time: '17:00', temp: 15, icon: 'CloudRain' }
    ]
  },
  newyork: {
    temp: 24,
    condition: 'sunny',
    desc: 'Sunny & Crisp • New York',
    humidity: '50%',
    windSpeed: '14 km/h',
    hourly: [
      { time: '14:00', temp: 23, icon: 'Sun' },
      { time: '15:00', temp: 24, icon: 'Sun' },
      { time: '16:00', temp: 25, icon: 'Sun' },
      { time: '17:00', temp: 24, icon: 'CloudSun' }
    ]
  }
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  quickLinks,
  setQuickLinks,
  settings,
  updateSettings,
  tasks,
  setTasks
}) => {
  const t = translations[settings.language || 'en'];
  // Weather Widget states
  const [citySearch, setCitySearch] = useState('');
  const [selectedCity, setSelectedCity] = useState(() => {
    const saved = localStorage.getItem('zentab_weather_city');
    if (saved) return saved;
    return 'amsterdam';
  });
  
  const [weatherData, setWeatherData] = useState<SimulatedWeather>(() => {
    const saved = localStorage.getItem('zentab_weather_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return CITY_WEATHER_DATABASE.amsterdam;
  });
  const [isFahrenheit, setIsFahrenheit] = useState(false);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    localStorage.setItem('zentab_weather_city', selectedCity);
    localStorage.setItem('zentab_weather_data', JSON.stringify(weatherData));
  }, [selectedCity, weatherData]);

  // Focus effect for Open-Meteo Geocoding
  useEffect(() => {
    if (citySearch.trim().length > 1) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      
      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearchingApi(true);
        try {
          const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(citySearch.trim())}&count=4&language=${settings.language === 'zh' ? 'zh' : 'en'}&format=json`);
          const data = await res.json();
          if (data.results) {
            setSearchResults(data.results.map((r: any) => ({
              id: r.id,
              name: r.name,
              latitude: r.latitude,
              longitude: r.longitude,
              country: r.country,
              admin1: r.admin1
            })));
          } else {
            setSearchResults([]);
          }
        } catch (err) {
          console.error("Geocoding API error", err);
          setSearchResults([]);
        } finally {
          setIsSearchingApi(false);
        }
      }, 400);
    } else {
      setSearchResults([]);
    }
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    }
  }, [citySearch, settings.language]);

  // Pomodoro states
  const [timerMode, setTimerMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timerMax, setTimerMax] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  // Quick Links states
  const [isEditingLinks, setIsEditingLinks] = useState(false);
  const [linkInputName, setLinkInputName] = useState('');
  const [linkInputUrl, setLinkInputUrl] = useState('');
  const [linkInputIcon, setLinkInputIcon] = useState('Link2');
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

  // Drag & drop + folder states
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropIntent, setDropIntent] = useState<DropIntent | null>(null);
  const [pointerDrag, setPointerDrag] = useState<PointerDragState | null>(null);
  const quickLinksGridRef = useRef<HTMLDivElement | null>(null);
  const topItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const suppressNextClickRef = useRef(false);
  const suppressNextClickTimerRef = useRef<number | null>(null);
  const dragSourceRef = useRef<DragSource | null>(null);
  const dropStateRef = useRef<{ targetId: string | null; intent: DropIntent | null }>({ targetId: null, intent: null });
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [renamingFolder, setRenamingFolder] = useState(false);
  const [folderNameDraft, setFolderNameDraft] = useState('');
  // When set, the link form is adding a link inside this folder
  const [activeFolderForForm, setActiveFolderForForm] = useState<string | null>(null);

  // Quotes states
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [copyToast, setCopyToast] = useState(false);

  // Sound ref helper for beautiful finished tone (Web Audio API)
  const playTimerFinishSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.3); // G5
      osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.45); // C6

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.0);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.1);
    } catch (e) {
      console.warn("Audio context failed: ", e);
    }
  };

  // Weather search updater
  const handleCitySelect = async (city: SearchResult | string) => {
    // If it's a fallback string lookup
    if (typeof city === 'string') {
      const formattedQuery = city.trim().toLowerCase().replace(' ', '');
      if (CITY_WEATHER_DATABASE[formattedQuery]) {
        setSelectedCity(formattedQuery);
        setWeatherData(CITY_WEATHER_DATABASE[formattedQuery]);
      }
      setCitySearch('');
      setIsSearchingCity(false);
      return;
    }
    
    // Attempt real live data fetch
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&timezone=auto`);
      const data = await res.json();
      
      const current = data.current;
      const hourly = data.hourly;
      
      const getConditionInfo = (code: number): { cond: SimulatedWeather['condition'], desc: string, icon: string } => {
        if (code === 0) return { cond: 'sunny', desc: 'Clear Skies', icon: 'Sun' };
        if (code <= 3) return { cond: 'cloudy', desc: 'Partly Cloudy', icon: 'CloudSun' };
        if (code === 45 || code === 48) return { cond: 'foggy', desc: 'Foggy', icon: 'Cloud' };
        if (code >= 51 && code <= 67) return { cond: 'rainy', desc: 'Rainy', icon: 'CloudRain' };
        if (code >= 71 && code <= 77) return { cond: 'rainy', desc: 'Snow', icon: 'CloudRain' };
        if (code >= 80 && code <= 82) return { cond: 'rainy', desc: 'Showers', icon: 'CloudRain' };
        if (code >= 95) return { cond: 'stormy', desc: 'Storm', icon: 'CloudLightning' };
        return { cond: 'cloudy', desc: 'Unknown', icon: 'Cloud' };
      };

      const currMapping = getConditionInfo(current.weather_code);
      
      // Calculate hourly start index (nearest to current time)
      const currentHourPrefix = current.time.substring(0, 14) + "00";
      const currentIndex = hourly.time.findIndex((t: string) => t >= currentHourPrefix);
      const startIndex = currentIndex !== -1 ? currentIndex : 0;
      
      const next4Hours = Array.from({length: 4}).map((_, i) => {
        const idx = Math.min(startIndex + i + 1, hourly.time.length - 1);
        const hm = hourly.time[idx].substring(11, 16);
        return {
          time: hm,
          temp: Math.round(hourly.temperature_2m[idx]),
          icon: getConditionInfo(hourly.weather_code[idx]).icon
        };
      });

      const newWeatherData: SimulatedWeather = {
        temp: Math.round(current.temperature_2m),
        condition: currMapping.cond,
        desc: `${currMapping.desc} • ${city.name}`,
        humidity: `${Math.round(current.relative_humidity_2m)}%`,
        windSpeed: `${Math.round(current.wind_speed_10m)} km/h`,
        hourly: next4Hours
      };
      
      setWeatherData(newWeatherData);
      setSelectedCity(city.name);
      setIsSearchingCity(false);
      setCitySearch('');
    } catch (err) {
      console.error("Open-Meteo fetch failed:", err);
      // Fallback
      if (CITY_WEATHER_DATABASE[city.name.toLowerCase()]) {
        setWeatherData(CITY_WEATHER_DATABASE[city.name.toLowerCase()]);
      }
      setSelectedCity(city.name);
      setIsSearchingCity(false);
      setCitySearch('');
    }
  };

  const handleCitySearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleCitySelect(searchResults[0]);
    } else {
      handleCitySelect(citySearch);
    }
  };

  // Pomodoro Countdown Mechanism
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      playTimerFinishSound();
      
      // Update complete session lists
      if (timerMode === 'focus') {
        setSessionCount((prev) => prev + 1);
        
        // Auto-complete the core focus task if it exists and is not yet complete
        if (settings.currentIntent) {
          const matchingTask = tasks.find(t => t.text === settings.currentIntent && !t.completed);
          if (matchingTask) {
            setTasks(tasks.map(t => t.id === matchingTask.id ? { ...t, completed: true } : t));
            updateSettings('currentIntent', ''); // Clear since it's done
            alert(`Well done! Your focus session concluded. "${matchingTask.text}" has been marked as complete.`);
            return;
          }
        }
        
        alert("Well done! Your focus session has concluded. Take a peaceful breath.");
      } else {
        alert("Break is complete. Ready to focus again?");
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timeLeft, timerMode, settings.currentIntent, tasks]);

  // Adjust timers depending on selected mood
  const handleTimerModeChange = (mode: 'focus' | 'shortBreak' | 'longBreak') => {
    setTimerMode(mode);
    setIsTimerRunning(false);
    let seconds = 25 * 60;
    if (mode === 'shortBreak') seconds = 5 * 60;
    if (mode === 'longBreak') seconds = 15 * 60;
    setTimeLeft(seconds);
    setTimerMax(seconds);
  };

  const handleTimerStartStop = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const handleTimerReset = () => {
    setIsTimerRunning(false);
    let seconds = 25 * 60;
    if (timerMode === 'shortBreak') seconds = 5 * 60;
    if (timerMode === 'longBreak') seconds = 15 * 60;
    setTimeLeft(seconds);
  };

  // Helper formats seconds to clock UI
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Weather temperatures helper
  const renderTemperature = (celsius: number) => {
    if (isFahrenheit) {
      const fahr = Math.round((celsius * 9) / 5 + 32);
      return `${fahr}°F`;
    }
    return `${celsius}°C`;
  };

  // SVG parameters for circle diagram
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (timeLeft / timerMax) * circumference;

  // Manage custom link saves
  const handleLinkSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkInputName.trim() || !linkInputUrl.trim()) return;

    let url = linkInputUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    if (editingLinkId) {
      // Edit an existing link wherever it lives (top level or inside a folder)
      setQuickLinks(
        quickLinks.map((item) => {
          if (item.id === editingLinkId && !isFolder(item)) {
            return { ...item, name: linkInputName.trim(), url, iconName: linkInputIcon };
          }
          if (isFolder(item)) {
            return {
              ...item,
              links: item.links.map((l) =>
                l.id === editingLinkId
                  ? { ...l, name: linkInputName.trim(), url, iconName: linkInputIcon }
                  : l
              )
            };
          }
          return item;
        })
      );
      setEditingLinkId(null);
    } else {
      const newLink: QuickLink = {
        id: Date.now().toString(),
        name: linkInputName.trim(),
        url,
        iconName: linkInputIcon
      };
      if (activeFolderForForm) {
        // Add into the targeted folder
        setQuickLinks(
          quickLinks.map((item) =>
            isFolder(item) && item.id === activeFolderForForm
              ? { ...item, links: [...item.links, newLink] }
              : item
          )
        );
      } else {
        setQuickLinks([...quickLinks, newLink]);
      }
    }

    setLinkInputName('');
    setLinkInputUrl('');
    setLinkInputIcon('Link2');
    setActiveFolderForForm(null);
  };

  // Delete a link from the top level or from inside any folder.
  // Folders that drop to a single link auto-dissolve back into a plain link.
  const handleLinkDelete = (id: string) => {
    const next: NexusItem[] = [];
    quickLinks.forEach((item) => {
      if (isFolder(item)) {
        const remaining = item.links.filter((l) => l.id !== id);
        if (remaining.length === item.links.length) {
          next.push(item);
        } else if (remaining.length > 1) {
          next.push({ ...item, links: remaining });
        } else if (remaining.length === 1) {
          next.push(remaining[0]); // dissolve folder back to single link
        }
        // remaining.length === 0 -> drop folder entirely
      } else if (item.id !== id) {
        next.push(item);
      }
    });
    setQuickLinks(next);
  };

  const handleLinkEditFill = (link: QuickLink) => {
    setEditingLinkId(link.id);
    setLinkInputName(link.name);
    setLinkInputUrl(link.url);
    setLinkInputIcon(link.iconName);
    setActiveFolderForForm(null);
    const formEl = document.getElementById('link-editor-container');
    formEl?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFolderDelete = (folderId: string) => {
    setQuickLinks(quickLinks.filter((item) => item.id !== folderId));
    if (openFolderId === folderId) setOpenFolderId(null);
  };

  // Break a folder apart, spilling its links back into the grid in place.
  const handleUngroupFolder = (folderId: string) => {
    const next: NexusItem[] = [];
    quickLinks.forEach((item) => {
      if (isFolder(item) && item.id === folderId) {
        next.push(...item.links);
      } else {
        next.push(item);
      }
    });
    setQuickLinks(next);
    if (openFolderId === folderId) setOpenFolderId(null);
  };

  const handleFolderRename = (folderId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setQuickLinks(
      quickLinks.map((item) =>
        isFolder(item) && item.id === folderId ? { ...item, name: trimmed } : item
      )
    );
  };

  // Move a link out of its folder back to the top level grid.
  const suppressNextClick = () => {
    suppressNextClickRef.current = true;
    if (suppressNextClickTimerRef.current) {
      window.clearTimeout(suppressNextClickTimerRef.current);
    }
    suppressNextClickTimerRef.current = window.setTimeout(() => {
      suppressNextClickRef.current = false;
      suppressNextClickTimerRef.current = null;
    }, 250);
  };

  const shouldSuppressClick = () => {
    if (!suppressNextClickRef.current) return false;
    suppressNextClickRef.current = false;
    if (suppressNextClickTimerRef.current) {
      window.clearTimeout(suppressNextClickTimerRef.current);
      suppressNextClickTimerRef.current = null;
    }
    return true;
  };

  const getDragSourceId = (source: DragSource | null) => {
    if (!source) return null;
    return source.kind === 'top' ? source.id : source.linkId;
  };

  const getSourcePreviewItem = (source: DragSource, items: NexusItem[] = quickLinks): DragPreviewItem | null => {
    if (source.kind === 'top') {
      const item = items.find((i) => i.id === source.id);
      if (!item) return null;
      return {
        name: item.name,
        iconName: isFolder(item) ? 'Folder' : item.iconName,
        isFolder: isFolder(item)
      };
    }

    const folder = items.find((i) => i.id === source.folderId && isFolder(i)) as LinkFolder | undefined;
    const link = folder?.links.find((l) => l.id === source.linkId);
    return link ? { name: link.name, iconName: link.iconName, isFolder: false } : null;
  };

  const isSourceFolder = (source: DragSource, items: NexusItem[] = quickLinks) => {
    if (source.kind !== 'top') return false;
    const item = items.find((i) => i.id === source.id);
    return item ? isFolder(item) : false;
  };

  const removeSourceFromItems = (items: NexusItem[], source: DragSource) => {
    let moved: NexusItem | QuickLink | null = null;
    let sourceFolderIndex = -1;
    const next: NexusItem[] = [];

    items.forEach((item, index) => {
      if (source.kind === 'top') {
        if (item.id === source.id) {
          moved = item;
          return;
        }
        next.push(item);
        return;
      }

      if (isFolder(item) && item.id === source.folderId) {
        sourceFolderIndex = index;
        const target = item.links.find((l) => l.id === source.linkId);
        if (target) moved = target;
        const remaining = item.links.filter((l) => l.id !== source.linkId);
        if (remaining.length > 1) {
          next.push({ ...item, links: remaining });
        } else if (remaining.length === 1) {
          next.push(remaining[0]);
        }
        return;
      }

      next.push(item);
    });

    return { items: next, moved, sourceFolderIndex };
  };

  const insertAtTopLevel = (items: NexusItem[], moved: NexusItem, index: number) => {
    const boundedIndex = Math.max(0, Math.min(index, items.length));
    return [...items.slice(0, boundedIndex), moved, ...items.slice(boundedIndex)];
  };

  const applyDropToItems = (
    items: NexusItem[],
    source: DragSource,
    targetId: string | null,
    intent: DropIntent | null
  ): NexusItem[] | null => {
    if (source.kind === 'top' && source.id === targetId) return null;
    if (source.kind === 'folder-link' && source.linkId === targetId) return null;

    const { items: withoutSource, moved, sourceFolderIndex } = removeSourceFromItems(items, source);
    if (!moved) return null;

    if (!targetId || !intent) {
      return [...withoutSource, moved];
    }

    const targetIndex = withoutSource.findIndex((i) => i.id === targetId);
    const target = targetIndex >= 0 ? withoutSource[targetIndex] : undefined;
    const sourceIsFolder = isFolder(moved as NexusItem);

    if (intent === 'folder' && target && !sourceIsFolder) {
      if (source.kind === 'folder-link' && targetId === source.folderId) {
        const fallbackIndex = sourceFolderIndex >= 0 ? Math.min(sourceFolderIndex, withoutSource.length) : withoutSource.length;
        return insertAtTopLevel(withoutSource, moved, fallbackIndex);
      }

      if (isFolder(target)) {
        return withoutSource.map((item) =>
          item.id === targetId && isFolder(item)
            ? { ...item, links: [...item.links, moved as QuickLink] }
            : item
        );
      }

      const newFolder: LinkFolder = {
        id: `f-${Date.now()}`,
        name: t.newFolder,
        links: [target as QuickLink, moved as QuickLink]
      };
      return withoutSource.map((item) => (item.id === targetId ? newFolder : item));
    }

    if (targetIndex !== -1) {
      const insertAt = intent === 'before' ? targetIndex : targetIndex + 1;
      return insertAtTopLevel(withoutSource, moved, insertAt);
    }

    if (source.kind === 'folder-link' && targetId === source.folderId && sourceFolderIndex >= 0) {
      const insertAt = intent === 'before' ? sourceFolderIndex : sourceFolderIndex + 1;
      return insertAtTopLevel(withoutSource, moved, insertAt);
    }

    return [...withoutSource, moved];
  };

  // Move a link out of its folder back to the top level grid.
  const handleMoveLinkOut = (folderId: string, linkId: string) => {
    setQuickLinks((prev) => {
      const next = applyDropToItems(prev, { kind: 'folder-link', folderId, linkId }, null, null);
      if (next && openFolderId === folderId) {
        const stillExists = next.some((i) => i.id === folderId && isFolder(i));
        if (!stillExists) setOpenFolderId(null);
      }
      return next ?? prev;
    });
  };

  // ---- Drag & drop ---------------------------------------------------------
  const resetDragState = () => {
    dragSourceRef.current = null;
    dropStateRef.current = { targetId: null, intent: null };
    setDragSource(null);
    setDragOverId(null);
    setDropIntent(null);
    setPointerDrag(null);
  };

  const setDropState = (targetId: string | null, intent: DropIntent | null) => {
    dropStateRef.current = { targetId, intent };
    setDragOverId(targetId);
    setDropIntent(intent);
  };

  const computeDropIntent = (clientX: number, targetId: string, source: DragSource, rect?: DOMRect): DropIntent | null => {
    const target = quickLinks.find((i) => i.id === targetId);
    if (!target) {
      if (source.kind === 'folder-link' && targetId === source.folderId) {
        const fallbackRect = topItemRefs.current[targetId]?.getBoundingClientRect();
        if (!fallbackRect && !rect) return null;
        const ratio = (clientX - (rect ?? fallbackRect!).left) / (rect ?? fallbackRect!).width;
        return ratio < 0.5 ? 'before' : 'after';
      }
      return null;
    }

    const targetRect = rect ?? topItemRefs.current[targetId]?.getBoundingClientRect();
    if (!targetRect) return null;
    const ratio = (clientX - targetRect.left) / targetRect.width;
    const draggedIsFolder = isSourceFolder(source);
    const targetIsFolder = isFolder(target);
    const sameParentFolder = source.kind === 'folder-link' && source.folderId === targetId;

    if (!sameParentFolder && targetIsFolder && !draggedIsFolder) {
      return 'folder';
    }
    if (!targetIsFolder && !draggedIsFolder && ratio > 0.3 && ratio < 0.7) {
      return 'folder';
    }
    return ratio < 0.5 ? 'before' : 'after';
  };

  const updateDropTargetFromPoint = (clientX: number, clientY: number, source: DragSource) => {
    const entries = Object.entries(topItemRefs.current) as Array<[string, HTMLDivElement | null]>;
    for (const [id, node] of entries) {
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        const intent = computeDropIntent(clientX, id, source, rect);
        if (intent) {
          setDropState(id, intent);
          return;
        }
      }
    }

    const gridRect = quickLinksGridRef.current?.getBoundingClientRect();
    if (gridRect && clientX >= gridRect.left && clientX <= gridRect.right && clientY >= gridRect.top && clientY <= gridRect.bottom) {
      setDropState(null, null);
      return;
    }

    setDropState(null, null);
  };

  const commitDrop = (source = dragSourceRef.current, targetId = dropStateRef.current.targetId, intent = dropStateRef.current.intent) => {
    if (!source) {
      resetDragState();
      return;
    }

    setQuickLinks((prev) => {
      const next = applyDropToItems(prev, source, targetId, intent);
      if (next && source.kind === 'folder-link' && openFolderId === source.folderId) {
        const stillExists = next.some((i) => i.id === source.folderId && isFolder(i));
        if (!stillExists) setOpenFolderId(null);
      }
      return next ?? prev;
    });
    resetDragState();
  };

  const beginNativeDrag = (e: React.DragEvent, source: DragSource) => {
    dragSourceRef.current = source;
    setDragSource(source);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', getDragSourceId(source) ?? '');
    } catch (_) {}
  };

  const handleItemDragOver = (e: React.DragEvent, targetId: string) => {
    const source = dragSourceRef.current ?? dragSource;
    if (!source || getDragSourceId(source) === targetId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const intent = computeDropIntent(e.clientX, targetId, source, rect);
    if (intent) setDropState(targetId, intent);
  };

  const handleItemDrop = (e: React.DragEvent) => {
    e.preventDefault();
    commitDrop();
  };

  const handleFolderOverlayDragOver = (e: React.DragEvent) => {
    const source = dragSourceRef.current ?? dragSource;
    if (!source || source.kind !== 'folder-link') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    updateDropTargetFromPoint(e.clientX, e.clientY, source);
  };

  const handleFolderOverlayDrop = (e: React.DragEvent) => {
    const source = dragSourceRef.current ?? dragSource;
    if (!source || source.kind !== 'folder-link') return;
    e.preventDefault();
    commitDrop(source);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>, source: DragSource) => {
    if (!isEditingLinks || e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    const item = getSourcePreviewItem(source);
    if (!item) return;

    dragSourceRef.current = source;
    setDragSource(source);
    setPointerDrag({
      pointerId: e.pointerId,
      source,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      active: false,
      item
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    setPointerDrag((current) => {
      if (!current || current.pointerId !== e.pointerId) return current;

      const delta = Math.hypot(e.clientX - current.startX, e.clientY - current.startY);
      const active = current.active || delta > 8;
      if (active) {
        e.preventDefault();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch (_) {}
        updateDropTargetFromPoint(e.clientX, e.clientY, current.source);
      }

      return { ...current, currentX: e.clientX, currentY: e.clientY, active };
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    const current = pointerDrag;
    if (!current || current.pointerId !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (current.active) {
      e.preventDefault();
      suppressNextClick();
      commitDrop(current.source);
    } else {
      resetDragState();
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLElement>) => {
    if (!pointerDrag || pointerDrag.pointerId !== e.pointerId) return;
    resetDragState();
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    if (isEditingLinks || shouldSuppressClick()) e.preventDefault();
  };

  const handleFolderClick = (e: React.MouseEvent, folderId: string) => {
    if (shouldSuppressClick() || isEditingLinks) {
      e.preventDefault();
      return;
    }
    setOpenFolderId(folderId);
  };

  const handleRestoreDefaultLinks = () => {
    const confirmMsg = settings.language === 'zh'
      ? "确定要恢复初始通道预设吗？你的自定义通道会被保留，但缺失的默认通道会被重新添加。"
      : "Restore original link presets? Any custom entries will remain, but missing defaults will be added!";
    if (confirm(confirmMsg)) {
      // Collect every existing link name (top level + nested) to avoid dupes
      const existingNames = new Set<string>();
      quickLinks.forEach((item) => {
        if (isFolder(item)) {
          item.links.forEach((l) => existingNames.add(l.name.toLowerCase()));
        } else {
          existingNames.add(item.name.toLowerCase());
        }
      });
      const merged = [...quickLinks];
      DEFAULT_QUICK_LINKS.forEach((def) => {
        if (!existingNames.has(def.name.toLowerCase())) {
          merged.push(def);
        }
      });
      setQuickLinks(merged);
    }
  };

  const openFolder = openFolderId
    ? (quickLinks.find((i) => i.id === openFolderId && isFolder(i)) as LinkFolder | undefined)
    : undefined;

  // Wisdom Quote Actions
  const handleShuffleQuote = () => {
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * QUOTES_LIST.length);
    } while (nextIndex === currentQuoteIndex && QUOTES_LIST.length > 1);
    
    setCurrentQuoteIndex(nextIndex);
  };

  const handleShareQuote = () => {
    const q = QUOTES_LIST[currentQuoteIndex];
    const textToCopy = `"${q.text}" — ${q.author}`;
    navigator.clipboard.writeText(textToCopy);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  };

  const currentQuote = QUOTES_LIST[currentQuoteIndex];

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 pb-24">
      
      {/* Top dashboard section: Weather & Pomodoro Timer Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Interactive Weather Widget */}
        <section className="md:col-span-5 lg:col-span-4 h-full">
          <div className="glass-panel p-6 rounded-2xl h-full flex flex-col justify-between shadow-md relative min-h-[300px]">
            <div className="flex justify-between items-start">
              <div className="space-y-1 w-full mr-2">
                <div className="flex items-center justify-between">
                  <p className="font-sans text-[11px] tracking-[0.2em] text-primary/70 font-semibold uppercase">
                    {t.sanctuaryWeather}
                  </p>
                  <button 
                    onClick={() => setIsFahrenheit(!isFahrenheit)}
                    className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-on-surface-variant hover:text-primary hover:bg-white/10 cursor-pointer"
                  >
                    {isFahrenheit ? t.toCelsius : t.toFahrenheit}
                  </button>
                </div>

                <div className="flex items-baseline gap-2 pt-1 flex-wrap">
                  <h2 className="font-sans text-4xl font-bold text-emphasis select-none">
                    {renderTemperature(weatherData.temp)}
                  </h2>
                  <p className="text-on-surface-variant text-xs">
                    {(() => {
                      const rawDesc = weatherData.desc.split('•');
                      const condText = rawDesc[0].trim();
                      const cityText = rawDesc[1]?.trim() || selectedCity;
                      
                      let translatedCond = condText;
                      if (/clear sky/i.test(condText) || /clear skies/i.test(condText)) {
                        translatedCond = t.weather_clear;
                      } else if (/breezy/i.test(condText)) {
                        translatedCond = t.weather_breezy;
                      } else if (/drizzle/i.test(condText)) {
                        translatedCond = t.weather_drizzle;
                      } else if (/overcast/i.test(condText)) {
                        translatedCond = t.weather_overcast;
                      } else if (/sunny/i.test(condText)) {
                        translatedCond = t.weather_sunny;
                      } else if (/rain/i.test(condText)) {
                        translatedCond = t.weather_rain;
                      } else if (/thunder/i.test(condText)) {
                        translatedCond = t.weather_thunder;
                      } else if (/mist/i.test(condText)) {
                        translatedCond = t.weather_mist;
                      }
                      
                      const displayCity = cityText.charAt(0).toUpperCase() + cityText.slice(1);
                      return `${translatedCond} • ${displayCity}`;
                    })()}
                  </p>
                </div>
              </div>

              {/* Dynamic condition-specific icon */}
              <div className="text-primary mt-4 select-none drop-shadow-[0_0_8px_rgba(192,193,255,0.4)]">
                {weatherData.condition === 'sunny' && <LucideIcon name="Sun" size={40} />}
                {weatherData.condition === 'cloudy' && <LucideIcon name="CloudSun" size={40} />}
                {weatherData.condition === 'rainy' && <LucideIcon name="CloudRain" size={40} />}
                {weatherData.condition === 'stormy' && <LucideIcon name="CloudLightning" size={40} />}
                {weatherData.condition === 'foggy' && <LucideIcon name="Cloud" size={40} />}
              </div>
            </div>

            {/* City Search Selector */}
            <div className="my-4">
              {isSearchingCity ? (
                <div className="relative">
                  <form onSubmit={handleCitySearchSubmit} className="flex gap-1.5 items-center bg-surface-container-high/60 rounded-lg p-1 border border-outline-variant/30">
                    <input 
                      type="text" 
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                      placeholder={settings.language === 'zh' ? '搜索阿姆斯特丹、北京、伦敦...' : 'Search Amsterdam, Beijing, London...'} 
                      className="bg-transparent border-none focus:outline-none focus:ring-0 text-xs text-emphasis placeholder-on-surface-variant/40 w-full px-2"
                      autoFocus
                    />
                    <button type="submit" className="text-primary p-1 bg-surface-container rounded hover:bg-surface-container-highest cursor-pointer">
                      <LucideIcon name="Search" size={14} />
                    </button>
                    <button type="button" onClick={() => { setIsSearchingCity(false); setCitySearch(''); }} className="text-on-surface-variant/60 hover:text-emphasis p-1 cursor-pointer">
                      <LucideIcon name="X" size={14} />
                    </button>
                  </form>
                  <AnimatePresence>
                    {isSearchFocused && searchResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-1.5 bg-surface-container-high border border-outline-variant/20 rounded-xl shadow-2xl py-1 md:py-2 z-50 backdrop-blur-2xl overflow-hidden max-h-48 overflow-y-auto"
                      >
                        {searchResults.map(city => (
                          <button
                            key={city.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault(); 
                              handleCitySelect(city);
                            }}
                            className="w-full text-left px-3 py-2 text-xs flex flex-col hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-on-surface-variant hover:text-emphasis cursor-pointer group"
                          >
                            <span className="font-medium text-emphasis group-hover:text-primary transition-colors">{city.name}</span>
                            <span className="text-[10px] opacity-70 mt-0.5 pointer-events-none truncate">
                              {city.admin1 ? `${city.admin1}, ` : ''}{city.country}
                            </span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button 
                  onClick={() => setIsSearchingCity(true)}
                  className="w-full flex items-center justify-center gap-1 py-1.5 text-xs bg-white/5 border border-white/5 rounded-lg text-on-surface-variant/80 hover:text-emphasis hover:bg-white/10 transition-all cursor-pointer select-none"
                >
                  <LucideIcon name="Compass" size={13} />
                  {t.changeLocation}
                </button>
              )}
            </div>

            {/* Simulated Weather Forecast details */}
            <div className="border-t border-outline-variant/10 pt-4 mt-auto">
              <div className="flex justify-between text-[11px] text-on-surface-variant/60 mb-3 select-none">
                <span>{t.humidity}: {weatherData.humidity}</span>
                <span>{t.wind}: {weatherData.windSpeed}</span>
              </div>
              
              <div className="flex gap-4 justify-between select-none">
                {weatherData.hourly.map((h, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <span className="text-[10px] text-on-surface-variant/50 mb-1">{h.time}</span>
                    <LucideIcon name={h.icon} size={14} className="text-on-surface-variant/80 my-1" />
                    <span className="text-xs text-emphasis font-medium mt-1">{renderTemperature(h.temp)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Advanced Premium Pomodoro Timer */}
        <section className="md:col-span-7 lg:col-span-8">
          <div className="glass-panel p-6 rounded-2xl h-full flex flex-col items-center justify-center relative overflow-hidden shadow-md min-h-[300px]">
            {/* Background lights reflecting digital timer state */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
              <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent"></div>
            </div>

            {/* Interval Mode selectors */}
            <div className="flex gap-2 self-start mb-4 bg-surface-container-low/50 backdrop-blur border border-white/5 p-1 rounded-full text-xs font-sans text-on-surface-variant select-none">
              <button
                onClick={() => handleTimerModeChange('focus')}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  timerMode === 'focus' ? 'bg-primary text-on-primary font-medium shadow' : 'hover:text-emphasis'
                }`}
              >
                {t.pmDeepFocus}
              </button>
              <button
                onClick={() => handleTimerModeChange('shortBreak')}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  timerMode === 'shortBreak' ? 'bg-primary text-on-primary font-medium shadow' : 'hover:text-emphasis'
                }`}
              >
                {t.pmShortBreak}
              </button>
              <button
                onClick={() => handleTimerModeChange('longBreak')}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  timerMode === 'longBreak' ? 'bg-primary text-on-primary font-medium shadow' : 'hover:text-emphasis'
                }`}
              >
                {t.pmLongBreak}
              </button>
            </div>

            {/* Glowing clock and graphical SVG progress circle */}
            <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center my-2">
              <svg className="w-full h-full -rotate-90 scale-95">
                <circle
                  className="text-surface-container-highest/60"
                  cx="100"
                  cy="100"
                  r="90"
                  fill="transparent"
                  strokeWidth="5"
                  transform="translate(6, 6)"
                />
                <motion.circle
                  className="text-primary"
                  cx="100"
                  cy="100"
                  r="90"
                  fill="transparent"
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  animate={{ strokeDashoffset: strokeOffset }}
                  strokeLinecap="round"
                  transform="translate(6, 6)"
                  style={{
                    filter: "drop-shadow(0 0 10px rgba(192, 193, 255, 0.45))"
                  }}
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center mt-[-4px]">
                <p 
                  id="pomodoro-time"
                  className="font-sans text-4xl sm:text-5xl font-semibold leading-none text-emphasis tracking-tight tabular-nums select-none"
                >
                  {formatTime(timeLeft)}
                </p>
                <div className="flex flex-col items-center gap-1.5 mt-2.5 select-none">
                  <span className="font-sans text-[10px] tracking-[0.25em] text-primary/70 font-semibold uppercase leading-none">
                    {timerMode === 'focus' ? t.pmDeepFocus : t.breatheTip}
                  </span>
                  {timerMode === 'focus' && sessionCount > 0 && (
                    <span className="text-[10px] bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full text-primary leading-none">
                      {t.focusSession}{sessionCount}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Control triggers */}
            <div className="mt-4 flex gap-4 w-full justify-center max-w-xs select-none">
              <button
                onClick={handleTimerStartStop}
                className={`bg-primary text-on-primary px-6 py-2.5 rounded-full font-sans text-xs font-semibold tracking-wider uppercase flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all w-32 justify-center shadow-lg cursor-pointer`}
              >
                <LucideIcon name={isTimerRunning ? 'Pause' : 'Play'} size={14} className="fill-current" />
                {isTimerRunning ? t.pause : t.start}
              </button>
              
              <button
                onClick={handleTimerReset}
                className="border border-outline-variant/30 text-on-surface-variant hover:text-emphasis hover:bg-white/5 px-6 py-2.5 rounded-full font-sans text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5 active:scale-95 transition-all w-32 justify-center cursor-pointer"
              >
                <LucideIcon name="RotateCcw" size={13} />
                {t.reset}
              </button>
            </div>
            
            {/* Display synced core focus from home view */}
            {settings.currentIntent && (
              <div className="mt-5 w-full flex flex-col items-center justify-center border-t border-outline-variant/10 pt-4 relative group">
                <span className="font-sans text-[9px] tracking-[0.25em] text-primary/70 font-semibold uppercase mb-1 flex items-center gap-1">
                  <LucideIcon name="Target" size={10} />
                  {t.currentIntent || 'Core Focus'}
                </span>
                <p className="text-sm font-medium text-emphasis text-center break-words line-clamp-2 max-w-[80%]">
                  {settings.currentIntent}
                </p>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      const matchingTask = tasks.find(t => t.text === settings.currentIntent && !t.completed);
                      if (matchingTask) {
                        setTasks(tasks.map(t => t.id === matchingTask.id ? { ...t, completed: true } : t));
                      }
                      updateSettings('currentIntent', '');
                    }}
                    className="p-1.5 bg-surface-container hover:bg-primary/20 hover:text-primary text-on-surface-variant rounded-full cursor-pointer transition-colors shadow-sm"
                    title="Mark focus as complete"
                  >
                    <LucideIcon name="Check" size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Center: Digital Nexus Quick Links Section with custom manager */}
      <section className="glass-panel p-6 rounded-2xl shadow-md">
        <div className="flex justify-between items-center mb-6 select-none border-b border-outline-variant/10 pb-4">
          <div>
            <h3 className="font-sans text-[11px] tracking-[0.25em] text-primary/70 font-semibold uppercase">
              {t.digitalNexus}
            </h3>
            <p className="text-xs text-on-surface-variant/60 font-sans mt-0.5">{t.quickAccessSub}</p>
          </div>
          <div className="flex items-center gap-3">
            {isEditingLinks && (
              <button 
                onClick={handleRestoreDefaultLinks} 
                className="text-on-surface-variant/50 hover:text-primary text-[11px] font-sans border-r border-outline-variant/20 pr-3 cursor-pointer"
              >
                {t.restoreDefaults}
              </button>
            )}
            <button
              onClick={() => setIsEditingLinks(!isEditingLinks)}
              className="text-primary font-sans text-xs font-medium hover:underline transition-colors flex items-center gap-1 cursor-pointer"
            >
              <LucideIcon name={isEditingLinks ? 'Check' : 'Edit'} size={12} />
              {isEditingLinks ? t.finishEditing : t.editLinks}
            </button>
          </div>
        </div>

        {/* Dynamic customized link list (drag to reorder / drop to group) */}
        {isEditingLinks && (
          <p className="text-[11px] text-on-surface-variant/45 font-sans mb-4 flex items-center gap-1.5 select-none">
            <LucideIcon name="Info" size={12} />
            {t.dragToReorderHint}
          </p>
        )}
        <div ref={quickLinksGridRef} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6 justify-items-center">
          <AnimatePresence>
            {quickLinks.map((item) => {
              const itemIsFolder = isFolder(item);
              const topSource: DragSource = { kind: 'top', id: item.id };
              const isDragging = dragSource?.kind === 'top' && dragSource.id === item.id;
              const isDragTarget = dragOverId === item.id;
              const showFolderRing = isDragTarget && dropIntent === 'folder';
              const showBefore = isDragTarget && dropIntent === 'before';
              const showAfter = isDragTarget && dropIntent === 'after';

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: isDragging ? 0.4 : 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-20"
                >
                  <div
                    ref={(node) => { topItemRefs.current[item.id] = node; }}
                    draggable
                    onDragStart={(e) => beginNativeDrag(e, topSource)}
                    onDragOver={(e) => handleItemDragOver(e, item.id)}
                    onDragLeave={() => { if (dragOverId === item.id) setDropState(null, null); }}
                    onDrop={handleItemDrop}
                    onDragEnd={resetDragState}
                    onPointerDown={(e) => handlePointerDown(e, topSource)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    style={{ touchAction: isEditingLinks ? 'none' : 'auto' }}
                    className="group relative flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing w-20 text-center"
                  >
                  {/* Insertion markers for reorder */}
                  {showBefore && (
                    <span className="absolute -left-3 top-2 h-14 w-[3px] rounded-full bg-primary shadow-[0_0_8px_rgba(192,193,255,0.7)] z-10" />
                  )}
                  {showAfter && (
                    <span className="absolute -right-3 top-2 h-14 w-[3px] rounded-full bg-primary shadow-[0_0_8px_rgba(192,193,255,0.7)] z-10" />
                  )}

                  {itemIsFolder ? (
                    /* ---- Folder tile ---- */
                    <button
                      type="button"
                      onClick={(e) => handleFolderClick(e, item.id)}
                      className={`w-14 h-14 rounded-2xl bg-surface-container/40 border backdrop-blur-md grid grid-cols-2 grid-rows-2 gap-1 p-2 transition-all duration-300 hover:bg-surface-container/70 hover:border-primary/40 active:scale-95 ${
                        showFolderRing ? 'border-primary ring-2 ring-primary/60 scale-105' : 'border-outline-variant/10'
                      }`}
                      title={item.name}
                    >
                      {(item as LinkFolder).links.slice(0, 4).map((l) => (
                        <span key={l.id} className="flex items-center justify-center text-on-surface/80 pointer-events-none">
                          <LucideIcon name={l.iconName} size={12} />
                        </span>
                      ))}
                    </button>
                  ) : (
                    /* ---- Single link tile ---- */
                    <a
                      href={isEditingLinks ? undefined : item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleLinkClick}
                      className={`w-14 h-14 rounded-full bg-surface-container/40 border backdrop-blur-md flex items-center justify-center transition-all duration-300 group-hover:bg-primary group-hover:text-on-primary group-hover:shadow-[0_0_20px_rgba(192,193,255,0.4)] group-hover:border-primary/50 relative active:scale-95 ${
                        showFolderRing ? 'border-primary ring-2 ring-primary/60 scale-105' : 'border-outline-variant/10'
                      }`}
                    >
                      <LucideIcon name={item.iconName} size={24} className="text-on-surface group-hover:text-on-primary transition-colors pointer-events-none" />
                    </a>
                  )}

                  <span className="font-sans text-xs text-on-surface-variant group-hover:text-primary transition-colors font-medium truncate w-full px-1">
                    {item.name}
                  </span>

                  {/* Edit overlay triggers */}
                  {isEditingLinks && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px] rounded-2xl p-1 gap-1.5 transition-all">
                      {itemIsFolder ? (
                        <>
                          <button
                            data-no-drag
                            onClick={() => setOpenFolderId(item.id)}
                            className="text-teal-400 hover:scale-110 p-1 cursor-pointer"
                            title={t.openFolder}
                          >
                            <LucideIcon name="FolderOpen" size={14} />
                          </button>
                          <button
                            data-no-drag
                            onClick={() => handleUngroupFolder(item.id)}
                            className="text-amber-400 hover:scale-110 p-1 cursor-pointer"
                            title={t.ungroupFolder}
                          >
                            <LucideIcon name="Folder" size={14} />
                          </button>
                          <button
                            data-no-drag
                            onClick={() => handleFolderDelete(item.id)}
                            className="text-error hover:scale-110 p-1 cursor-pointer"
                            title="Delete folder"
                          >
                            <LucideIcon name="Trash2" size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            data-no-drag
                            onClick={() => handleLinkEditFill(item)}
                            className="text-teal-400 hover:scale-110 p-1 cursor-pointer"
                            title={t.editLinks}
                          >
                            <LucideIcon name="Edit" size={14} />
                          </button>
                          <button
                            data-no-drag
                            onClick={() => handleLinkDelete(item.id)}
                            className="text-error hover:scale-110 p-1 cursor-pointer"
                            title="Delete link"
                          >
                            <LucideIcon name="Trash2" size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  </div>
                </motion.div>
              );
            })}

            {/* Direct insert quick link card */}
            {isEditingLinks && (
              <motion.div 
                layout
                className="flex flex-col items-center justify-center w-20 cursor-pointer"
              >
                <div 
                  className="w-14 h-14 rounded-full border-2 border-dashed border-outline-variant/40 hover:border-primary/50 flex items-center justify-center cursor-pointer transition-colors bg-white/5 active:scale-95"
                  onClick={() => {
                    setEditingLinkId(null);
                    setActiveFolderForForm(null);
                    setLinkInputName('');
                    setLinkInputUrl('');
                    setLinkInputIcon('Link2');
                    // Scroll to bottom form
                    const formEl = document.getElementById('link-editor-container');
                    formEl?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  title={t.newLink}
                >
                  <LucideIcon name="Plus" size={20} className="text-on-surface-variant" />
                </div>
                <span className="text-[10px] text-on-surface-variant/40 font-sans mt-2 select-none">{t.newLink}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Inline Links config form drawer */}
        {isEditingLinks && (
          <motion.div
            id="link-editor-container"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-8 bg-surface-container/20 border border-outline-variant/10 p-5 rounded-xl border-dashed"
          >
            <div className="flex items-center justify-between mb-4 border-b border-outline-variant/15 pb-2">
              <h4 className="font-sans text-xs font-semibold text-primary/80 uppercase flex items-center gap-1.5">
                {activeFolderForForm && <LucideIcon name="FolderPlus" size={13} />}
                {editingLinkId ? t.modifyLink : t.addLinkShort}
                {activeFolderForForm && (() => {
                  const f = quickLinks.find((i) => i.id === activeFolderForForm && isFolder(i)) as LinkFolder | undefined;
                  return f ? (
                    <span className="text-on-surface-variant/50 normal-case font-normal">→ {f.name}</span>
                  ) : null;
                })()}
              </h4>
              {(editingLinkId || activeFolderForForm) && (
                <button
                  onClick={() => { setEditingLinkId(null); setActiveFolderForForm(null); setLinkInputName(''); setLinkInputUrl(''); }}
                  className="text-xs text-on-surface-variant/60 hover:text-emphasis cursor-pointer"
                >
                  {t.cancel}
                </button>
              )}
            </div>

            <form onSubmit={handleLinkSave} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-3 space-y-1.5 text-left">
                <label className="text-[10px] text-on-surface-variant/50 uppercase font-sans tracking-wider">{t.shortcutName}</label>
                <input
                  type="text"
                  required
                  value={linkInputName}
                  onChange={(e) => setLinkInputName(e.target.value)}
                  placeholder="e.g. GitHub"
                  className="w-full text-sm bg-surface-container border border-outline-variant/20 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary/45 text-emphasis"
                />
              </div>

              <div className="md:col-span-4 space-y-1.5 text-left">
                <label className="text-[10px] text-on-surface-variant/50 uppercase font-sans tracking-wider">{t.shortcutUrl}</label>
                <input
                  type="text"
                  required
                  value={linkInputUrl}
                  onChange={(e) => {
                    const oldUrl = linkInputUrl;
                    const newUrl = e.target.value;
                    setLinkInputUrl(newUrl);

                    const recognizeUrl = (input: string) => {
                      if (!input) return null;
                      try {
                        const url = new URL(input.startsWith('http') ? input : `https://${input}`);
                        const hostname = url.hostname.replace(/^www\./, '');
                        if (!hostname) return null;

                        let name = hostname.split('.')[0];
                        if (name) name = name.charAt(0).toUpperCase() + name.slice(1);

                        // 智能图标匹配：常用网站用 Lucide 图标，其他用 favicon
                        let icon = `favicon:${hostname}`;

                        // 社交媒体
                        if (hostname.includes('github')) icon = 'Github';
                        else if (hostname.includes('twitter') || hostname.includes('x.com')) icon = 'Twitter';
                        else if (hostname.includes('linkedin')) icon = 'Linkedin';
                        else if (hostname.includes('facebook')) icon = 'Facebook';
                        else if (hostname.includes('instagram')) icon = 'Instagram';
                        else if (hostname.includes('reddit')) icon = 'MessageCircle';
                        else if (hostname.includes('discord')) icon = 'MessageSquare';
                        else if (hostname.includes('slack')) icon = 'MessageSquare';
                        else if (hostname.includes('telegram')) icon = 'Send';

                        // 视频/音乐
                        else if (hostname.includes('youtube') || hostname.includes('youtu.be')) icon = 'Youtube';
                        else if (hostname.includes('spotify')) icon = 'Music';
                        else if (hostname.includes('soundcloud')) icon = 'Music';
                        else if (hostname.includes('twitch')) icon = 'Tv';
                        else if (hostname.includes('netflix')) icon = 'Tv';

                        // 开发工具
                        else if (hostname.includes('stackoverflow') || hostname.includes('stackexchange')) icon = 'Code';
                        else if (hostname.includes('gitlab')) icon = 'GitBranch';
                        else if (hostname.includes('bitbucket')) icon = 'GitBranch';
                        else if (hostname.includes('figma')) icon = 'Figma';
                        else if (hostname.includes('notion')) icon = 'BookOpen';
                        else if (hostname.includes('confluence')) icon = 'BookOpen';
                        else if (hostname.includes('jira')) icon = 'ListTodo';
                        else if (hostname.includes('trello')) icon = 'Trello';
                        else if (hostname.includes('asana')) icon = 'CheckSquare';
                        else if (hostname.includes('linear')) icon = 'Zap';

                        // 文档/笔记
                        else if (hostname.includes('docs.google') || hostname.includes('drive.google')) icon = 'FileText';
                        else if (hostname.includes('dropbox')) icon = 'Cloud';
                        else if (hostname.includes('onedrive')) icon = 'Cloud';
                        else if (hostname.includes('evernote')) icon = 'BookOpen';
                        else if (hostname.includes('obsidian')) icon = 'BookOpen';
                        else if (hostname.includes('blog')) icon = 'BookOpen';

                        // 邮件/日历
                        else if (hostname.includes('gmail') || hostname.includes('mail.google')) icon = 'Mail';
                        else if (hostname.includes('outlook')) icon = 'Mail';
                        else if (hostname.includes('calendar.google')) icon = 'Calendar';
                        else if (hostname.includes('meet.google') || hostname.includes('zoom')) icon = 'Video';

                        // 电商
                        else if (hostname.includes('amazon')) icon = 'ShoppingBag';
                        else if (hostname.includes('ebay')) icon = 'ShoppingCart';
                        else if (hostname.includes('taobao') || hostname.includes('tmall')) icon = 'ShoppingBag';
                        else if (hostname.includes('jd.com')) icon = 'ShoppingCart';

                        // 搜索引擎
                        else if (hostname.includes('google.com') && !hostname.includes('mail') && !hostname.includes('drive') && !hostname.includes('docs')) icon = 'Search';
                        else if (hostname.includes('bing.com')) icon = 'Search';
                        else if (hostname.includes('baidu.com')) icon = 'Search';
                        else if (hostname.includes('duckduckgo')) icon = 'Search';

                        // 设计/创意
                        else if (hostname.includes('behance')) icon = 'Palette';
                        else if (hostname.includes('dribbble')) icon = 'Palette';
                        else if (hostname.includes('pinterest')) icon = 'Image';
                        else if (hostname.includes('unsplash') || hostname.includes('pexels')) icon = 'Camera';

                        // 学习/教育
                        else if (hostname.includes('coursera') || hostname.includes('udemy') || hostname.includes('edx')) icon = 'GraduationCap';
                        else if (hostname.includes('wikipedia')) icon = 'BookOpen';
                        else if (hostname.includes('medium')) icon = 'BookOpen';

                        // 其他常用
                        else if (hostname.includes('paypal')) icon = 'CreditCard';
                        else if (hostname.includes('stripe')) icon = 'CreditCard';
                        else if (hostname.includes('chatgpt') || hostname.includes('openai')) icon = 'Bot';
                        else if (hostname.includes('claude') || hostname.includes('anthropic')) icon = 'Bot';

                        return { name, icon };
                      } catch {
                        return null;
                      }
                    };

                    const oldRecognized = recognizeUrl(oldUrl);
                    const newRecognized = recognizeUrl(newUrl);

                    if (newRecognized) {
                      // 自动更新名称（如果名称为空或匹配旧的识别名称）
                      if (!linkInputName || (oldRecognized && linkInputName === oldRecognized.name)) {
                        setLinkInputName(newRecognized.name);
                      }
                      // 自动更新图标（始终跟随 URL 变化）
                      if (linkInputIcon === 'Link2' || (oldRecognized && linkInputIcon === oldRecognized.icon) || linkInputIcon.startsWith('favicon:')) {
                        setLinkInputIcon(newRecognized.icon);
                      }
                    }
                  }}
                  placeholder="github.com/my-profile"
                  className="w-full text-sm bg-surface-container border border-outline-variant/20 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary/45 text-emphasis"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5 text-left">
                <label className="text-[10px] text-on-surface-variant/50 uppercase font-sans tracking-wider">{t.accentIcon}</label>
                <select
                  value={linkInputIcon}
                  onChange={(e) => setLinkInputIcon(e.target.value)}
                  className="w-full text-sm bg-surface-container border border-outline-variant/20 rounded-lg py-2 px-1 focus:outline-none focus:ring-1 focus:ring-primary/45 text-emphasis"
                >
                  {(() => {
                    const url = linkInputUrl.trim();
                    if (url) {
                      try {
                        const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
                        const hostname = parsedUrl.hostname.replace(/^www\./, '');
                        const faviconValue = `favicon:${hostname}`;
                        return <option value={faviconValue}>Website Icon</option>;
                      } catch {
                        return <option value="favicon:" disabled>Website Icon (enter URL first)</option>;
                      }
                    }
                    return <option value="favicon:" disabled>Website Icon (enter URL first)</option>;
                  })()}
                  {AVAILABLE_LINK_ICONS.map((ic) => (
                    <option key={ic} value={ic}>
                      {ic}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-primary text-on-primary rounded-lg text-xs font-semibold cursor-pointer tracking-wide hover:brightness-110 active:scale-95 transition-all text-center flex items-center justify-center gap-1"
                >
                  <LucideIcon name="CheckSquare" size={13} />
                  {editingLinkId ? t.save : t.addCard}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </section>

      {/* Folder Modal: open a folder to launch / manage its links */}
      <AnimatePresence>
        {openFolder && (
          <motion.div
            key="folder-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => { setOpenFolderId(null); setRenamingFolder(false); }}
            onDragOver={handleFolderOverlayDragOver}
            onDrop={handleFolderOverlayDrop}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel w-full max-w-md rounded-3xl p-6 shadow-2xl border border-outline-variant/15 relative"
            >
              {/* Header: folder name (editable) + close */}
              <div className="flex items-center justify-between mb-5 gap-3">
                {renamingFolder ? (
                  <input
                    autoFocus
                    value={folderNameDraft}
                    onChange={(e) => setFolderNameDraft(e.target.value)}
                    onBlur={() => { handleFolderRename(openFolder.id, folderNameDraft); setRenamingFolder(false); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { handleFolderRename(openFolder.id, folderNameDraft); setRenamingFolder(false); }
                      if (e.key === 'Escape') setRenamingFolder(false);
                    }}
                    maxLength={24}
                    className="bg-surface-container/60 border border-primary/30 rounded-lg px-3 py-1.5 text-emphasis text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-primary/45 w-full"
                  />
                ) : (
                  <button
                    onClick={() => { setFolderNameDraft(openFolder.name); setRenamingFolder(true); }}
                    className="flex items-center gap-2 text-emphasis text-lg font-semibold hover:text-primary transition-colors group cursor-pointer min-w-0"
                    title={t.renameFolder}
                  >
                    <LucideIcon name="Folder" size={18} className="text-primary shrink-0" />
                    <span className="truncate">{openFolder.name}</span>
                    <LucideIcon name="Edit" size={13} className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                  </button>
                )}
                <button
                  onClick={() => { setOpenFolderId(null); setRenamingFolder(false); }}
                  className="p-1.5 text-on-surface-variant/60 hover:text-emphasis hover:bg-white/5 rounded-full transition-colors shrink-0 cursor-pointer"
                >
                  <LucideIcon name="X" size={18} />
                </button>
              </div>

              {/* Links grid inside the folder */}
              {openFolder.links.length === 0 ? (
                <p className="text-center text-on-surface-variant/50 text-sm py-10">{t.emptyFolder}</p>
              ) : (
                <div className="grid grid-cols-4 gap-5 justify-items-center">
                  {openFolder.links.map((l) => {
                    const folderLinkSource: DragSource = { kind: 'folder-link', folderId: openFolder.id, linkId: l.id };
                    const isDraggingFolderLink = dragSource?.kind === 'folder-link' && dragSource.linkId === l.id;

                    return (
                    <div
                      key={l.id}
                      draggable={isEditingLinks}
                      onDragStart={(e) => beginNativeDrag(e, folderLinkSource)}
                      onDragEnd={resetDragState}
                      onPointerDown={(e) => handlePointerDown(e, folderLinkSource)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerCancel}
                      style={{ touchAction: isEditingLinks ? 'none' : 'auto' }}
                      className={`group relative flex flex-col items-center gap-2 w-16 text-center cursor-grab active:cursor-grabbing ${isDraggingFolderLink ? 'opacity-40' : ''}`}
                    >
                      <a
                        href={isEditingLinks ? undefined : l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleLinkClick}
                        className="w-14 h-14 rounded-full bg-surface-container/40 border border-outline-variant/10 backdrop-blur-md flex items-center justify-center transition-all duration-300 group-hover:bg-primary group-hover:shadow-[0_0_20px_rgba(192,193,255,0.4)] group-hover:border-primary/50 active:scale-95"
                      >
                        <LucideIcon name={l.iconName} size={24} className="text-on-surface group-hover:text-on-primary transition-colors pointer-events-none" />
                      </a>
                      <span className="font-sans text-[11px] text-on-surface-variant group-hover:text-primary transition-colors font-medium truncate w-full">
                        {l.name}
                      </span>
                      {isEditingLinks && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px] rounded-2xl gap-1.5">
                          <button
                            data-no-drag
                            onClick={() => handleLinkEditFill(l)}
                            className="text-teal-400 hover:scale-110 p-1 cursor-pointer"
                            title={t.editLinks}
                          >
                            <LucideIcon name="Edit" size={13} />
                          </button>
                          <button
                            data-no-drag
                            onClick={() => handleMoveLinkOut(openFolder.id, l.id)}
                            className="text-amber-400 hover:scale-110 p-1 cursor-pointer"
                            title={t.removeFromFolder}
                          >
                            <LucideIcon name="FolderOpen" size={13} />
                          </button>
                          <button
                            data-no-drag
                            onClick={() => handleLinkDelete(l.id)}
                            className="text-error hover:scale-110 p-1 cursor-pointer"
                            title="Delete link"
                          >
                            <LucideIcon name="Trash2" size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}

              {/* Footer actions: only while editing */}
              {isEditingLinks && (
                <div className="mt-6 pt-4 border-t border-outline-variant/10 flex items-center justify-between gap-3">
                  <button
                    onClick={() => handleUngroupFolder(openFolder.id)}
                    className="text-[11px] text-on-surface-variant/60 hover:text-error transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <LucideIcon name="Folder" size={12} />
                    {t.ungroupFolder}
                  </button>
                  <button
                    onClick={() => {
                      setActiveFolderForForm(openFolder.id);
                      setEditingLinkId(null);
                      setLinkInputName('');
                      setLinkInputUrl('');
                      setLinkInputIcon('Link2');
                      setOpenFolderId(null);
                      setTimeout(() => {
                        document.getElementById('link-editor-container')?.scrollIntoView({ behavior: 'smooth' });
                      }, 50);
                    }}
                    className="text-xs bg-primary text-on-primary rounded-lg px-3 py-1.5 font-semibold flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                  >
                    <LucideIcon name="Plus" size={13} />
                    {t.newLink}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pointerDrag?.active && (
          <motion.div
            key="quick-link-drag-preview"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="fixed z-[90] pointer-events-none flex flex-col items-center gap-1 -translate-x-1/2 -translate-y-1/2"
            style={{ left: pointerDrag.currentX, top: pointerDrag.currentY }}
          >
            <div className={`w-14 h-14 ${pointerDrag.item.isFolder ? 'rounded-2xl grid grid-cols-2 grid-rows-2 gap-1 p-2' : 'rounded-full flex items-center justify-center'} bg-primary text-on-primary border border-primary shadow-[0_0_28px_rgba(192,193,255,0.55)] backdrop-blur-md`}>
              {pointerDrag.item.isFolder ? (
                <LucideIcon name="Folder" size={24} className="col-span-2 row-span-2 m-auto" />
              ) : (
                <LucideIcon name={pointerDrag.item.iconName} size={24} />
              )}
            </div>
            <span className="max-w-24 truncate rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-sans text-white shadow-lg">
              {pointerDrag.item.name}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom section: Ethereal Quotes Card with full offline wisdom shuffle & action controls */}
      <section className="glass-panel p-8 rounded-2xl flex flex-col items-center text-center relative shadow-md">
        {/* Subtle linear visual horizon indicator */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
        
        {/* Quote watermark icon */}
        <div className="text-primary/30 mb-4 select-none">
          <LucideIcon name="Quote" size={40} className="stroke-[1.5]" />
        </div>

        {/* Render Wise Quote with Playfair Display italics */}
        <blockquote className="max-w-2xl px-2">
          <p className="font-serif italic text-xl sm:text-2xl text-on-background leading-relaxed mb-4 select-all">
            "{currentQuote.text}"
          </p>
          <footer className="font-sans text-[11px] tracking-[0.25em] text-primary/80 font-bold uppercase select-none">
            — {currentQuote.author}
          </footer>
        </blockquote>

        {/* Action button controls */}
        <div className="mt-6 flex items-center justify-center gap-3 select-none">
          {/* Share option */}
          <button
            onClick={handleShareQuote}
            className="p-2 text-on-surface-variant hover:text-emphasis bg-white/5 rounded-full hover:bg-white/10 active:scale-95 transition-all relative cursor-pointer"
            title="Copy Quote contents to Clipboard"
          >
            <LucideIcon name="Share2" size={15} />
          </button>

          {/* Next shuffle triggers */}
          <button
            onClick={handleShuffleQuote}
            className="px-4 py-1.5 text-xs text-primary font-sans font-medium border border-primary/20 rounded-full hover:bg-primary/10 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
            title="Shuffle of wisdom quotes"
          >
            <LucideIcon name="Compass" size={12} />
            {t.nextWisdom}
          </button>
        </div>

        {/* Share Copy Success Notification */}
        <AnimatePresence>
          {copyToast && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-3 bg-primary text-on-primary px-3 py-1 rounded text-[11px] font-sans font-semibold tracking-wide shadow-md animate-bounce"
            >
              {t.quoteCopied}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
};
