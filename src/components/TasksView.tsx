import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LucideIcon } from './LucideIcon';
import { Task, UserSettings } from '../types';
import { translations } from '../translations';

interface TasksViewProps {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  settings: UserSettings;
  updateSettings: (key: keyof UserSettings, value: any) => void;
}

const ZEN_PRO_TIPS = [
  "Limit your daily big tasks to 3 items for maximum focus.",
  "Single-tasking yields higher precision and lowers digital fatigue.",
  "If a task takes less than 2 minutes, act on it immediately.",
  "Break giant intentions down into smaller, bite-sized tasks.",
  "Review your intent checklist at the dawn and dusk of each cycle.",
  "Unclutter your workspace; clean surrounding space fosters a clear mind."
];

const ZEN_PRO_TIPS_ZH = [
  "建议每天只设定3个核心任务，保持高度专注。",
  "单线程工作可以提供更高的精准度，避免数字过载带来的疲劳。",
  "如果某项任务只需要不到2分钟，立刻着手去完成它。",
  "将庞大的宏伟目标分解为易于执行的具体小步骤。",
  "建议在清晨起床和夜幕降临时，审阅并更新你的专注清单。",
  "整理并保持桌面整洁。生活空间的井井有条，是心境宁静的基石。"
];

export const TasksView: React.FC<TasksViewProps> = ({ tasks, setTasks, settings, updateSettings }) => {
  const [taskInput, setTaskInput] = useState('');
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [taskTime, setTaskTime] = useState('');
  const [taskScope, setTaskScope] = useState<'today' | 'upcoming'>('today');
  const [taskDate, setTaskDate] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');

  const [tipIndex, setTipIndex] = useState(0);

  const t = translations[settings.language || 'en'];

  const activeCount = tasks.filter((t) => !t.completed).length;

  const proTips = settings.language === 'zh' ? ZEN_PRO_TIPS_ZH : ZEN_PRO_TIPS;

  // Add Task handlers
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) return;

    // Grab today's date formatted as YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];

    const newTask: Task = {
      id: Date.now().toString(),
      text: taskInput.trim(),
      completed: false,
      priority: taskPriority,
      time: taskTime ? taskTime : undefined,
      date: taskScope === 'today' ? todayStr : (taskDate || undefined)
    };

    setTasks([newTask, ...tasks]);
    setTaskInput('');
    setTaskTime('');
    setTaskDate('');
    setTaskPriority('medium');
  };

  // Toggle checklist complete
  const handleToggleTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    let shouldClearIntent = false;
    
    if (task && !task.completed && task.text === settings.currentIntent) {
      shouldClearIntent = true;
    }

    setTasks(
      tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );

    if (shouldClearIntent) {
      updateSettings('currentIntent', '');
    }
  };

  // Delete individual task
  const handleDeleteTask = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    
    setTasks(tasks.filter((t) => t.id !== id));
    
    if (task && task.text === settings.currentIntent) {
      updateSettings('currentIntent', '');
    }
  };

  // Save inline edits
  const handleSaveEdit = (id: string) => {
    if (editInput.trim()) {
      setTasks(
        tasks.map((t) => (t.id === id ? { ...t, text: editInput.trim() } : t))
      );
    }
    setEditingId(null);
  };

  // Clear completed tasks
  const handleClearCompleted = () => {
    if (confirm("Permanently archive and delete all completed tasks?")) {
      setTasks(tasks.filter((t) => !t.completed));
    }
  };

  // Dynamic shuffling of zen tips
  const handleRotateTip = () => {
    setTipIndex((prev) => (prev + 1) % ZEN_PRO_TIPS.length);
  };

  // Segregate tasks under categories
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(
    (t) => !t.completed && (t.date === todayStr || !t.date)
  );
  const upcomingTasks = tasks.filter(
    (t) => !t.completed && t.date && t.date !== todayStr
  );
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 pb-24">
      
      {/* Header section with active dynamic counters */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-outline-variant/10 pb-6 select-none text-left">
        <div>
          <h1 className="font-sans text-3xl font-bold text-emphasis tracking-tight">{t.dailyFocus}</h1>
          <p className="text-sm text-on-surface-variant/80 font-sans mt-1">
            {t.tasksSub}
          </p>
        </div>

        <div className="flex gap-2">
          <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-2 text-primary border-primary/20 shadow-sm bg-primary/5">
            <LucideIcon name="SquareCheck" size={16} className="stroke-[2.5]" />
            <span className="font-sans text-xs font-semibold uppercase tracking-wider">
              {activeCount} {t.activeIntentions}
            </span>
          </div>
        </div>
      </div>
      
      {/* Linked Core Focus from Home Page */}
      {settings.currentIntent && (
        <div className="glass-panel p-4 rounded-xl flex items-center justify-between border-primary/30 bg-primary/5 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 w-1 bg-primary"></div>
          <div className="flex items-center gap-3 pl-2">
            <div className="p-2 bg-primary/20 rounded-full text-primary">
              <LucideIcon name="Target" size={16} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-primary/70 mb-0.5">
                {t.currentIntent || 'Core Focus'}
              </p>
              <p className="text-sm font-medium text-emphasis">
                {settings.currentIntent}
              </p>
            </div>
          </div>
          <button 
            onClick={() => updateSettings('currentIntent', '')}
            className="text-on-surface-variant/50 hover:text-primary p-2 mr-1 transition-colors cursor-pointer"
            title="Clear core focus"
          >
            <LucideIcon name="Check" size={16} />
          </button>
        </div>
      )}

      {/* Bento Input form layout */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl shadow-md border-outline-variant/10">
        <form onSubmit={handleAddTask} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {/* Input intention text */}
            <div className="flex-1 w-full flex items-center gap-3 bg-surface-container/30 border border-outline-variant/10 rounded-xl px-4 py-3 focus-within:ring-1 focus-within:ring-primary/30 focus-within:bg-surface-container/50 transition-all">
              <LucideIcon name="Plus" className="text-on-surface-variant/70" size={18} />
              <input
                type="text"
                required
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder={t.intendPlaceholder}
                className="bg-transparent border-none focus:outline-none focus:ring-0 text-emphasis placeholder-emphasis text-sm sm:text-base w-full font-sans outline-none"
              />
            </div>

            {/* Quick config fields */}
            <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center w-full md:w-auto justify-end">
              
              {/* Task Scope Selection: Today vs Scheduled Future */}
              <div className="flex rounded-lg border border-outline-variant/15 p-0.5 text-xs bg-surface-container/20">
                <button
                  type="button"
                  onClick={() => setTaskScope('today')}
                  className={`px-2.5 py-1.5 rounded-md font-sans text-[11px] transition-all cursor-pointer ${
                    taskScope === 'today' ? 'bg-primary text-on-primary font-medium' : 'text-on-surface-variant hover:text-emphasis'
                  }`}
                >
                  {t.today}
                </button>
                <button
                  type="button"
                  onClick={() => setTaskScope('upcoming')}
                  className={`px-2.5 py-1.5 rounded-md font-sans text-[11px] transition-all cursor-pointer ${
                    taskScope === 'upcoming' ? 'bg-primary text-on-primary font-medium' : 'text-on-surface-variant hover:text-emphasis'
                  }`}
                >
                  {t.schedule}
                </button>
              </div>

              {/* Priority Dropdown selector */}
              <div className="flex items-center gap-1.5 bg-surface-container/20 border border-outline-variant/15 px-2.5 py-1.5 rounded-lg select-none">
                <span className="text-[10px] uppercase tracking-wider text-on-surface-variant/40 select-none">{t.priority}</span>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as any)}
                  className="bg-transparent border-none text-xs text-emphasis focus:outline-none focus:ring-0 outline-none cursor-pointer p-0.5"
                >
                  <option value="high" className="bg-surface-container-high text-error text-xs font-sans">{t.high}</option>
                  <option value="medium" className="bg-surface-container-high text-tertiary text-xs font-sans">{t.medium}</option>
                  <option value="low" className="bg-surface-container-high text-secondary text-xs font-sans">{t.low}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Conditional Scheduled inputs details */}
          <div className="flex flex-col sm:flex-row gap-4 items-center bg-white/5 p-3 rounded-xl border border-white/5">
            {taskScope === 'upcoming' && (
              <div className="flex flex-col gap-1 w-full sm:w-auto text-left">
                <label className="text-[10px] text-on-surface-variant/50 uppercase tracking-widest font-sans">{t.scheduledDate}</label>
                <input
                  type="date"
                  value={taskDate}
                  onChange={(e) => setTaskDate(e.target.value)}
                  className="text-xs font-sans text-emphasis bg-surface-container border border-outline-variant/15 rounded px-2.5 py-1.5 focus:outline-none"
                />
              </div>
            )}

            <div className="flex flex-col gap-1 w-full sm:w-auto text-left">
              <label className="text-[10px] text-on-surface-variant/50 uppercase tracking-widest font-sans">{t.optionalTime}</label>
              <input
                type="time"
                value={taskTime}
                onChange={(e) => setTaskTime(e.target.value)}
                className="text-xs font-sans text-emphasis bg-surface-container border border-outline-variant/15 rounded px-2.5 py-1.5 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="mt-auto sm:ml-auto w-full sm:w-32 py-2 bg-primary text-on-primary font-sans font-semibold text-xs tracking-wider uppercase rounded-lg hover:brightness-110 active:scale-95 transition-all text-center select-none cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
            >
              <LucideIcon name="Plus" size={14} />
              {t.addTask}
            </button>
          </div>
        </form>
      </div>

      {/* Task categories Columns layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left main: Today list */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2 select-none text-left">
            <h2 className="font-sans text-xs tracking-[0.2em] text-primary/70 font-semibold uppercase">
              {t.todaysTargets}
            </h2>
            <span className="text-[10px] text-on-surface-variant/40 font-semibold">{todayTasks.length} {t.inScope}</span>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {todayTasks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white/3 border border-white/5 border-dashed p-8 text-center rounded-2xl select-none"
                >
                  <p className="text-sm font-sans text-on-surface-variant/40">{t.noGoalsToday}</p>
                  <p className="text-xs font-sans text-primary/30 mt-1">{t.clarityEmpty}</p>
                </motion.div>
              ) : (
                todayTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="group border border-outline-variant/10 bg-surface-container/20 hover:bg-surface-container/40 p-4 rounded-xl flex items-center gap-3.5 shadow-sm transition-all"
                  >
                    {/* Glowing Circular toggle */}
                    <button
                      onClick={() => handleToggleTask(task.id)}
                      className="w-5.5 h-5.5 rounded-full border border-primary/40 hover:border-primary flex items-center justify-center cursor-pointer transition-colors"
                      title="Complete this task"
                    >
                      <LucideIcon name="Check" size={12} className="stroke-[3] text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <div className="flex-1 text-left">
                      {editingId === task.id ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={editInput}
                            onChange={(e) => setEditInput(e.target.value)}
                            onBlur={() => handleSaveEdit(task.id)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(task.id)}
                            autoFocus
                            className="bg-transparent text-sm text-emphasis focus:outline-none focus:ring-0 focus:border-b focus:border-primary w-full py-0.5 outline-none font-sans"
                          />
                        </div>
                      ) : (
                        <p className="font-sans text-sm sm:text-base text-emphasis leading-tight break-words">
                          {task.text}
                        </p>
                      )}

                      <div className="flex gap-2 items-center flex-wrap mt-2 select-none">
                        {/* Priority Badge */}
                        {task.priority === 'high' && (
                          <span className="px-2 py-0.5 bg-red-500/10 text-red-300 text-[9px] font-bold tracking-wider rounded-full uppercase">
                            {t.high}
                          </span>
                        )}
                        {task.priority === 'medium' && (
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 text-[9px] font-bold tracking-wider rounded-full uppercase">
                            {t.medium}
                          </span>
                        )}
                        {task.priority === 'low' && (
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 text-[9px] font-bold tracking-wider rounded-full uppercase">
                            {t.low}
                          </span>
                        )}

                        {/* Optional time details */}
                        {task.time && (
                          <span className="px-2 py-0.5 bg-surface-container-high/60 text-on-surface-variant text-[9px] rounded-full flex items-center gap-1">
                            <LucideIcon name="Timer" size={8} />
                            {task.time}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Operational controls */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 select-none transition-opacity ml-auto">
                      <button
                        onClick={() => updateSettings('currentIntent', task.text)}
                        className={`p-1 cursor-pointer transition-colors ${
                          settings.currentIntent === task.text 
                            ? 'text-primary' 
                            : 'text-on-surface-variant/40 hover:text-primary'
                        }`}
                        title="Set as core focus"
                      >
                        <LucideIcon name="Target" size={14} />
                      </button>
                      <button
                        onClick={() => { setEditingId(task.id); setEditInput(task.text); }}
                        className="text-on-surface-variant/40 hover:text-primary p-1 cursor-pointer"
                        title="Edit intention description"
                      >
                        <LucideIcon name="Edit" size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-on-surface-variant/40 hover:text-error p-1 cursor-pointer"
                        title="Delete task item"
                      >
                        <LucideIcon name="Trash2" size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Right side: Future schedule & completed checklists */}
        <section className="lg:col-span-5 space-y-6">
          
          {/* Calendar Scheduled Future Tasks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2 select-none text-left">
              <h2 className="font-sans text-xs tracking-[0.2em] text-primary/70 font-semibold uppercase">
                {t.upcomingScope}
              </h2>
              <span className="text-[10px] text-on-surface-variant/40 font-semibold">{upcomingTasks.length} {t.scheduledCount}</span>
            </div>

            <div className="space-y-2.5">
              <AnimatePresence mode="popLayout">
                {upcomingTasks.length === 0 ? (
                  <p className="text-xs italic text-on-surface-variant/40 select-none px-1 text-left">
                    {t.noFutureGoals}
                  </p>
                ) : (
                  upcomingTasks.map((task) => {
                    const cleanDate = task.date ? task.date.split('-').slice(1).join('/') : '';
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="glass-panel p-3.5 rounded-xl flex items-center gap-3 hover:border-outline-high"
                      >
                        {/* Compact Calendar visual tag */}
                        <div className="text-center min-w-[44px] bg-white/5 py-1 px-1.5 rounded-md select-none border border-white/5">
                          <p className="text-[9px] text-primary font-bold uppercase tracking-tight">Calendar</p>
                          <p className="text-base font-bold leading-none text-emphasis my-0.5">{cleanDate || 'S'}</p>
                        </div>

                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium text-emphasis truncate">{task.text}</p>
                          {task.time && (
                            <p className="text-[10px] text-on-surface-variant/50 flex items-center gap-1 mt-0.5 uppercase">
                              <LucideIcon name="Timer" size={8} /> {task.time}
                            </p>
                          )}
                        </div>

                        {/* Interactive toggle and discard */}
                        <button
                          onClick={() => handleToggleTask(task.id)}
                          className="text-on-surface-variant/45 hover:text-primary cursor-pointer p-1"
                        >
                          <LucideIcon name="SquareCheck" size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-on-surface-variant/45 hover:text-error cursor-pointer p-1"
                        >
                          <LucideIcon name="Trash2" size={14} />
                        </button>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Completed / History lists */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2 select-none">
              <h2 className="font-sans text-xs tracking-[0.2em] text-on-surface-variant/60 font-semibold uppercase">
                {t.completedIntentions}
              </h2>
              {completedTasks.length > 0 && (
                <button
                  onClick={handleClearCompleted}
                  className="text-[10px] text-primary/80 hover:underline hover:text-primary transition-all font-semibold font-sans uppercase tracking-wider cursor-pointer"
                >
                  {t.clearArchive}
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar">
              <AnimatePresence>
                {completedTasks.length === 0 ? (
                  <p className="text-xs italic text-on-surface-variant/40 select-none px-1">
                    {t.populateWarning}
                  </p>
                ) : (
                  completedTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.5 }}
                      exit={{ opacity: 0 }}
                      className="glass-panel p-3 rounded-lg flex items-center gap-3 bg-surface-container-lowest/15"
                    >
                      {/* Active fully checked circle icon */}
                      <div 
                        onClick={() => handleToggleTask(task.id)}
                        className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center text-primary cursor-pointer border border-primary/30"
                      >
                        <LucideIcon name="Check" size={10} className="stroke-[3]" />
                      </div>
                      
                      <p className="text-xs font-sans text-on-surface-variant line-through truncate flex-1 break-all select-none">
                        {task.text}
                      </p>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-on-surface-variant/30 hover:text-error cursor-pointer p-0.5 ml-auto"
                      >
                        <LucideIcon name="Trash2" size={12} />
                      </button>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Large Zen advice photo widget with dynamic advice cycling */}
          <div 
            onClick={handleRotateTip}
            className="group relative h-48 rounded-2xl overflow-hidden shadow-md cursor-pointer select-none bg-surface-container-lowest"
          >
            <img
              alt="Zen desk workspace decoration background"
              className="w-full h-full object-cover opacity-35 group-hover:scale-105 transition-transform duration-[1200ms] ease-out brightness-[0.7]"
              referrerPolicy="no-referrer"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD3wqjHNhLW6Dbc22qLw9pB3R3Rz4GAnOutoXdRjdj9DY8MGj-l1nfHd0dSb0STfhB2X_-68pAFNFN0GeQP_bWZAnBqLWrAKoUVxsQLCITK7hyQxrTBDyiiDLuXWWwnnvr-1q8iYld7VT-mYWn0gAq_KI-JpVjnjUHI-xzZRAeftMypbJMkTbrqQC7Gkpoqw6pA3Vugj32QxOeCdNoCbulYn1clJK-z9u6Kmqk6g7SH9Vw5aR7fV0Ae6XwCcza4kloBBlraYkdN3Nw"
            />
            {/* Soft upward gradient dark shield */}
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent"></div>
            
            <div className="absolute bottom-4 left-4 right-4 text-left">
              <span className="font-sans text-[10px] tracking-[0.25em] text-primary/80 font-bold uppercase block mb-1">
                {t.zenProtip}
              </span>
              <p className="font-sans text-xs sm:text-sm text-emphasis line-clamp-3 leading-relaxed group-hover:text-primary transition-colors h-[60px] sm:h-[63px]">
                {proTips[tipIndex]}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-on-surface-variant/40 mt-1 font-medium">
                <LucideIcon name="RotateCcw" size={8} /> {t.cycleAdvice}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
