import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ExternalLink, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Competitor {
  name: string;
  website: string;
  description: string;
  market_position: string;
  key_differentiator: string;
}

interface CompetitorAnalyticsProps {
  storeId: string;
}

export const CompetitorAnalytics = ({ storeId }: CompetitorAnalyticsProps) => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load competitors from database
  const loadCompetitors = async () => {
    if (!storeId) return;

    try {
      const { data, error } = await supabase
        .from('competitor_analytics')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // If no data, set loading state (will show generating UI)
      if (!data || data.length === 0) {
        setIsLoading(true);
      } else {
        setCompetitors(data);
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Error loading competitors:', error);
      setIsLoading(false);
    }
  };

  // Trigger competitor analysis
  const generateCompetitors = async () => {
    if (!storeId) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('analyze-competitors', {
        body: { storeId }
      });

      if (error) throw error;

      console.log('Competitor analysis started');
    } catch (error: any) {
      console.error('Error generating competitors:', error);
      toast({
        title: "Error",
        description: "Failed to generate competitor analytics",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  // Set up realtime subscription and polling fallback
  useEffect(() => {
    if (!storeId) return;

    // Load initial data
    loadCompetitors();

    // Set up polling fallback (every 3 seconds while loading)
    const pollInterval = setInterval(() => {
      if (isLoading) {
        loadCompetitors();
      }
    }, 3000);

    // Subscribe to changes
    const channel = supabase
      .channel('competitor-analytics-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'competitor_analytics',
          filter: `store_id=eq.${storeId}`
        },
        (payload) => {
          console.log('New competitor added:', payload);
          setIsLoading(false);
          loadCompetitors();
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [storeId, isLoading]);

  const getMarketPositionColor = (position: string) => {
    const pos = position.toLowerCase();
    if (pos.includes('premium')) return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
    if (pos.includes('mid')) return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
    if (pos.includes('economy')) return 'bg-green-500/10 text-green-700 dark:text-green-400';
    return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Competitor Analytics</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={generateCompetitors}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <div className="text-center space-y-2">
              <p className="font-medium">Analyzing competitors...</p>
              <p className="text-sm text-muted-foreground">This may take a moment</p>
            </div>
          </div>
        ) : competitors.length > 0 ? (
          <div className="space-y-4">
            {competitors.map((competitor, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{competitor.name}</h4>
                      {competitor.website && (
                        <a
                          href={competitor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {competitor.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="secondary"
                    className={getMarketPositionColor(competitor.market_position)}
                  >
                    {competitor.market_position}
                  </Badge>
                  {competitor.key_differentiator && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      <span className="truncate max-w-[200px]">
                        {competitor.key_differentiator}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No competitor data available</p>
            <Button
              variant="link"
              size="sm"
              onClick={generateCompetitors}
              className="mt-2"
            >
              Generate competitor analytics
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
