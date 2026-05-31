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
  CloudRain,
  Folder,
  FolderOpen,
  FolderPlus
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
  CloudRain,
  Folder,
  FolderOpen,
  FolderPlus
};

interface LucideIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const LucideIcon: React.FC<LucideIconProps> = ({ name, className = '', size = 20 }) => {
  if (name.startsWith('favicon:')) {
    const domain = name.split(':')[1];
    const [imgSrc, setImgSrc] = React.useState(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);

    const handleError = () => {
      // 降级方案：依次尝试其他 favicon 服务
      if (imgSrc.includes('google.com')) {
        // 方案2: 使用阿里巴巴 iconfont 图标服务（国内可访问）
        setImgSrc(`https://api.iowen.cn/favicon/${domain}.png`);
      } else if (imgSrc.includes('iowen.cn')) {
        // 方案3: 使用网站自己的 favicon
        setImgSrc(`https://${domain}/favicon.ico`);
      } else {
        // 最终降级：显示默认链接图标
        setImgSrc('');
      }
    };

    if (!imgSrc) {
      // 如果所有方案都失败，显示默认图标
      const IconComponent = Link2;
      return <IconComponent className={className} size={size} />;
    }

    return (
      <div
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
        className={className}
      >
        <img
          src={imgSrc}
          alt="Favicon"
          draggable={false}
          onError={handleError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />
      </div>
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
