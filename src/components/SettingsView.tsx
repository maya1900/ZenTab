import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LucideIcon } from './LucideIcon';
import { UserSettings, BACKGROUND_PRESETS, Quote } from '../types';
import { translations } from '../translations';
import { setStoredValue, STORAGE_KEYS } from '../storage';
import { getSearchEngineOptions, isValidSearchTemplate } from '../searchEngines';

type UpdateStatus = {
  state: 'idle' | 'update_available' | 'error';
  version?: string;
  message?: string;
  checkedAt?: number;
};

const compareVersions = (versionA = '', versionB = '') => {
  const partsA = versionA.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const partsB = versionB.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < length; i += 1) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) return diff;
  }

  return 0;
};

type GeneralSection = 'search' | 'appearance' | 'navigation' | 'tabs' | 'quickLinks';

interface SettingsViewProps {
  settings: UserSettings;
  updateSettings: (key: keyof UserSettings, value: any) => void;
  resetAllSettings: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  updateSettings,
  resetAllSettings
}) => {
  const [activeTab, setActiveTab] = useState<'background' | 'general' | 'about'>('background');
  const [activeGeneralSection, setActiveGeneralSection] = useState<GeneralSection>('search');
  const [customBgInput, setCustomBgInput] = useState('');
  const [showCustomBgDrawer, setShowCustomBgDrawer] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: 'idle' });
  const [customSearchName, setCustomSearchName] = useState('');
  const [customSearchTemplate, setCustomSearchTemplate] = useState('');
  const [customSearchError, setCustomSearchError] = useState('');

  const t = translations[settings.language || 'en'];
  const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
  const canUseExtensionUpdates = typeof chrome !== 'undefined' && !!chrome.runtime?.sendMessage;
  const searchEngineOptions = getSearchEngineOptions(settings);
  const normalizedUpdateStatus = updateStatus.state === 'update_available' &&
    updateStatus.version &&
    compareVersions(updateStatus.version, appVersion) <= 0
      ? { state: 'idle' as const }
      : updateStatus;
  const generalSections: Array<{ key: GeneralSection; label: string; icon: string }> = [
    { key: 'search', label: t.generalSearch, icon: 'Search' },
    { key: 'appearance', label: t.generalAppearance, icon: 'Eye' },
    { key: 'navigation', label: t.generalNavigation, icon: 'Compass' },
    { key: 'tabs', label: t.generalTabs, icon: 'Layers' },
    { key: 'quickLinks', label: t.generalQuickLinks, icon: 'ExternalLink' }
  ];

  const requestUpdateStatus = () => {
    if (!canUseExtensionUpdates) return;

    chrome.runtime.sendMessage({ type: 'zentab_get_update_status' }, (response) => {
      const error = chrome.runtime.lastError;
      if (error || !response?.ok) return;
      setUpdateStatus(response.status || { state: 'idle' });
    });
  };

  useEffect(() => {
    if (!canUseExtensionUpdates) return;

    requestUpdateStatus();

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName === 'local' && changes.zentab_update_status?.newValue) {
        setUpdateStatus(changes.zentab_update_status.newValue as UpdateStatus);
      }
    };

    chrome.storage?.onChanged?.addListener(handleStorageChange);
    return () => chrome.storage?.onChanged?.removeListener(handleStorageChange);
  }, [canUseExtensionUpdates]);

  const handleUpdateAction = () => {
    if (!canUseExtensionUpdates || normalizedUpdateStatus.state !== 'update_available') return;

    chrome.runtime.sendMessage({ type: 'zentab_apply_update' }, (response) => {
      const error = chrome.runtime.lastError;
      if (error || !response?.ok) {
        setUpdateStatus({
          state: 'error',
          message: response?.message || error?.message || t.updateError
        });
        return;
      }
    });
  };

  const handleClearSearchHistory = () => {
    setStoredValue(STORAGE_KEYS.searchHistory, []);
  };

  const handleCustomSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customSearchName.trim();
    const urlTemplate = customSearchTemplate.trim();

    if (!name || !urlTemplate) {
      setCustomSearchError(t.customSearchRequired);
      return;
    }

    if (!isValidSearchTemplate(urlTemplate)) {
      setCustomSearchError(t.customSearchInvalid);
      return;
    }

    const newEngine = {
      id: `custom-${Date.now()}`,
      name,
      urlTemplate
    };

    updateSettings('customSearchEngines', (prevSettings: UserSettings) => ({
      ...prevSettings,
      customSearchEngines: [...(prevSettings.customSearchEngines || []), newEngine],
      searchEngine: newEngine.id
    }));
    setCustomSearchName('');
    setCustomSearchTemplate('');
    setCustomSearchError('');
  };

  const handleDeleteCustomSearchEngine = (engineId: string) => {
    updateSettings('customSearchEngines', (prevSettings: UserSettings) => {
      const nextEngines = (prevSettings.customSearchEngines || []).filter((engine) => engine.id !== engineId);
      return {
        ...prevSettings,
        customSearchEngines: nextEngines,
        searchEngine: prevSettings.searchEngine === engineId ? 'google' : prevSettings.searchEngine
      };
    });
  };

  const updateStatusText = useMemo(() => {
    switch (normalizedUpdateStatus.state) {
      case 'update_available':
        return normalizedUpdateStatus.version
          ? `${t.updateAvailable}: v${normalizedUpdateStatus.version}`
          : t.updateAvailable;
      case 'error':
        return normalizedUpdateStatus.message || t.updateError;
      default:
        return t.updateAuto;
    }
  }, [t, normalizedUpdateStatus]);

  // Handle custom backdrop url submit
  const handleCustomBgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customBgInput.trim() && /^https?:\/\//i.test(customBgInput.trim())) {
      updateSettings('bgUrl', customBgInput.trim());
      setCustomBgInput('');
      setShowCustomBgDrawer(false);
      const successMsg = settings.language === 'zh'
        ? "自定义背景壁纸已成功初始化！"
        : "Custom sanctuary background initialized of your sanctuary dashboard.";
      alert(successMsg);
    } else {
      const errorMsg = settings.language === 'zh'
        ? "请输入以 http:// 或 https:// 开头的有效图片链接地址"
        : "Please provide a valid secure image URL starting with http:// or https://";
      alert(errorMsg);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-5xl mx-auto px-4 pb-24 items-start select-none">
      
      {/* Sidebar Navigation Options Block */}
      <aside className="md:col-span-4 lg:col-span-3 glass-panel p-5 rounded-2xl flex flex-col gap-1 shadow-md border-outline-variant/10">
        <div className="mb-4 pb-3 border-b border-outline-variant/10">
          <h1 className="font-sans text-xl font-bold text-emphasis leading-tight">{t.settings}</h1>
          <p className="text-[11px] font-sans text-on-surface-variant/60 mt-0.5 uppercase tracking-wider font-semibold">
            {t.sanctuaryConfig}
          </p>
        </div>

        <nav className="flex flex-col gap-1.5 w-full">
          {/* Tab 1: Backdrops */}
          <button
            onClick={() => setActiveTab('background')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-sans text-xs font-semibold uppercase tracking-wider text-left border cursor-pointer ${
              activeTab === 'background'
                ? 'bg-primary/20 text-primary border-primary/25'
                : 'text-on-surface-variant hover:bg-white/5 border-transparent'
            }`}
          >
            <LucideIcon name="Image" size={15} />
            <span>{t.background}</span>
          </button>

          {/* Tab 2: General preferences */}
          <button
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-sans text-xs font-semibold uppercase tracking-wider text-left border cursor-pointer ${
              activeTab === 'general'
                ? 'bg-primary/20 text-primary border-primary/25'
                : 'text-on-surface-variant hover:bg-white/5 border-transparent'
            }`}
          >
            <LucideIcon name="Settings" size={15} />
            <span>{t.generalConfig}</span>
          </button>

          {/* Tab 3: About */}
          <button
            onClick={() => setActiveTab('about')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-sans text-xs font-semibold uppercase tracking-wider text-left border cursor-pointer ${
              activeTab === 'about'
                ? 'bg-primary/20 text-primary border-primary/25'
                : 'text-on-surface-variant hover:bg-white/5 border-transparent'
            }`}
          >
            <LucideIcon name="Info" size={15} />
            <span>{t.aboutInfo}</span>
          </button>
        </nav>

        {/* Global reset trigger */}
        <div className="border-t border-outline-variant/10 mt-6 pt-4">
          {isConfirmingReset ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
              <p className="text-red-400 text-xs font-sans mb-3 flex-1 break-words leading-relaxed whitespace-pre-wrap">
                {settings.language === 'zh'
                  ? "确认重置？所有自定义设置和数据将被清除。"
                  : "Are you sure? This deletes all custom links and settings."}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsConfirmingReset(false)}
                  className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-on-surface-variant text-[10px] font-sans font-bold uppercase rounded-lg transition-all cursor-pointer"
                >
                  {settings.language === 'zh' ? "取消" : "Cancel"}
                </button>
                <button
                  onClick={() => {
                    setIsConfirmingReset(false);
                    // Also clear weather cache to ensure a fresh experience
                    localStorage.removeItem('zentab_weather_city');
                    localStorage.removeItem('zentab_weather_data');
                    resetAllSettings();
                  }}
                  className="flex-1 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[10px] font-sans font-bold uppercase rounded-lg transition-all cursor-pointer"
                >
                  {t.resetAllData}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsConfirmingReset(true)}
              className="w-full py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[10px] font-sans font-bold uppercase tracking-wider text-center border border-red-500/20 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <LucideIcon name="RotateCcw" size={11} />
              {t.resetAllData}
            </button>
          )}
        </div>
      </aside>

      {/* Main Settings Panel Configurations Dashboard */}
      <main className="md:col-span-8 lg:col-span-9 glass-panel p-6 sm:p-8 rounded-2xl min-h-[400px] shadow-md border-outline-variant/10">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: Background configurations */}
          {activeTab === 'background' && (
            <motion.div
              key="background-config"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div>
                <h2 className="font-sans text-lg font-bold text-emphasis">{t.backdropCustomization}</h2>
                <p className="text-xs text-on-surface-variant/70 font-sans mt-0.5">
                  {t.backdropSub}
                </p>
              </div>

              {/* Grid presets cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                {BACKGROUND_PRESETS.map((preset) => {
                  const isCurrent = settings.bgUrl.startsWith(preset.url);
                  return (
                    <div
                      key={preset.id}
                      onClick={() => {
                        if (preset.url.startsWith('random:')) {
                          updateSettings('bgUrl', `${preset.url}:${Date.now()}`);
                        } else {
                          updateSettings('bgUrl', preset.url);
                        }
                      }}
                      className={`group relative rounded-xl overflow-hidden aspect-square cursor-pointer bg-surface-container-high border transition-all p-1 flex flex-col justify-between ${
                        isCurrent 
                        ? 'border-primary ring-1 ring-primary/40 shadow-[0_0_15px_rgba(192,193,255,0.15)] bg-primary/5' 
                        : 'border-outline-variant/20 hover:border-primary/50'
                      }`}
                      title={preset.name}
                    >
                      {preset.url.startsWith('random:') ? (
                        <div className="w-full h-full rounded-lg bg-surface-container flex flex-col items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors group-hover:scale-105 duration-500">
                          <LucideIcon name="Shuffle" size={32} />
                        </div>
                      ) : (
                        <img
                          alt={preset.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-500 saturate-[0.8]"
                          src={preset.url}
                        />
                      )}
                      
                      {/* Interactive check active tag overlay */}
                      {isCurrent && (
                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none rounded-xl">
                          <LucideIcon name="Check" className="text-emphasis bg-primary p-1.5 rounded-full shadow-lg" size={30} />
                        </div>
                      )}

                      <div className="absolute bottom-1 inset-x-1 p-1.5 bg-black/75 backdrop-blur-md rounded-md">
                        <p className="text-[10px] text-emphasis truncate font-medium text-center">
                          {settings.language === 'zh'
                            ? (preset.id === 'mountain' ? '暮色山脉' : preset.id === 'starry' ? '星空地平线' : preset.id === 'sunset' ? '落日群山' : preset.id === 'abstract' ? '璀璨星云' : preset.id === 'random-landscape' ? '随机风景' : preset.id === 'random-anime' ? '随机二次元' : preset.id === 'random-tech' ? '随机科技' : preset.name)
                            : preset.name
                          }
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Custom backdrop trigger box */}
                <div
                  onClick={() => setShowCustomBgDrawer(!showCustomBgDrawer)}
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer aspect-square hover:border-primary/50 transition-all ${
                    showCustomBgDrawer 
                    ? 'border-primary bg-primary/5' 
                    : 'border-outline-variant/40 hover:bg-white/5 bg-surface-container-lowest/20'
                  }`}
                >
                  <LucideIcon name={showCustomBgDrawer ? 'X' : 'Image'} size={24} className="text-on-surface-variant/70 mb-2" />
                  <span className="font-sans text-xs text-on-surface-variant font-medium">{t.customUrl}</span>
                </div>
              </div>

              {/* Advanced paste Custom Image drawer */}
              {showCustomBgDrawer && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface-container/20 border border-outline-variant/10 p-5 rounded-xl border-dashed"
                >
                  <form onSubmit={handleCustomBgSubmit} className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-on-surface-variant/60 uppercase font-sans tracking-widest block font-bold">
                        {t.pristineUrl}
                      </label>
                      <input
                        type="url"
                        required
                        value={customBgInput}
                        onChange={(e) => setCustomBgInput(e.target.value)}
                        placeholder="https://images.unsplash.com/photo-1507525428034-b723cf961d3e"
                        className="w-full text-sm bg-surface-container border border-outline-variant/20 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-primary/45 text-emphasis"
                      />
                    </div>
                    
                    <div className="flex gap-2 justify-end select-none">
                      <button
                        type="button"
                        onClick={() => setShowCustomBgDrawer(false)}
                        className="px-4 py-1.5 rounded-lg border border-outline-variant/20 text-xs text-on-surface-variant hover:text-emphasis"
                      >
                        {t.cancel}
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        {t.saveBackdrop}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* TAB 2: General settings */}
          {activeTab === 'general' && (
            <motion.div
              key="general-config"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-8"
            >
              <div>
                <h2 className="font-sans text-lg font-bold text-emphasis">{t.generalPreferences}</h2>
                <p className="text-xs text-on-surface-variant/70 font-sans mt-0.5">
                  {t.generalPrefSub}
                </p>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {generalSections.map((section) => {
                  const isSelected = activeGeneralSection === section.key;
                  return (
                    <button
                      key={section.key}
                      type="button"
                      onClick={() => setActiveGeneralSection(section.key)}
                      className={`shrink-0 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold font-sans transition-all ${
                        isSelected
                          ? 'border-primary text-primary bg-primary/10'
                          : 'border-outline-variant/15 text-on-surface-variant hover:text-emphasis hover:border-primary/40 bg-surface-container/10'
                      }`}
                    >
                      <LucideIcon name={section.icon} size={14} />
                      {section.label}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                {activeGeneralSection === 'navigation' && (
                  <motion.div
                    key="general-navigation"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.16 }}
                    className="space-y-6"
                  >

              {/* Bento structure presets toggle */}
              <div className="space-y-3">
                <label className="text-[10px] text-primary/80 uppercase font-sans tracking-widest block font-bold">
                  {t.dashboardLayout}
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Minimalist selection */}
                  <div
                    onClick={() => updateSettings('layout', 'minimalist')}
                    className={`p-4 rounded-xl border flex flex-col justify-between gap-3 cursor-pointer select-none transition-all ${
                      settings.layout === 'minimalist'
                        ? 'border-primary bg-primary/5'
                        : 'border-outline-variant/15 hover:border-primary/40 bg-surface-container/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-sans text-sm font-semibold text-emphasis">{t.minimalistCenter}</h3>
                      {settings.layout === 'minimalist' && (
                        <LucideIcon name="Check" className="text-primary bg-primary/15 rounded-full p-0.5" size={16} />
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant/60 leading-relaxed font-sans">
                      {t.minimalistDesc}
                    </p>
                  </div>

                  {/* Grid system option */}
                  <div
                    onClick={() => updateSettings('layout', 'grid')}
                    className={`p-4 rounded-xl border flex flex-col justify-between gap-3 cursor-pointer select-none transition-all ${
                      settings.layout === 'grid'
                        ? 'border-primary bg-primary/5'
                        : 'border-outline-variant/15 hover:border-primary/40 bg-surface-container/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-sans text-sm font-semibold text-emphasis">{t.productivityGrid}</h3>
                      {settings.layout === 'grid' && (
                        <LucideIcon name="Check" className="text-primary bg-primary/15 rounded-full p-0.5" size={16} />
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant/60 leading-relaxed font-sans">
                      {t.productivityDesc}
                    </p>
                  </div>
                </div>
              </div>

              {/* Divider lines */}
              <div className="h-px bg-outline-variant/10" />

              {/* Default Tab on Open */}
              <div className="space-y-3">
                <label className="text-[10px] text-primary/80 uppercase font-sans tracking-widest block font-bold">
                  {t.defaultTabLabel}
                </label>
                <p className="text-xs text-on-surface-variant/60 font-sans -mt-1">
                  {t.defaultTabDesc}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'home', label: t.home, icon: 'Home' },
                    { key: 'dashboard', label: t.dashboard, icon: 'Timer' },
                    { key: 'tasks', label: t.tasks, icon: 'CheckSquare' },
                    { key: 'tabs', label: t.tabsManager, icon: 'Layers' }
                  ].map((opt) => {
                    const isSelected = settings.defaultTab === opt.key;
                    return (
                      <div
                        key={opt.key}
                        onClick={() => updateSettings('defaultTab', opt.key as any)}
                        className={`p-3 rounded-lg border text-center select-none text-xs font-semibold cursor-pointer font-sans transition-all flex flex-col items-center justify-center gap-1.5 min-h-[60px] ${
                          isSelected
                            ? 'border-primary text-primary bg-primary/5'
                            : 'border-outline-variant/15 text-on-surface-variant hover:border-primary/50'
                        }`}
                      >
                        <LucideIcon name={opt.icon} size={18} />
                        {opt.label}
                      </div>
                    );
                  })}
                </div>
              </div>

                  </motion.div>
                )}

                {activeGeneralSection === 'search' && (
                  <motion.div
                    key="general-search"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.16 }}
                    className="space-y-6"
                  >

              {/* Search Engines choices */}
              <div className="space-y-3">
                <label className="text-[10px] text-primary/80 uppercase font-sans tracking-widest block font-bold">
                  {t.preferredSearch}
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {searchEngineOptions.map((engine) => {
                    const isSelected = settings.searchEngine === engine.id;
                    return (
                      <div
                        key={engine.id}
                        onClick={() => updateSettings('searchEngine', engine.id)}
                        className={`p-3 rounded-lg border text-center select-none text-xs font-semibold cursor-pointer font-sans transition-all ${
                          isSelected
                            ? 'border-primary text-primary bg-primary/5'
                            : 'border-outline-variant/15 text-on-surface-variant hover:border-primary/50'
                        }`}
                      >
                        <span className="block truncate uppercase tracking-wider">{engine.label}</span>
                        {engine.custom && (
                          <span className="mt-1 block text-[9px] uppercase tracking-widest text-on-surface-variant/50">
                            {t.customSearchTag}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-outline-variant/15 bg-surface-container/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[10px] text-primary/80 uppercase font-sans tracking-widest block font-bold">
                    {t.customSearchTitle}
                  </label>
                  <span className="text-[10px] text-on-surface-variant/50 font-sans">{'{query}'}</span>
                </div>
                <form onSubmit={handleCustomSearchSubmit} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] gap-2">
                  <input
                    type="text"
                    value={customSearchName}
                    onChange={(e) => {
                      setCustomSearchName(e.target.value);
                      setCustomSearchError('');
                    }}
                    placeholder={t.customSearchNamePlaceholder}
                    className="min-w-0 rounded-lg border border-outline-variant/20 bg-surface-container/40 px-3 py-2 text-sm text-emphasis placeholder:text-on-surface-variant/45 focus:outline-none focus:ring-1 focus:ring-primary/45"
                    maxLength={28}
                  />
                  <input
                    type="url"
                    value={customSearchTemplate}
                    onChange={(e) => {
                      setCustomSearchTemplate(e.target.value);
                      setCustomSearchError('');
                    }}
                    placeholder={t.customSearchUrlPlaceholder}
                    className="min-w-0 rounded-lg border border-outline-variant/20 bg-surface-container/40 px-3 py-2 text-sm text-emphasis placeholder:text-on-surface-variant/45 focus:outline-none focus:ring-1 focus:ring-primary/45"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary transition-opacity hover:opacity-90"
                  >
                    <LucideIcon name="Plus" size={14} />
                    {t.addCustomSearch}
                  </button>
                </form>
                {customSearchError && (
                  <p className="text-xs text-red-400 font-sans">{customSearchError}</p>
                )}
                {(settings.customSearchEngines || []).length > 0 && (
                  <div className="space-y-2 pt-1">
                    {(settings.customSearchEngines || []).map((engine) => (
                      <div
                        key={engine.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant/10 bg-surface-container/20 px-3 py-2"
                      >
                        <div className="min-w-0 text-left">
                          <p className="truncate text-sm font-semibold text-emphasis font-sans">{engine.name}</p>
                          <p className="truncate text-xs text-on-surface-variant/55 font-mono">{engine.urlTemplate}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomSearchEngine(engine.id)}
                          className="shrink-0 rounded-lg p-2 text-on-surface-variant/55 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                          title={t.deleteCustomSearch}
                        >
                          <LucideIcon name="Trash2" size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider lines */}
              <div className="h-px bg-outline-variant/10" />

              {/* Search Open Target Option */}
              <div className="space-y-3">
                <label className="text-[10px] text-primary/80 uppercase font-sans tracking-widest block font-bold">
                  {t.searchOpenInNewTabLabel}
                </label>
                <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-outline-variant/15 bg-surface-container/20">
                  <span className="text-sm text-on-surface font-medium leading-relaxed">{t.searchOpenInNewTabDesc}</span>
                  <button
                    onClick={() => updateSettings('searchOpenInNewTab', !settings.searchOpenInNewTab)}
                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                      settings.searchOpenInNewTab ? 'bg-primary' : 'bg-outline-variant/30'
                    }`}
                  >
                    <motion.div
                      animate={{ x: settings.searchOpenInNewTab ? 24 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md"
                    />
                  </button>
                </div>
              </div>

              {/* Divider lines */}
              <div className="h-px bg-outline-variant/10" />

              {/* Search History Option */}
              <div className="space-y-3">
                <label className="text-[10px] text-primary/80 uppercase font-sans tracking-widest block font-bold">
                  {t.searchHistoryLabel}
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-outline-variant/15 bg-surface-container/20">
                  <div className="flex items-center justify-between gap-4 flex-1">
                    <span className="text-sm text-on-surface font-medium leading-relaxed">{t.searchHistoryDesc}</span>
                    <button
                      onClick={() => updateSettings('searchHistoryEnabled', !settings.searchHistoryEnabled)}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                        settings.searchHistoryEnabled ? 'bg-primary' : 'bg-outline-variant/30'
                      }`}
                    >
                      <motion.div
                        animate={{ x: settings.searchHistoryEnabled ? 24 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md"
                      />
                    </button>
                  </div>
                  <button
                    onClick={handleClearSearchHistory}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant/15 px-3 py-2 text-xs font-semibold text-on-surface-variant hover:text-emphasis hover:border-primary/40 transition-colors"
                  >
                    <LucideIcon name="Trash2" size={14} />
                    {t.clearSearchHistory}
                  </button>
                </div>
              </div>

                  </motion.div>
                )}

                {activeGeneralSection === 'appearance' && (
                  <motion.div
                    key="general-appearance"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.16 }}
                    className="space-y-6"
                  >

              {/* Theme Mode & Language Option Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Theme mode selections */}
                <div className="space-y-3">
                  <label className="text-[10px] text-primary/80 uppercase font-sans tracking-widest block font-bold">
                    {t.themeLabel}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'dark', label: t.darkTheme },
                      { key: 'light', label: t.lightTheme },
                      { key: 'system', label: t.systemTheme }
                    ].map((mode) => {
                      const isSelected = settings.theme === mode.key;
                      return (
                        <div
                          key={mode.key}
                          onClick={() => updateSettings('theme', mode.key as any)}
                          className={`p-2 rounded-lg border text-center select-none text-[10px] font-semibold cursor-pointer font-sans transition-all flex flex-col items-center justify-center gap-1 min-h-[44px] ${
                            isSelected
                              ? 'border-primary text-primary bg-primary/5'
                              : 'border-outline-variant/15 text-on-surface-variant hover:border-primary/50'
                          }`}
                        >
                          {mode.label}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Language Option togglers */}
                <div className="space-y-3">
                  <label className="text-[10px] text-primary/80 uppercase font-sans tracking-widest block font-bold">
                    {t.languageOption}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'zh', label: '简体中文' },
                      { key: 'en', label: 'English' }
                    ].map((lang) => {
                      const isSelected = settings.language === lang.key;
                      return (
                        <div
                          key={lang.key}
                          onClick={() => updateSettings('language', lang.key as any)}
                          className={`p-2 rounded-lg border text-center select-none text-xs font-semibold cursor-pointer font-sans transition-all flex items-center justify-center min-h-[44px] ${
                            isSelected
                              ? 'border-primary text-primary bg-primary/5'
                              : 'border-outline-variant/15 text-on-surface-variant hover:border-primary/50'
                          }`}
                        >
                          {lang.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Divider lines */}
              <div className="h-px bg-outline-variant/10" />

              {/* Font Scale slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center select-none">
                  <label className="text-[10px] text-primary/80 uppercase font-sans tracking-widest block font-bold">
                    {t.appearanceFont}
                  </label>
                  <span className="text-xs bg-surface-container-highest/60 border border-outline-variant/10 px-2 py-0.5 rounded text-emphasis font-mono">
                    {settings.fontScale}%
                  </span>
                </div>

                <div className="flex flex-col gap-2 pt-1 font-sans">
                  <input
                    type="range"
                    min="80"
                    max="120"
                    step="5"
                    value={settings.fontScale}
                    onChange={(e) => updateSettings('fontScale', parseInt(e.target.value))}
                    className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between font-sans text-[10px] text-on-surface-variant/40 uppercase tracking-widest">
                    <span>{t.focused}</span>
                    <span>{t.standard}</span>
                    <span>{t.immersive}</span>
                  </div>
                </div>
              </div>

                  </motion.div>
                )}

                {activeGeneralSection === 'tabs' && (
                  <motion.div
                    key="general-tabs"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.16 }}
                    className="space-y-6"
                  >

              {/* Tabs Auto Expand Option */}
              <div className="space-y-3">
                <label className="text-[10px] text-primary/80 uppercase font-sans tracking-widest block font-bold">
                  {t.tabsAutoExpandLabel}
                </label>
                <div className="flex items-center justify-between p-3 rounded-lg border border-outline-variant/15 bg-surface-container/20">
                  <span className="text-sm text-on-surface font-medium">{t.tabsAutoExpandDesc}</span>
                  <button
                    onClick={() => updateSettings('tabsAutoExpand', !settings.tabsAutoExpand)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.tabsAutoExpand ? 'bg-primary' : 'bg-outline-variant/30'
                    }`}
                  >
                    <motion.div
                      animate={{ x: settings.tabsAutoExpand ? 24 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md"
                    />
                  </button>
                </div>
              </div>

                  </motion.div>
                )}

                {activeGeneralSection === 'quickLinks' && (
                  <motion.div
                    key="general-quick-links"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.16 }}
                    className="space-y-6"
                  >

              {/* Quick Links Open Target Option */}
              <div className="space-y-3">
                <label className="text-[10px] text-primary/80 uppercase font-sans tracking-widest block font-bold">
                  {t.quickLinksOpenInNewTabLabel}
                </label>
                <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-outline-variant/15 bg-surface-container/20">
                  <span className="text-sm text-on-surface font-medium leading-relaxed">{t.quickLinksOpenInNewTabDesc}</span>
                  <button
                    onClick={() => updateSettings('quickLinksOpenInNewTab', !settings.quickLinksOpenInNewTab)}
                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                      settings.quickLinksOpenInNewTab ? 'bg-primary' : 'bg-outline-variant/30'
                    }`}
                  >
                    <motion.div
                      animate={{ x: settings.quickLinksOpenInNewTab ? 24 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md"
                    />
                  </button>
                </div>
              </div>

                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* TAB 3: About */}
          {activeTab === 'about' && (
            <motion.div
              key="about-info"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="font-sans text-xs tracking-[0.25em] text-primary/70 font-bold uppercase block mb-3 leading-none select-none">
                  {t.projectIntroTitle}
                </h3>
                <div className="bg-white/5 rounded-xl border border-white/5 p-4 select-text text-sm font-sans text-on-surface-variant leading-relaxed">
                  {t.projectIntro}
                </div>
              </div>

              <div className="border-t border-outline-variant/10 pt-5">
                <div className="bg-white/5 rounded-xl border border-white/5 p-4 space-y-3 select-text text-xs font-sans">
                  <div className="flex justify-between border-b border-white/5 pb-2 text-on-surface-variant">
                    <span className="opacity-60">{t.authorTitle}</span>
                    <span className="text-emphasis font-medium">{t.authorName}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2 text-on-surface-variant">
                    <span className="opacity-60">{t.githubAddressTitle}</span>
                    <a href={t.githubAddress} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                      {t.githubAddress}
                    </a>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span className="opacity-60">{t.versionTitle}</span>
                    <span className="text-emphasis font-semibold pr-1">{appVersion}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-outline-variant/10 pt-5">
                <div className="bg-white/5 rounded-xl border border-white/5 p-4 space-y-3 text-xs font-sans">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-on-surface-variant/60">{t.updateCheckTitle}</p>
                      {updateStatusText && (
                        <p className={`mt-1 font-medium ${
                          normalizedUpdateStatus.state === 'update_available'
                            ? 'text-primary'
                            : normalizedUpdateStatus.state === 'error'
                              ? 'text-red-400'
                              : 'text-emphasis'
                        }`}>
                          {updateStatusText}
                        </p>
                      )}
                    </div>
                    {normalizedUpdateStatus.state === 'update_available' && (
                      <button
                        onClick={handleUpdateAction}
                        disabled={!canUseExtensionUpdates}
                        className="shrink-0 px-4 py-2 rounded-lg font-sans text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 bg-primary text-on-primary hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <LucideIcon name="Download" size={13} />
                        {t.updateNow}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
};
