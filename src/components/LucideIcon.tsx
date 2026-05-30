import React from 'react';
import {
  Github,
  Mail,
  PenTool,
  BookOpen,
  Youtube,
  MessageSquare,
  Music,
  ShoppingBag,
  Settings,
  Search,
  Home,
  Timer,
  CheckSquare,
  SquareCheck,
  Plus,
  Trash2,
  Edit,
  Check,
  Play,
  Pause,
  RotateCcw,
  Share2,
  Bookmark,
  MoreVertical,
  Cloud,
  Sun,
  CloudSun,
  Image,
  Info,
  Code,
  Eye,
  X,
  Link2,
  Terminal,
  Briefcase,
  Calendar,
  Compass,
  CheckCircle2,
  EyeOff,
  CloudLightning,
  CloudRain
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<any>> = {
  Github,
  Mail,
  PenTool,
  BookOpen,
  Youtube,
  MessageSquare,
  Music,
  ShoppingBag,
  Settings,
  Search,
  Home,
  Timer,
  CheckSquare,
  SquareCheck,
  Plus,
  Trash2,
  Edit,
  Check,
  Play,
  Pause,
  RotateCcw,
  Share2,
  Bookmark,
  MoreVertical,
  Cloud,
  Sun,
  CloudSun,
  Image,
  Info,
  Code,
  Eye,
  X,
  Link2,
  Terminal,
  Briefcase,
  Calendar,
  Compass,
  CheckCircle2,
  EyeOff,
  CloudLightning,
  CloudRain
};

interface LucideIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const LucideIcon: React.FC<LucideIconProps> = ({ name, className = '', size = 20 }) => {
  if (name.startsWith('favicon:')) {
    const domain = name.split(':')[1];
    return (
      <img 
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`} 
        alt="Favicon"
        style={{ width: size, height: size }}
        className={`object-contain ${className}`} 
      />
    );
  }

  // Normalize key to find in dictionary (e.g. "Github" or "github" or "GitHub")
  const normalizedKey = Object.keys(iconMap).find(
    (key) => key.toLowerCase() === name.toLowerCase()
  );

  const IconComponent = normalizedKey ? iconMap[normalizedKey] : Link2;

  return <IconComponent className={className} size={size} />;
};

export const AVAILABLE_LINK_ICONS = [
  'Github',
  'Mail',
  'PenTool',
  'BookOpen',
  'Youtube',
  'MessageSquare',
  'Music',
  'ShoppingBag',
  'Code',
  'Link2',
  'Terminal',
  'Briefcase',
  'Calendar',
  'Compass'
];
