import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LucideIcon } from './components/LucideIcon';
import { HomeView } from './components/HomeView';
import { DashboardView } from './components/DashboardView';
import { TasksView } from './components/TasksView';
import { SettingsView } from './components/SettingsView';
import { TabsManagerView } from './components/TabsManagerView';
import {
  Task,
  NexusItem,
  Quote,
  UserSettings,
  DEFAULT_QUICK_LINKS,
  BACKGROUND_PRESETS
} from './types';
import { translations } from './translations';

// Pre-populate tasks matching the pristine screenshots
const INITIAL_TASKS_PRESET: Task[] = [
  {
    id: 't1',
    text: 'Deep work session: UI architecture',
    completed: false,
    priority: 'high',
    time: '09:00 AM'
  },
  {
    id: 't2',
    text: 'Review client feedback for dashboard',
    completed: false,
    priority: 'medium'
  },
  {
    id: 't3',
    text: 'Update design system documentation',
    completed: false,
    priority: 'low'
  },
  {
    id: 't4',
    text: 'Refactor CSS utility classes',
    completed: true,
    priority: 'low'
  }
];

const INITIAL_SETTINGS: UserSettings = {
  name: 'Alex',
  searchEngine: 'google',
  bgUrl: BACKGROUND_PRESETS[0].url,
  fontScale: 100,
  layout: 'grid',
  darkMode: true,
  currentIntent: '',
  theme: 'dark',
  language: 'en',
  tabsAutoExpand: true,
  defaultTab: 'home'
};

export default function App() {
  // Navigation tabs state — initial view honors the user's saved "default tab" preference
  const [activeTab, setActiveTab] = useState<'home' | 'dashboard' | 'tasks' | 'tabs' | 'settings'>(() => {
    const saved = localStorage.getItem('zentab_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (['home', 'dashboard', 'tasks', 'tabs'].includes(parsed.defaultTab)) {
          return parsed.defaultTab;
        }
      } catch (e) {
        // fall through to default
      }
    }
    return 'home';
  });

  // Persistence triggers
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('zentab_settings');
    if (saved) {
      try {
        return { ...INITIAL_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        return INITIAL_SETTINGS;
      }
    }
    return INITIAL_SETTINGS;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('zentab_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_TASKS_PRESET;
      }
    }
    return INITIAL_TASKS_PRESET;
  });

  const [quickLinks, setQuickLinks] = useState<NexusItem[]>(() => {
    const saved = localStorage.getItem('zentab_links');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_QUICK_LINKS;
      }
    }
    return DEFAULT_QUICK_LINKS;
  });

  // Mouse Glow gradient coordinate variables
  const [mousePos, setMousePos] = useState({ x: '50%', y: '50%' });

  // Write changes back to localStorage
  useEffect(() => {
    localStorage.setItem('zentab_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('zentab_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('zentab_links', JSON.stringify(quickLinks));
  }, [quickLinks]);

  // Track mouse coordinates for immersive spotlight effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const xPercent = ((e.clientX / window.innerWidth) * 100).toFixed(1);
      const yPercent = ((e.clientY / window.innerHeight) * 100).toFixed(1);
      setMousePos({ x: `${xPercent}%`, y: `${yPercent}%` });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const [actualBgUrl, setActualBgUrl] = useState(settings.bgUrl);

  useEffect(() => {
    if (settings.bgUrl.startsWith('random:')) {
      const category = settings.bgUrl.split(':')[1];
      const seed = Math.floor(Math.random() * 10000);
      let query = 'landscape';
      if (category === 'landscape') query = 'landscape';
      else if (category === 'tech') query = 'technology';
      else if (category === 'anime') query = 'anime';
      
      setActualBgUrl(`https://loremflickr.com/1920/1080/${query}?random=${seed}`);
    } else {
      setActualBgUrl(settings.bgUrl);
    }
  }, [settings.bgUrl]);

  // Determine whether the theme should be dark or light
  const isDarkActive = useMemo(() => {
    if (settings.theme === 'dark') return true;
    if (settings.theme === 'light') return false;
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  }, [settings.theme]);

  // Synchronize theme state with the DOM body className
  useEffect(() => {
    const body = window.document.body;
    if (isDarkActive) {
      body.classList.remove('light-theme');
    } else {
      body.classList.add('light-theme');
    }
  }, [isDarkActive]);

  const t = translations[settings.language || 'en'];

  const updateSettings = (key: keyof UserSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetAllSettings = () => {
    setSettings(INITIAL_SETTINGS);
    setTasks(INITIAL_TASKS_PRESET);
    setQuickLinks(DEFAULT_QUICK_LINKS);
    setActiveTab('home');
  };

  // Apply font scale to document root so Tailwind's rem classes scale correctly
  useEffect(() => {
    document.documentElement.style.fontSize = `${settings.fontScale}%`;
  }, [settings.fontScale]);

  return (
    <div 
      className="min-h-screen bg-background text-on-background relative overflow-x-hidden font-sans select-none"
      style={{
        "--mouse-x": mousePos.x,
        "--mouse-y": mousePos.y
      } as React.CSSProperties}
    >
      {/* Immersive background graphic panels */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div 
          className={`absolute inset-0 bg-cover bg-center transition-all duration-[1200ms] ease-out ${
            isDarkActive 
              ? 'grayscale-[20%] brightness-[0.25]' 
              : 'saturate-[1.1]'
          }`}
          style={{ backgroundImage: `url("${actualBgUrl}")` }}
        />
        
        {/* Light theme brightening overlay */}
        <div 
          className={`absolute inset-0 bg-white/70 backdrop-blur-[2px] transition-all duration-[1200ms] ease-out ${
            isDarkActive ? 'opacity-0' : 'opacity-100'
          }`}
        />
      </div>
      
      {/* Background layer gradient masks */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-transparent via-background/15 to-background/70 pointer-events-none" />

      {/* Atmospheric cursor spotlight shine */}
      <div 
        className="fixed inset-0 z-1 pointer-events-none transition-all duration-300"
        style={{
          background: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(192, 193, 255, 0.045) 0%, transparent 45%)`
        }}
      />

      {/* Primary header navbar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-transparent flex justify-between items-center px-6 md:px-12 py-5 max-w-7xl mx-auto border-none">
        
        {/* Brand identity */}
        <div 
          onClick={() => setActiveTab('home')}
          className="font-sans text-2xl font-bold tracking-tight text-primary drop-shadow-[0_0_12px_rgba(192,193,255,0.4)] cursor-pointer hover:opacity-90 active:scale-95 transition-all"
        >
          ZenTab
        </div>

        {/* Navigation tabs */}
        <nav className="hidden md:flex items-center gap-8 self-center">
          <button
            onClick={() => setActiveTab('home')}
            className={`font-sans text-sm tracking-wide font-medium pb-1.5 transition-all cursor-pointer relative ${
              activeTab === 'home' 
              ? 'text-primary' 
              : 'text-on-surface-variant hover:text-emphasis'
            }`}
          >
            {t.home}
          </button>
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`font-sans text-sm tracking-wide font-medium pb-1.5 transition-all cursor-pointer relative ${
              activeTab === 'dashboard' 
              ? 'text-primary' 
              : 'text-on-surface-variant hover:text-emphasis'
            }`}
          >
            {t.dashboard}
            {activeTab === 'dashboard' && (
              <motion.div layoutId="nav-pill" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('tasks')}
            className={`font-sans text-sm tracking-wide font-medium pb-1.5 transition-all cursor-pointer relative ${
              activeTab === 'tasks'
              ? 'text-primary'
              : 'text-on-surface-variant hover:text-emphasis'
            }`}
          >
            {t.tasks}
            {activeTab === 'tasks' && (
              <motion.div layoutId="nav-pill" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('tabs')}
            className={`font-sans text-sm tracking-wide font-medium pb-1.5 transition-all cursor-pointer relative ${
              activeTab === 'tabs'
              ? 'text-primary'
              : 'text-on-surface-variant hover:text-emphasis'
            }`}
          >
            {t.tabsManager}
            {activeTab === 'tabs' && (
              <motion.div layoutId="nav-pill" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
            )}
          </button>
        </nav>

        {/* Settings shortcut togglers */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab(activeTab === 'settings' ? 'home' : 'settings')}
            className={`p-2 transition-all cursor-pointer rounded-full hover:bg-white/5 active:scale-90 ${
              activeTab === 'settings' ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-emphasis'
            }`}
            title="Configure ZenTab"
          >
            <LucideIcon name="Settings" size={20} />
          </button>
        </div>
      </header>

      {/* Centered widgets content canvas panels */}
      <main className="relative z-10 pt-28 pb-20 max-w-7xl mx-auto w-full min-h-screen flex flex-col justify-between">
        
        {/* Navigation router slots with exit layout transitions */}
        <div className="flex-grow flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div
                key="home-tab"
                initial={{ opacity: 0, filter: 'blur(10px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(10px)' }}
                transition={{ duration: 0.5 }}
                className="w-full flex-grow flex flex-col justify-center gap-8"
              >
                {/* 1. Main Home clock section */}
                <HomeView settings={settings} updateSettings={updateSettings} tasks={tasks} setTasks={setTasks} />

                {/* 2. Embedded mini widgets if "Productivity Grid" layout is activated */}
                {settings.layout === 'grid' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="w-full px-4"
                  >
                    <div className="pt-6 border-t border-outline-variant/10 max-w-5xl mx-auto">
                      <p className="font-sans text-[10px] tracking-[0.25em] text-primary/45 font-bold uppercase text-center mb-6">
                        {t.integratedCompanion}
                      </p>
                      
                      <DashboardView 
                        quickLinks={quickLinks} 
                        setQuickLinks={setQuickLinks} 
                        settings={settings}
                        updateSettings={updateSettings}
                        tasks={tasks}
                        setTasks={setTasks}
                      />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard-tab"
                initial={{ opacity: 0, filter: 'blur(10px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(10px)' }}
                transition={{ duration: 0.5 }}
                className="w-full"
              >
                <DashboardView 
                  quickLinks={quickLinks} 
                  setQuickLinks={setQuickLinks} 
                  settings={settings}
                  updateSettings={updateSettings}
                  tasks={tasks}
                  setTasks={setTasks}
                />
              </motion.div>
            )}

            {activeTab === 'tasks' && (
              <motion.div
                key="tasks-tab"
                initial={{ opacity: 0, filter: 'blur(10px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(10px)' }}
                transition={{ duration: 0.5 }}
                className="w-full"
              >
                <TasksView
                  tasks={tasks}
                  setTasks={setTasks}
                  settings={settings}
                  updateSettings={updateSettings}
                />
              </motion.div>
            )}

            {activeTab === 'tabs' && (
              <motion.div
                key="tabs-tab"
                initial={{ opacity: 0, filter: 'blur(10px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(10px)' }}
                transition={{ duration: 0.5 }}
                className="w-full"
              >
                <TabsManagerView settings={settings} updateSettings={updateSettings} />
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings-tab"
                initial={{ opacity: 0, filter: 'blur(10px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(10px)' }}
                transition={{ duration: 0.5 }}
                className="w-full"
              >
                <SettingsView 
                  settings={settings} 
                  updateSettings={updateSettings} 
                  resetAllSettings={resetAllSettings}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>

      {/* Adaptive bottom mobile action tray navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center px-4 pb-safe h-20 md:hidden bg-surface-container/60 backdrop-blur-xl border-t border-outline-variant/15 rounded-t-2xl shadow-2xl select-none">
        
        {/* Toggle 1: Home */}
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center p-2.5 transition-all cursor-pointer ${
            activeTab === 'home' ? 'text-primary scale-105 font-semibold' : 'text-on-surface-variant'
          }`}
        >
          <LucideIcon name="Home" size={18} />
          <span className="text-[10px] uppercase font-sans mt-1">{t.home}</span>
        </button>

        {/* Toggle 2: Dashboard widgets */}
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center p-2.5 transition-all cursor-pointer ${
            activeTab === 'dashboard' ? 'text-primary scale-105 font-semibold' : 'text-on-surface-variant'
          }`}
        >
          <LucideIcon name="Timer" size={18} />
          <span className="text-[10px] uppercase font-sans mt-1">{t.dashboard}</span>
        </button>

        {/* Toggle 3: Daily checkists */}
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-col items-center justify-center p-2.5 transition-all cursor-pointer ${
            activeTab === 'tasks' ? 'text-primary scale-105 font-semibold' : 'text-on-surface-variant'
          }`}
        >
          <LucideIcon name="CheckSquare" size={18} />
          <span className="text-[10px] uppercase font-sans mt-1">{t.tasks}</span>
        </button>

        {/* Toggle 4: Tabs Manager */}
        <button
          onClick={() => setActiveTab('tabs')}
          className={`flex flex-col items-center justify-center p-2.5 transition-all cursor-pointer ${
            activeTab === 'tabs' ? 'text-primary scale-105 font-semibold' : 'text-on-surface-variant'
          }`}
        >
          <LucideIcon name="Layers" size={18} />
          <span className="text-[10px] uppercase font-sans mt-1">{t.tabsManager}</span>
        </button>

        {/* Toggle 5: Settings config */}
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center p-2.5 transition-all cursor-pointer ${
            activeTab === 'settings' ? 'text-primary scale-105 font-semibold' : 'text-on-surface-variant'
          }`}
        >
          <LucideIcon name="Settings" size={18} />
          <span className="text-[10px] uppercase font-sans mt-1">{t.settings}</span>
        </button>
      </nav>
    </div>
  );
}
