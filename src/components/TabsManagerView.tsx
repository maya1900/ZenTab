import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LucideIcon } from './LucideIcon';
import { BrowserTab, TabGroup, ReadLaterItem, HOMEPAGE_PATTERNS, UserSettings } from '../types';
import { translations } from '../translations';

interface TabsManagerViewProps {
  settings: UserSettings;
  updateSettings: (key: keyof UserSettings, value: any) => void;
}

export function TabsManagerView({ settings, updateSettings }: TabsManagerViewProps) {
  const t = translations[settings.language || 'en'];

  const [tabs, setTabs] = useState<BrowserTab[]>([]);
  const [autoGroups, setAutoGroups] = useState<TabGroup[]>([]);
  const [manualGroups, setManualGroups] = useState<TabGroup[]>([]);
  const [readLaterItems, setReadLaterItems] = useState<ReadLaterItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'auto' | 'manual' | 'readlater'>('auto');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    // Initialize with all groups expanded if tabsAutoExpand is true
    return new Set();
  });
  const [selectedTab, setSelectedTab] = useState<BrowserTab | null>(null);
  const [showReadLaterDrawer, setShowReadLaterDrawer] = useState(false);
  const [chromeApiAvailable, setChromeApiAvailable] = useState(false);
  // Tab id whose "move to workspace" popover is open, plus its anchor rect
  const [moveMenuTabId, setMoveMenuTabId] = useState<number | null>(null);
  const [moveMenuAnchor, setMoveMenuAnchor] = useState<{ top: number; right: number } | null>(null);
  const [inlineGroupName, setInlineGroupName] = useState('');
  // Group id whose "add tabs" picker is open, plus the set of selected tab ids
  const [addTabsGroupId, setAddTabsGroupId] = useState<string | null>(null);
  const [selectedTabIds, setSelectedTabIds] = useState<Set<number>>(new Set());

  // Check if Chrome API is available
  useEffect(() => {
    const isAvailable = typeof chrome !== 'undefined' && chrome.tabs !== undefined;
    setChromeApiAvailable(isAvailable);

    if (!isAvailable) {
      console.warn('Chrome Tabs API is not available. Make sure to load this as a Chrome extension.');
    }
  }, []);

  // Load manual groups and read later items from localStorage
  useEffect(() => {
    const savedManualGroups = localStorage.getItem('zentab_manual_groups');
    if (savedManualGroups) {
      try {
        setManualGroups(JSON.parse(savedManualGroups));
      } catch (e) {
        console.error('Failed to load manual groups', e);
      }
    }

    const savedReadLater = localStorage.getItem('zentab_read_later');
    if (savedReadLater) {
      try {
        setReadLaterItems(JSON.parse(savedReadLater));
      } catch (e) {
        console.error('Failed to load read later items', e);
      }
    }
  }, []);

  // Save manual groups to localStorage
  useEffect(() => {
    localStorage.setItem('zentab_manual_groups', JSON.stringify(manualGroups));
  }, [manualGroups]);

  // Save read later items to localStorage
  useEffect(() => {
    localStorage.setItem('zentab_read_later', JSON.stringify(readLaterItems));
  }, [readLaterItems]);

  // Fetch browser tabs
  useEffect(() => {
    const fetchTabs = async () => {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        try {
          const allTabs = await chrome.tabs.query({});
          console.log('Fetched tabs:', allTabs); // Debug log
          const browserTabs: BrowserTab[] = allTabs.map(tab => ({
            id: tab.id!,
            title: tab.title || tab.url || 'Untitled',
            url: tab.url || 'about:blank',
            favIconUrl: tab.favIconUrl,
            windowId: tab.windowId,
            active: tab.active,
            pinned: tab.pinned
          }));
          console.log('Processed tabs:', browserTabs); // Debug log
          setTabs(browserTabs);
        } catch (error) {
          console.error('Failed to fetch tabs:', error);
        }
      } else {
        console.warn('Chrome tabs API not available');
      }
    };

    fetchTabs();

    // Refresh tabs every 2 seconds
    const interval = setInterval(fetchTabs, 2000);
    return () => clearInterval(interval);
  }, []);

  // Close the move-to-workspace popover on any outside click
  useEffect(() => {
    if (moveMenuTabId === null) return;
    const close = () => setMoveMenuTabId(null);
    window.addEventListener('click', close);
    // The popover is fixed-positioned, so close it on scroll instead of letting it detach
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [moveMenuTabId]);

  // Extract domain from URL
  const getDomain = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  };

  // Check if URL is a homepage
  const isHomepage = (url: string): boolean => {
    return HOMEPAGE_PATTERNS.some(pattern => pattern.test(url));
  };

  // Auto-group tabs by domain
  useEffect(() => {
    const grouped = new Map<string, BrowserTab[]>();
    const homepageTabs: BrowserTab[] = [];

    tabs.forEach(tab => {
      if (isHomepage(tab.url)) {
        homepageTabs.push(tab);
      } else {
        const domain = getDomain(tab.url);
        if (!grouped.has(domain)) {
          grouped.set(domain, []);
        }
        grouped.get(domain)!.push(tab);
      }
    });

    const groups: TabGroup[] = Array.from(grouped.entries()).map(([domain, tabs]) => {
      const groupId = `auto-${domain}`;
      return {
        id: groupId,
        name: domain,
        domain,
        tabs,
        isManual: false,
        collapsed: settings.tabsAutoExpand ? false : !expandedGroups.has(groupId)
      };
    });

    // Add homepage group if there are homepage tabs
    if (homepageTabs.length > 0) {
      const homepageGroupId = 'auto-homepages';
      groups.unshift({
        id: homepageGroupId,
        name: t.homepages,
        tabs: homepageTabs,
        isManual: false,
        collapsed: settings.tabsAutoExpand ? false : !expandedGroups.has(homepageGroupId)
      });
    }

    setAutoGroups(groups);
  }, [tabs, expandedGroups, t.homepages, settings.tabsAutoExpand]);

  // Filter tabs based on search query
  const filteredAutoGroups = useMemo(() => {
    if (!searchQuery) return autoGroups;

    return autoGroups
      .map(group => ({
        ...group,
        tabs: group.tabs.filter(tab =>
          tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tab.url.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }))
      .filter(group => group.tabs.length > 0);
  }, [autoGroups, searchQuery]);

  const filteredManualGroups = useMemo(() => {
    if (!searchQuery) return manualGroups;

    return manualGroups
      .map(group => ({
        ...group,
        tabs: group.tabs.filter(tab =>
          tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tab.url.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }))
      .filter(group => group.tabs.length > 0);
  }, [manualGroups, searchQuery]);

  const filteredReadLater = useMemo(() => {
    if (!searchQuery) return readLaterItems;

    return readLaterItems.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.url.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [readLaterItems, searchQuery]);

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // Create manual group
  const createManualGroup = () => {
    if (!newGroupName.trim()) return;

    const newGroup: TabGroup = {
      id: `manual-${Date.now()}`,
      name: newGroupName,
      tabs: [],
      isManual: true,
      collapsed: false
    };

    setManualGroups([...manualGroups, newGroup]);
    setNewGroupName('');
    setShowCreateGroup(false);
    setExpandedGroups(prev => new Set([...prev, newGroup.id]));
  };

  // Delete manual group
  const deleteManualGroup = (groupId: string) => {
    setManualGroups(manualGroups.filter(g => g.id !== groupId));
  };

  // Open tab
  const openTab = async (tabId: number) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      try {
        await chrome.tabs.update(tabId, { active: true });
        const tab = await chrome.tabs.get(tabId);
        if (tab.windowId) {
          await chrome.windows.update(tab.windowId, { focused: true });
        }
      } catch (error) {
        console.error('Failed to open tab:', error);
      }
    }
  };

  // Close tab
  const closeTab = async (tabId: number) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      try {
        await chrome.tabs.remove(tabId);
        setTabs(tabs.filter(t => t.id !== tabId));
      } catch (error) {
        console.error('Failed to close tab:', error);
      }
    }
  };

  // Add to read later
  const addToReadLater = (tab: BrowserTab) => {
    const item: ReadLaterItem = {
      id: `rl-${Date.now()}`,
      title: tab.title,
      url: tab.url,
      favIconUrl: tab.favIconUrl,
      addedAt: Date.now()
    };

    setReadLaterItems([item, ...readLaterItems]);
    setShowReadLaterDrawer(true);
  };

  // Remove from read later
  const removeFromReadLater = (itemId: string) => {
    setReadLaterItems(readLaterItems.filter(item => item.id !== itemId));
  };

  // Restore from read later
  const restoreFromReadLater = async (item: ReadLaterItem) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      try {
        await chrome.tabs.create({ url: item.url });
        removeFromReadLater(item.id);
      } catch (error) {
        console.error('Failed to restore tab:', error);
      }
    }
  };

  // Open a stored (snapshot) tab from a manual workspace by URL.
  // If the URL is already open, focus that existing tab instead of creating duplicates.
  const openStoredTab = async (url: string) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      try {
        const openTabs = await chrome.tabs.query({ url });
        const existingTab = openTabs.find(tab => tab.id !== undefined);
        if (existingTab?.id !== undefined) {
          await openTab(existingTab.id);
          return;
        }

        await chrome.tabs.create({ url });
      } catch (error) {
        console.error('Failed to open stored tab:', error);
      }
    }
  };

  // Save tab snapshots into a manual workspace (dedup by URL)
  const addTabsToWorkspace = (groupId: string, tabsToAdd: BrowserTab[]) => {
    setManualGroups(prev =>
      prev.map(group => {
        if (group.id !== groupId) return group;
        const existingUrls = new Set(group.tabs.map(t => t.url));
        const snapshots: BrowserTab[] = tabsToAdd
          .filter(t => !existingUrls.has(t.url))
          .map(t => ({
            // Snapshot: live ids become stale, so assign a stable unique id
            id: Date.now() + Math.floor(Math.random() * 100000),
            title: t.title,
            url: t.url,
            favIconUrl: t.favIconUrl,
            windowId: -1,
            active: false,
            pinned: false
          }));
        return { ...group, tabs: [...group.tabs, ...snapshots] };
      })
    );
  };

  // Remove a stored tab from a manual workspace
  const removeTabFromWorkspace = (groupId: string, tabId: number) => {
    setManualGroups(prev =>
      prev.map(group =>
        group.id === groupId
          ? { ...group, tabs: group.tabs.filter(t => t.id !== tabId) }
          : group
      )
    );
  };

  // Create a workspace and immediately add a tab to it
  const createWorkspaceWithTab = (name: string, tab: BrowserTab) => {
    if (!name.trim()) return;
    const newGroup: TabGroup = {
      id: `manual-${Date.now()}`,
      name: name.trim(),
      tabs: [
        {
          id: Date.now() + Math.floor(Math.random() * 100000),
          title: tab.title,
          url: tab.url,
          favIconUrl: tab.favIconUrl,
          windowId: -1,
          active: false,
          pinned: false
        }
      ],
      isManual: true,
      collapsed: false
    };
    setManualGroups(prev => [...prev, newGroup]);
    setExpandedGroups(prev => new Set([...prev, newGroup.id]));
  };

  // Open all tabs in group (live tabs by id, stored snapshots by url)
  const openAllInGroup = async (group: TabGroup) => {
    for (const tab of group.tabs) {
      if (group.isManual) {
        await openStoredTab(tab.url);
      } else {
        await openTab(tab.id);
      }
    }
  };

  // Close all tabs in group
  const closeAllInGroup = async (group: TabGroup) => {
    for (const tab of group.tabs) {
      await closeTab(tab.id);
    }
  };

  // Popover listing manual workspaces to move a tab into, with inline create row.
  // Portaled to body with fixed positioning so it escapes the scroll/overflow containers.
  const renderMoveMenu = (tab: BrowserTab) => {
    if (!moveMenuAnchor) return null;
    return createPortal(
    <div
      className="fixed z-[200] w-60 bg-surface-container-high/95 backdrop-blur-md rounded-xl border border-outline-variant/20 shadow-2xl p-2"
      style={{ top: moveMenuAnchor.top, right: moveMenuAnchor.right }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-xs font-semibold text-on-surface-variant px-2 py-1.5">{t.moveToGroup}</p>
      {manualGroups.length > 0 && (
        <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-0.5 mb-1">
          {manualGroups.map(g => {
            const already = g.tabs.some(st => st.url === tab.url);
            return (
              <button
                key={g.id}
                disabled={already}
                onClick={() => {
                  addTabsToWorkspace(g.id, [tab]);
                  setMoveMenuTabId(null);
                }}
                className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-sm text-on-surface hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-on-surface"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <LucideIcon name="Folder" size={14} className="flex-shrink-0" />
                  <span className="truncate">{g.name}</span>
                </span>
                {already && <LucideIcon name="Check" size={14} className="flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex items-center gap-1 border-t border-outline-variant/10 pt-1.5">
        <input
          type="text"
          value={inlineGroupName}
          onChange={(e) => setInlineGroupName(e.target.value)}
          placeholder={t.createGroup}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && inlineGroupName.trim()) {
              createWorkspaceWithTab(inlineGroupName, tab);
              setInlineGroupName('');
              setMoveMenuTabId(null);
            }
            if (e.key === 'Escape') setMoveMenuTabId(null);
          }}
          className="flex-1 min-w-0 bg-surface-container/60 border border-outline-variant/20 rounded-lg px-2 py-1.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary/50"
        />
        <button
          onClick={() => {
            createWorkspaceWithTab(inlineGroupName, tab);
            setInlineGroupName('');
            setMoveMenuTabId(null);
          }}
          disabled={!inlineGroupName.trim()}
          className="p-2 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors disabled:opacity-40"
        >
          <LucideIcon name="Plus" size={16} />
        </button>
      </div>
    </div>,
    document.body
    );
  };

  const renderTabCard = (tab: BrowserTab, group?: TabGroup) => {
    const isStored = !!group?.isManual;
    return (
    <motion.div
      key={tab.id}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group relative bg-surface-container/40 backdrop-blur-sm rounded-lg p-3 hover:bg-surface-container/60 transition-all cursor-pointer border border-outline-variant/10"
      onClick={() => {
        if (moveMenuTabId === tab.id) return; // ignore card click while its menu is open
        isStored ? openStoredTab(tab.url) : openTab(tab.id);
      }}
    >
      <div className="flex items-start gap-3">
        {tab.favIconUrl ? (
          <img src={tab.favIconUrl} alt="" className="w-4 h-4 mt-0.5 flex-shrink-0" />
        ) : (
          <LucideIcon name="Globe" size={16} className="mt-0.5 flex-shrink-0 text-on-surface-variant" />
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-on-surface truncate">{tab.title}</p>
          <p className="text-xs text-on-surface-variant truncate mt-0.5">{tab.url}</p>
        </div>

        {isStored ? (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openStoredTab(tab.url);
              }}
              className="relative p-2 rounded-lg hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-all group/btn"
            >
              <LucideIcon name="ExternalLink" size={16} />
              <span className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 bg-surface-container/90 backdrop-blur-sm text-on-surface text-xs rounded shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[100]">
                {t.openTab}
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTabFromWorkspace(group!.id, tab.id);
              }}
              className="relative p-2 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition-all group/btn"
            >
              <LucideIcon name="X" size={16} />
              <span className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 bg-surface-container/90 backdrop-blur-sm text-on-surface text-xs rounded shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[100]">
                {t.removeFromGroup}
              </span>
            </button>
          </div>
        ) : (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (moveMenuTabId === tab.id) {
                setMoveMenuTabId(null);
                return;
              }
              const rect = e.currentTarget.getBoundingClientRect();
              setMoveMenuAnchor({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
              setInlineGroupName('');
              setMoveMenuTabId(tab.id);
            }}
            className="relative p-2 rounded-lg hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-all group/btn"
          >
            <LucideIcon name="FolderPlus" size={16} />
            <span className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 bg-surface-container/90 backdrop-blur-sm text-on-surface text-xs rounded shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[100]">
              {t.moveToGroup}
            </span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToReadLater(tab);
            }}
            className="relative p-2 rounded-lg hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-all group/btn"
          >
            <LucideIcon name="Bookmark" size={16} />
            <span className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 bg-surface-container/90 backdrop-blur-sm text-on-surface text-xs rounded shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[100]">
              {t.addToReadLater}
            </span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
            className="relative p-2 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition-all group/btn"
          >
            <LucideIcon name="X" size={16} />
            <span className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 bg-surface-container/90 backdrop-blur-sm text-on-surface text-xs rounded shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[100]">
              {t.closeTab}
            </span>
          </button>
        </div>
        )}
      </div>
      {moveMenuTabId === tab.id && !isStored && renderMoveMenu(tab)}
    </motion.div>
    );
  };

  // Multi-select picker of currently-open tabs to add into a manual workspace
  const renderAddTabsPicker = (group: TabGroup) => {
    const existingUrls = new Set(group.tabs.map(st => st.url));
    const available = tabs.filter(tb => !existingUrls.has(tb.url));
    const toggle = (id: number) =>
      setSelectedTabIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    return (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden mb-3"
      >
        <div className="bg-surface-container/40 rounded-lg border border-outline-variant/15 p-2">
          {available.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-4">{t.noOpenTabs}</p>
          ) : (
            <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-0.5">
              {available.map(tb => {
                const checked = selectedTabIds.has(tb.id);
                return (
                  <button
                    key={tb.id}
                    onClick={() => toggle(tb.id)}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-surface-container/60 transition-colors"
                  >
                    <span className={`w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-primary border-primary text-on-primary' : 'border-outline-variant/50'}`}>
                      {checked && <LucideIcon name="Check" size={12} />}
                    </span>
                    {tb.favIconUrl ? (
                      <img src={tb.favIconUrl} alt="" className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <LucideIcon name="Globe" size={14} className="flex-shrink-0 text-on-surface-variant" />
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-on-surface truncate">{tb.title}</span>
                      <span className="block text-xs text-on-surface-variant truncate">{tb.url}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-2 border-t border-outline-variant/10 pt-2 mt-1">
            <span className="text-xs text-on-surface-variant flex-1 px-1">
              {selectedTabIds.size} {t.selectedCount}
            </span>
            <button
              onClick={() => setAddTabsGroupId(null)}
              className="px-3 py-1.5 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container/60 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              onClick={() => {
                const chosen = available.filter(tb => selectedTabIds.has(tb.id));
                addTabsToWorkspace(group.id, chosen);
                setSelectedTabIds(new Set());
                setAddTabsGroupId(null);
              }}
              disabled={selectedTabIds.size === 0}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {t.addSelected}
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderGroup = (group: TabGroup) => {
    // If tabsAutoExpand is true, expand all groups by default
    // Otherwise, check if the group is in expandedGroups set
    const isExpanded = settings.tabsAutoExpand ? !group.collapsed : expandedGroups.has(group.id);

    return (
      <motion.div
        key={group.id}
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-surface-container/20 backdrop-blur-sm rounded-xl p-4 border border-outline-variant/10"
      >
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => toggleGroup(group.id)}
            className="flex items-center gap-2 flex-1 text-left group/header"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <LucideIcon name="ChevronRight" size={18} className="text-on-surface-variant" />
            </motion.div>
            <h3 className="text-base font-semibold text-on-surface group-hover/header:text-primary transition-colors">
              {group.name}
            </h3>
            <span className="text-xs text-on-surface-variant bg-surface-container/40 px-2 py-0.5 rounded-full">
              {group.tabs.length} {t.tabsCount}
            </span>
          </button>

          <div className="flex items-center gap-1">
            {group.isManual && (
              <button
                onClick={() => {
                  setSelectedTabIds(new Set());
                  setAddTabsGroupId(addTabsGroupId === group.id ? null : group.id);
                }}
                className="relative p-2 rounded-lg hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-all group/btn"
              >
                <LucideIcon name="Plus" size={16} />
                <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-surface-container/90 backdrop-blur-sm text-on-surface text-xs rounded shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  {t.addTabs}
                </span>
              </button>
            )}
            {group.tabs.length > 0 && (
              <>
                <button
                  onClick={() => openAllInGroup(group)}
                  className="relative p-2 rounded-lg hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-all group/btn"
                >
                  <LucideIcon name="FolderOpen" size={16} />
                  <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-surface-container/90 backdrop-blur-sm text-on-surface text-xs rounded shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    {t.openAllTabs}
                  </span>
                </button>
                {!group.isManual && (
                  <button
                    onClick={() => closeAllInGroup(group)}
                    className="relative p-2 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition-all group/btn"
                  >
                    <LucideIcon name="X" size={16} />
                    <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-surface-container/90 backdrop-blur-sm text-on-surface text-xs rounded shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                      {t.closeAllTabs}
                    </span>
                  </button>
                )}
              </>
            )}
            {group.isManual && (
              <button
                onClick={() => deleteManualGroup(group.id)}
                className="relative p-2 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition-all group/btn"
              >
                <LucideIcon name="Trash2" size={16} />
                <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-surface-container/90 backdrop-blur-sm text-on-surface text-xs rounded shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  {t.removeGroup}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Add-tabs picker (manual workspaces) */}
        <AnimatePresence>
          {group.isManual && addTabsGroupId === group.id && renderAddTabsPicker(group)}
        </AnimatePresence>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-2 overflow-hidden"
            >
              {group.tabs.length === 0 ? (
                <p className="text-sm text-on-surface-variant text-center py-4">{t.noTabsInGroup}</p>
              ) : (
                group.tabs.map(tab => renderTabCard(tab, group))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 h-[calc(100vh-12rem)] flex flex-col">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 pb-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 pt-4"
        >
          <h1 className="text-4xl font-bold text-primary mb-2">{t.tabsManagerTitle}</h1>
          <p className="text-sm text-on-surface-variant max-w-2xl mx-auto">{t.tabsManagerSub}</p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <div className="relative max-w-xl mx-auto">
            <LucideIcon name="Search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchTabs}
              className="w-full bg-surface-container/40 backdrop-blur-sm border border-outline-variant/20 rounded-xl pl-12 pr-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </motion.div>

        {/* View Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-2"
        >
          <button
            onClick={() => setActiveView('auto')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === 'auto'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container/40 text-on-surface-variant hover:bg-surface-container/60'
            }`}
          >
            <LucideIcon name="Grid3x3" size={16} className="inline mr-2" />
            {t.autoGroups}
          </button>
          <button
            onClick={() => setActiveView('manual')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === 'manual'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container/40 text-on-surface-variant hover:bg-surface-container/60'
            }`}
          >
            <LucideIcon name="FolderOpen" size={16} className="inline mr-2" />
            {t.manualGroups}
          </button>
          <button
            onClick={() => setActiveView('readlater')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
              activeView === 'readlater'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container/40 text-on-surface-variant hover:bg-surface-container/60'
            }`}
          >
            <LucideIcon name="Bookmark" size={16} className="inline mr-2" />
            {t.readLater}
            {readLaterItems.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-error text-on-error text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {readLaterItems.length}
              </span>
            )}
          </button>
        </motion.div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar -mx-4 px-4 pt-2 pb-8">
        <AnimatePresence mode="wait">
        {activeView === 'auto' && (
          <motion.div
            key="auto-groups"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {filteredAutoGroups.length === 0 ? (
              <div className="text-center py-12">
                <LucideIcon name="Inbox" size={48} className="mx-auto text-on-surface-variant/30 mb-4" />
                <p className="text-on-surface-variant">{t.noTabsInGroup}</p>
              </div>
            ) : (
              filteredAutoGroups.map(group => renderGroup(group))
            )}
          </motion.div>
        )}

        {activeView === 'manual' && (
          <motion.div
            key="manual-groups"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {/* Create Group Button */}
            {!showCreateGroup ? (
              <button
                onClick={() => setShowCreateGroup(true)}
                className="w-full bg-surface-container/40 backdrop-blur-sm border-2 border-dashed border-outline-variant/30 rounded-xl p-6 hover:border-primary/50 hover:bg-surface-container/60 transition-all group"
              >
                <LucideIcon name="Plus" size={24} className="mx-auto text-on-surface-variant group-hover:text-primary transition-colors mb-2" />
                <p className="text-sm font-medium text-on-surface-variant group-hover:text-primary transition-colors">
                  {t.createGroup}
                </p>
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-surface-container/40 backdrop-blur-sm rounded-xl p-6 border border-outline-variant/20"
              >
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder={t.groupName}
                  className="w-full bg-surface-container/60 border border-outline-variant/20 rounded-lg px-4 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary/50 transition-colors mb-3"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createManualGroup();
                    if (e.key === 'Escape') setShowCreateGroup(false);
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={createManualGroup}
                    className="flex-1 bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    {t.save}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateGroup(false);
                      setNewGroupName('');
                    }}
                    className="flex-1 bg-surface-container/60 text-on-surface-variant px-4 py-2 rounded-lg text-sm font-medium hover:bg-surface-container transition-colors"
                  >
                    {t.cancel}
                  </button>
                </div>
              </motion.div>
            )}

            {filteredManualGroups.length === 0 ? (
              <div className="text-center py-12">
                <LucideIcon name="FolderOpen" size={48} className="mx-auto text-on-surface-variant/30 mb-4" />
                <p className="text-on-surface-variant">{t.noTabsInGroup}</p>
              </div>
            ) : (
              filteredManualGroups.map(group => renderGroup(group))
            )}
          </motion.div>
        )}

        {activeView === 'readlater' && (
          <motion.div
            key="read-later"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {filteredReadLater.length === 0 ? (
              <div className="text-center py-12">
                <LucideIcon name="Bookmark" size={48} className="mx-auto text-on-surface-variant/30 mb-4" />
                <p className="text-on-surface-variant mb-2">{t.readLaterEmpty}</p>
                <p className="text-xs text-on-surface-variant/70">{t.readLaterSub}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredReadLater.map(item => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="group relative bg-surface-container/40 backdrop-blur-sm rounded-lg p-4 hover:bg-surface-container/60 transition-all border border-outline-variant/10"
                  >
                    <div className="flex items-start gap-3">
                      {item.favIconUrl ? (
                        <img src={item.favIconUrl} alt="" className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <LucideIcon name="Globe" size={16} className="mt-0.5 flex-shrink-0 text-on-surface-variant" />
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-on-surface">{item.title}</p>
                        <p className="text-xs text-on-surface-variant truncate mt-0.5">{item.url}</p>
                        <p className="text-xs text-on-surface-variant/60 mt-1">
                          {new Date(item.addedAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => restoreFromReadLater(item)}
                          className="relative p-2 rounded-lg hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-all group/btn"
                        >
                          <LucideIcon name="ExternalLink" size={16} />
                          <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-surface-container/90 backdrop-blur-sm text-on-surface text-xs rounded shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                            {t.restore}
                          </span>
                        </button>
                        <button
                          onClick={() => removeFromReadLater(item.id)}
                          className="relative p-2 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition-all group/btn"
                        >
                          <LucideIcon name="Trash2" size={16} />
                          <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-surface-container/90 backdrop-blur-sm text-on-surface text-xs rounded shadow-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                            {t.deleteItem}
                          </span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
