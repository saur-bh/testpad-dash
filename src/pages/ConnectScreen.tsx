import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { testpadApi } from '@/lib/testpad-api';
import { toast } from '@/hooks/use-toast';

export default function ConnectScreen() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    setIsValidating(true);
    setError(null);

    testpadApi.setApiKey(apiKey.trim());

    try {
      const isValid = await testpadApi.validateApiKey();
      
      if (isValid) {
        toast({
          title: 'Connected!',
          description: 'Successfully connected to Testpad API',
        });
        navigate('/dashboard');
      } else {
        testpadApi.clearApiKey();
        setError('Invalid API key. Please check and try again.');
      }
    } catch (err: any) {
      testpadApi.clearApiKey();
      if (err.status === 401) {
        setError('Invalid API key. Please check and try again.');
      } else if (err.status === 429) {
        setError(`Rate limit exceeded. Please wait ${err.retryAfter || 60} seconds.`);
      } else {
        setError(err.message || 'Failed to connect. Please try again.');
      }
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Key className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">TestPad Admin</CardTitle>
            <CardDescription className="mt-2">
              Connect your Testpad account to view and manage your tests
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="Enter your Testpad API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handleConnect}
            disabled={isValidating}
          >
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              'Connect to Testpad'
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Your API key is stored securely in your browser's local storage
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
