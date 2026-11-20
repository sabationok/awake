import {
  Activity,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  ChartColumn,
  Circle,
  Coffee,
  Flame,
  Laptop,
  LaptopMinimal,
  Lock,
  Monitor,
  Moon,
  Plug,
  ScrollText,
  Send,
  Settings,
  Shield,
  SlidersHorizontal,
  Thermometer,
  Wifi,
  type LucideIcon,
} from 'lucide-react';

/** SF Symbol з дерева → іконка lucide. Невідома назва малює крапку-заглушку. */
const SYMBOL_ICON: Record<string, LucideIcon | undefined> = {
  'cup.and.saucer.fill': Coffee,
  'waveform.path.ecg': Activity,
  'list.bullet.rectangle': ScrollText,
  'gearshape.fill': Settings,
  'battery.75': BatteryMedium,
  'battery.25': BatteryLow,
  'battery.0': BatteryWarning,
  'chart.bar.xaxis': ChartColumn,
  display: Monitor,
  'shield.fill': Shield,
  'slider.horizontal.3': SlidersHorizontal,
  'flame.fill': Flame,
  'powerplug.fill': Plug,
  'thermometer.medium': Thermometer,
  laptopcomputer: Laptop,
  wifi: Wifi,
  'lock.laptopcomputer': LaptopMinimal,
  'paperplane.fill': Send,
  'moon.fill': Moon,
  lock: Lock,
};

export function resolveSymbolIcon(symbol: string): LucideIcon {
  return SYMBOL_ICON[symbol] ?? Circle;
}
