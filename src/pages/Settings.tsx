import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, LogOut, RefreshCw, Info, Eye, EyeOff, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/layout/app-header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Separator } from '@/components/ui/separator';
import { testpadApi } from '@/lib/testpad-api';
import { toast } from '@/hooks/use-toast';

export default function Settings() {
  const navigate = useNavigate();
  const [showApiKey, setShowApiKey] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const apiKey = testpadApi.getApiKey() || '';
  const maskedKey = apiKey ? `${apiKey.slice(0, 8)}${'•'.repeat(20)}${apiKey.slice(-4)}` : 'Not connected';

  const handleDisconnect = () => {
    setIsDisconnecting(true);
    setTimeout(() => {
      testpadApi.clearApiKey();
      toast({
        title: 'Disconnected',
        description: 'Your API key has been removed',
      });
      navigate('/');
    }, 500);
  };

  const handleRefreshData = () => {
    // Clear any cached data and navigate to dashboard to refresh
    toast({
      title: 'Refreshing...',
      description: 'Fetching latest data from Testpad',
    });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <AppHeader title="Settings" showSettings={false} />
      
      <main className="container py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Connection
            </CardTitle>
            <CardDescription>
              Manage your Testpad API connection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                API Key
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-muted px-3 py-2 font-mono text-sm">
                  {showApiKey ? apiKey : maskedKey}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                onClick={handleRefreshData}
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh All Data
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="flex-1"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect Account'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              About
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">App Name</p>
                <p className="font-medium">TestPad Admin</p>
              </div>
              <div>
                <p className="text-muted-foreground">Version</p>
                <p className="font-medium">1.0.0</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <h4 className="font-medium">Features</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  View projects, scripts, and runs
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  Track test progress and results
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  Visual analytics dashboard
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  Real-time data refresh
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
      
      <BottomNav />
    </div>
  );
}
