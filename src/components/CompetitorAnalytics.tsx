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
  marketPosition: string;
  keyDifferentiator: string;
}

interface CompetitorAnalyticsProps {
  brandName: string;
  website: string;
  storeId: string;
}

export const CompetitorAnalytics = ({ brandName, website, storeId }: CompetitorAnalyticsProps) => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadCompetitors = async () => {
    if (!brandName) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-competitors', {
        body: { brandName, website }
      });

      if (error) throw error;

      if (data?.competitors) {
        setCompetitors(data.competitors);
      } else {
        throw new Error('No competitor data received');
      }
    } catch (error: any) {
      console.error('Error loading competitors:', error);
      toast({
        title: "Error",
        description: "Failed to load competitor analytics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (brandName) {
      loadCompetitors();
    }
  }, [brandName, storeId]);

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
          onClick={loadCompetitors}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
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
                    className={getMarketPositionColor(competitor.marketPosition)}
                  >
                    {competitor.marketPosition}
                  </Badge>
                  {competitor.keyDifferentiator && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      <span className="truncate max-w-[200px]">
                        {competitor.keyDifferentiator}
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
              onClick={loadCompetitors}
              className="mt-2"
            >
              Load competitor analytics
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
