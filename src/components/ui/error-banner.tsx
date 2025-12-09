import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface ErrorBannerProps {
  title: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryAfter?: number;
  className?: string;
}

export function ErrorBanner({ title, message, onRetry, onDismiss, retryAfter, className }: ErrorBannerProps) {
  return (
    <div className={cn('rounded-lg border border-destructive/20 bg-destructive/10 p-4', className)}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <h4 className="font-semibold text-destructive">{title}</h4>
          <p className="text-sm text-destructive/80">{message}</p>
          {retryAfter && (
            <p className="text-sm text-destructive/60">
              Retry available in {retryAfter} seconds
            </p>
          )}
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-2 border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
        </div>
        {onDismiss && (
          <Button variant="ghost" size="icon" onClick={onDismiss} className="h-8 w-8 text-destructive">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
