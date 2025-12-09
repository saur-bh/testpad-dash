import { RefreshCw, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AppHeaderProps {
  title: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  showSettings?: boolean;
  showBack?: boolean;
}

export function AppHeader({ title, onRefresh, isRefreshing, showSettings = true, showBack }: AppHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          {showBack && (
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              ← Back
            </Button>
          )}
          <h1 className="text-xl font-bold">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
          {showSettings && (
            <Button variant="outline" size="icon" onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
