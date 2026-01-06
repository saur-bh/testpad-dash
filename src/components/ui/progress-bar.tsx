import { cn } from '@/lib/utils';
import type { Progress } from '@/types/testpad';

interface ProgressBarProps {
  progress: Progress;
  showLabels?: boolean;
  className?: string;
  height?: 'sm' | 'md' | 'lg' | 'xl';
}

const heightConfig = {
  sm: 'h-2',
  md: 'h-4',
  lg: 'h-6',
  xl: 'h-8',
};

export function ProgressBar({ progress, showLabels = false, className, height = 'md' }: ProgressBarProps) {
  const total = progress.total || 1;
  const passPercent = (progress.pass / total) * 100;
  const failPercent = (progress.fail / total) * 100;
  const blockPercent = (progress.block / total) * 100;
  const queryPercent = (progress.query / total) * 100;
  const pendingPercent = 100 - passPercent - failPercent - blockPercent - queryPercent;

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('flex w-full overflow-hidden rounded-full bg-muted', heightConfig[height])}>
        {passPercent > 0 && (
          <div
            className="bg-chart-pass transition-all duration-500"
            style={{ width: `${passPercent}%` }}
          />
        )}
        {failPercent > 0 && (
          <div
            className="bg-chart-fail transition-all duration-500"
            style={{ width: `${failPercent}%` }}
          />
        )}
        {blockPercent > 0 && (
          <div
            className="bg-chart-block transition-all duration-500"
            style={{ width: `${blockPercent}%` }}
          />
        )}
        {queryPercent > 0 && (
          <div
            className="bg-chart-query transition-all duration-500"
            style={{ width: `${queryPercent}%` }}
          />
        )}
        {pendingPercent > 0 && (
          <div
            className="bg-chart-pending transition-all duration-500"
            style={{ width: `${pendingPercent}%` }}
          />
        )}
      </div>
      {showLabels && (
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-chart-pass" />
            <span>Pass: {progress.pass}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-chart-fail" />
            <span>Fail: {progress.fail}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-chart-block" />
            <span>Block: {progress.block}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-chart-query" />
            <span>Query: {progress.query}</span>
          </div>
        </div>
      )}
    </div>
  );
}
