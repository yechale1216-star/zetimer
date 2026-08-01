// This file fixes lucide-react type resolution under moduleResolution: "bundler"
// lucide-react 1.x uses "typings" (not "types") and has no "exports" map.
// TypeScript with bundler resolution requires "types" or exports["."].types.
// This shim explicitly declares all named exports used across the project.

import type { FC, SVGProps } from "react"

export type LucideProps = SVGProps<SVGSVGElement> & {
  size?: number | string
  strokeWidth?: number | string
  absoluteStrokeWidth?: boolean
  color?: string
  className?: string
}
export type LucideIcon = FC<LucideProps>
export type IconNode = [string, Record<string, string>][]

export declare function createLucideIcon(iconName: string, iconNode: IconNode): LucideIcon

declare module "lucide-react" {
  import type { FC, SVGProps } from "react"

  export type LucideProps = SVGProps<SVGSVGElement> & {
    size?: number | string
    strokeWidth?: number | string
    absoluteStrokeWidth?: boolean
    color?: string
    className?: string
  }
  export type LucideIcon = FC<LucideProps>
  export type IconNode = [string, Record<string, string>][]

  export declare function createLucideIcon(iconName: string, iconNode: IconNode): LucideIcon

  // ── Navigation & UI ──────────────────────────────────────────────────────────
  export const ArrowLeft: LucideIcon
  export const ArrowRight: LucideIcon
  export const ArrowUp: LucideIcon
  export const ArrowDown: LucideIcon
  export const ArrowUpRight: LucideIcon
  export const ArrowDownLeft: LucideIcon
  export const ArrowLeftRight: LucideIcon
  export const ChevronLeft: LucideIcon
  export const ChevronRight: LucideIcon
  export const ChevronUp: LucideIcon
  export const ChevronDown: LucideIcon
  export const ChevronUpIcon: LucideIcon
  export const ChevronDownIcon: LucideIcon
  export const ChevronRightIcon: LucideIcon
  export const Menu: LucideIcon
  export const MoreHorizontal: LucideIcon
  export const MoreVertical: LucideIcon
  export const PanelLeft: LucideIcon
  export const PanelLeftIcon: LucideIcon
  export const PanelRight: LucideIcon
  export const Sidebar: LucideIcon

  // ── Actions ──────────────────────────────────────────────────────────────────
  export const Search: LucideIcon
  export const SearchIcon: LucideIcon
  export const Filter: LucideIcon
  export const Save: LucideIcon
  export const Edit: LucideIcon
  export const Edit2: LucideIcon
  export const Edit3: LucideIcon
  export const Pencil: LucideIcon
  export const Plus: LucideIcon
  export const PlusCircle: LucideIcon
  export const Minus: LucideIcon
  export const MinusIcon: LucideIcon
  export const X: LucideIcon
  export const XIcon: LucideIcon
  export const Check: LucideIcon
  export const CheckIcon: LucideIcon
  export const CheckCheck: LucideIcon
  export const CheckCircle: LucideIcon
  export const CheckCircle2: LucideIcon
  export const XCircle: LucideIcon
  export const Copy: LucideIcon
  export const Download: LucideIcon
  export const Upload: LucideIcon
  export const UploadCloud: LucideIcon
  export const RefreshCw: LucideIcon
  export const RotateCcw: LucideIcon
  export const RotateCw: LucideIcon
  export const Send: LucideIcon
  export const Share: LucideIcon
  export const Share2: LucideIcon
  export const Printer: LucideIcon
  export const Trash2: LucideIcon
  export const Delete: LucideIcon
  export const Bookmark: LucideIcon
  export const Pin: LucideIcon
  export const Move: LucideIcon
  export const GripVerticalIcon: LucideIcon

  // ── Status & Alerts ──────────────────────────────────────────────────────────
  export const AlertCircle: LucideIcon
  export const AlertTriangle: LucideIcon
  export const AlertOctagon: LucideIcon
  export const Info: LucideIcon
  export const HelpCircle: LucideIcon
  export const CircleIcon: LucideIcon
  export const Loader2: LucideIcon
  export const Loader2Icon: LucideIcon
  export const Activity: LucideIcon
  export const Zap: LucideIcon
  export const Sparkles: LucideIcon
  export const Star: LucideIcon
  export const Heart: LucideIcon
  export const ThumbsUp: LucideIcon
  export const ThumbsDown: LucideIcon
  export const Flag: LucideIcon
  export const Award: LucideIcon
  export const TrendingUp: LucideIcon
  export const TrendingDown: LucideIcon

  // ── Time ─────────────────────────────────────────────────────────────────────
  export const Clock: LucideIcon
  export const Clock3: LucideIcon
  export const Calendar: LucideIcon
  export const CalendarDays: LucideIcon
  export const History: LucideIcon
  export const Timer: LucideIcon

  // ── Users & People ───────────────────────────────────────────────────────────
  export const User: LucideIcon
  export const UserIcon: LucideIcon
  export const Users: LucideIcon
  export const UserX: LucideIcon
  export const UserCheck: LucideIcon
  export const UserCog: LucideIcon
  export const UserPlus: LucideIcon
  export const UserMinus: LucideIcon
  export const GraduationCap: LucideIcon

  // ── Communication ────────────────────────────────────────────────────────────
  export const Mail: LucideIcon
  export const MessageSquare: LucideIcon
  export const MessageCircle: LucideIcon
  export const MessageCircleMore: LucideIcon
  export const Phone: LucideIcon
  export const PhoneCall: LucideIcon
  export const PhoneMissed: LucideIcon
  export const PhoneOff: LucideIcon
  export const Bell: LucideIcon
  export const BellOff: LucideIcon
  export const Megaphone: LucideIcon
  export const Inbox: LucideIcon
  export const Mailbox: LucideIcon
  export const AtSign: LucideIcon

  // ── Security & Auth ──────────────────────────────────────────────────────────
  export const Lock: LucideIcon
  export const Unlock: LucideIcon
  export const Shield: LucideIcon
  export const ShieldCheck: LucideIcon
  export const ShieldAlert: LucideIcon
  export const ShieldBan: LucideIcon
  export const ShieldOff: LucideIcon
  export const ShieldX: LucideIcon
  export const Key: LucideIcon
  export const Eye: LucideIcon
  export const EyeOff: LucideIcon
  export const Fingerprint: LucideIcon
  export const Scan: LucideIcon

  // ── Files & Data ─────────────────────────────────────────────────────────────
  export const File: LucideIcon
  export const FileText: LucideIcon
  export const FileCheck: LucideIcon
  export const FileCheck2: LucideIcon
  export const FileClock: LucideIcon
  export const Folder: LucideIcon
  export const FolderOpen: LucideIcon
  export const Clipboard: LucideIcon
  export const ClipboardCheck: LucideIcon
  export const ClipboardList: LucideIcon
  export const Database: LucideIcon
  export const Archive: LucideIcon
  export const Package: LucideIcon
  export const Box: LucideIcon
  export const Layers: LucideIcon
  export const Tag: LucideIcon
  export const Hash: LucideIcon
  export const ScrollText: LucideIcon
  export const NotepadText: LucideIcon
  export const Notebook: LucideIcon
  export const BookOpen: LucideIcon
  export const Book: LucideIcon
  export const Briefcase: LucideIcon

  // ── Charts & Analytics ───────────────────────────────────────────────────────
  export const BarChart: LucideIcon
  export const BarChart2: LucideIcon
  export const BarChart3: LucideIcon
  export const LineChart: LucideIcon
  export const PieChart: LucideIcon
  export const TrendingUp: LucideIcon
  export const TrendingDown: LucideIcon
  export const Table: LucideIcon

  // ── Maps & Location ──────────────────────────────────────────────────────────
  export const MapPin: LucideIcon
  export const Map: LucideIcon
  export const Navigation: LucideIcon
  export const Navigation2: LucideIcon
  export const Compass: LucideIcon
  export const Globe: LucideIcon
  export const LocateFixed: LucideIcon
  export const LocateOff: LucideIcon
  export const Target: LucideIcon
  export const ExternalLink: LucideIcon
  export const Link: LucideIcon

  // ── Device & Tech ────────────────────────────────────────────────────────────
  export const Smartphone: LucideIcon
  export const Tablet: LucideIcon
  export const Monitor: LucideIcon
  export const Laptop: LucideIcon
  export const Camera: LucideIcon
  export const Video: LucideIcon
  export const VideoOff: LucideIcon
  export const Mic: LucideIcon
  export const MicOff: LucideIcon
  export const Headphones: LucideIcon
  export const HeadphonesIcon: LucideIcon
  export const Radio: LucideIcon
  export const Wifi: LucideIcon
  export const WifiOff: LucideIcon
  export const Bluetooth: LucideIcon
  export const Server: LucideIcon
  export const HardDrive: LucideIcon
  export const Cpu: LucideIcon
  export const Battery: LucideIcon
  export const BatteryLow: LucideIcon
  export const Power: LucideIcon
  export const Terminal: LucideIcon
  export const Code: LucideIcon
  export const Code2: LucideIcon
  export const QrCode: LucideIcon
  export const CreditCard: LucideIcon

  // ── Media & Controls ─────────────────────────────────────────────────────────
  export const Play: LucideIcon
  export const Pause: LucideIcon
  export const PauseCircle: LucideIcon
  export const PlayCircle: LucideIcon
  export const Stop: LucideIcon
  export const SkipForward: LucideIcon
  export const SkipBack: LucideIcon
  export const Repeat: LucideIcon
  export const Shuffle: LucideIcon
  export const Volume: LucideIcon
  export const Volume2: LucideIcon
  export const VolumeX: LucideIcon
  export const Music: LucideIcon
  export const Image: LucideIcon

  // ── Layout & View ────────────────────────────────────────────────────────────
  export const Layout: LucideIcon
  export const Grid: LucideIcon
  export const List: LucideIcon
  export const Maximize: LucideIcon
  export const Maximize2: LucideIcon
  export const Minimize: LucideIcon
  export const Minimize2: LucideIcon
  export const ZoomIn: LucideIcon
  export const ZoomOut: LucideIcon
  export const SlidersHorizontal: LucideIcon
  export const Sliders: LucideIcon
  export const ToggleLeft: LucideIcon
  export const ToggleRight: LucideIcon

  // ── Settings & Config ────────────────────────────────────────────────────────
  export const Settings: LucideIcon
  export const Settings2: LucideIcon
  export const LogOut: LucideIcon
  export const Sun: LucideIcon
  export const Moon: LucideIcon
  export const Scale: LucideIcon

  // ── Misc ─────────────────────────────────────────────────────────────────────
  export const Smoke: LucideIcon
  export const ScissorsLineDashed: LucideIcon
  export const PenLine: LucideIcon
  export const UploadCloud: LucideIcon

  // Lucide type alias exports (Icon suffix variants)
  export const LucideIcon: LucideIcon
}
