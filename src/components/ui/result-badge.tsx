import { cn } from '@/lib/utils';
import { Check, X, AlertTriangle, HelpCircle, Minus } from 'lucide-react';

interface ResultBadgeProps {
  result: 'pass' | 'fail' | 'block' | 'query' | 'pending' | '';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const resultConfig = {
  pass: {
    icon: Check,
    label: 'Pass',
    className: 'bg-success/10 text-success border-success/20',
  },
  fail: {
    icon: X,
    label: 'Fail',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  block: {
    icon: AlertTriangle,
    label: 'Blocked',
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  query: {
    icon: HelpCircle,
    label: 'Query',
    className: 'bg-info/10 text-info border-info/20',
  },
  pending: {
    icon: Minus,
    label: 'Pending',
    className: 'bg-muted text-muted-foreground border-muted-foreground/20',
  },
  '': {
    icon: Minus,
    label: 'Not Run',
    className: 'bg-muted text-muted-foreground border-muted-foreground/20',
  },
};

const sizeConfig = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
};

const iconSizeConfig = {
  sm: 12,
  md: 14,
  lg: 16,
};

export function ResultBadge({ result, showLabel = true, size = 'md', className }: ResultBadgeProps) {
  const config = resultConfig[result] || resultConfig[''];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-medium',
        config.className,
        sizeConfig[size],
        className
      )}
    >
      <Icon size={iconSizeConfig[size]} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
