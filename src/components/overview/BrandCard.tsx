import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BrandCardProps {
  storeId: string;
}

interface StoreData {
  name: string;
  website: string;
}

interface BrandScoreData {
  visibility_score: number;
  date: string;
  updated_at: string;
}

export function BrandCard({ storeId }: BrandCardProps) {
  const navigate = useNavigate();
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [currentScore, setCurrentScore] = useState<BrandScoreData | null>(null);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (storeId) {
      fetchStoreData();
      
      const channel = supabase
        .channel('brand-card-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'brand_scores',
            filter: `store_id=eq.${storeId}`
          },
          () => {
            fetchScoreData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [storeId]);

  const fetchStoreData = async () => {
    try {
      // Fetch store data first
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('name, website')
        .eq('id', storeId)
        .single();

      if (storeError) throw storeError;
      setStoreData(store);

      // Then fetch scores
      fetchScoreData();
    } catch (error) {
      console.error('Error fetching brand card data:', error);
      setIsLoading(false);
    }
  };

  const fetchScoreData = async () => {
    try {
      setIsLoading(true);

      // Fetch latest 2 brand scores to calculate change
      const { data: scores, error: scoresError } = await supabase
        .from('brand_scores')
        .select('visibility_score, date, updated_at')
        .eq('store_id', storeId)
        .order('date', { ascending: false })
        .limit(2);

      if (scoresError) throw scoresError;

      if (scores && scores.length > 0) {
        setCurrentScore(scores[0]);
        if (scores.length > 1) {
          setPreviousScore(scores[1].visibility_score);
        }
      }
    } catch (error) {
      console.error('Error fetching brand score data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state - show header with spinning loader
  if (!storeData) {
    return (
      <TooltipProvider>
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-card/80 h-full min-h-[340px]">
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
          
          <div className="relative p-6 h-full flex flex-col">
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </Card>
      </TooltipProvider>
    );
  }

  // Clean website URL for display
  const displayUrl = storeData.website.replace(/^https?:\/\//, '').replace(/\/$/, '');

  if (isLoading || !currentScore) {
    return (
      <TooltipProvider>
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-card/80 h-full min-h-[340px]">
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
          
          <div className="relative p-6 h-full flex flex-col">
            {/* Header with badge */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  {storeData.name}
                </h2>
                <a 
                  href={storeData.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors group"
                >
                  <span>{displayUrl}</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className="px-3 py-1.5 text-xs font-medium border-primary/30 bg-primary/10 text-primary rounded-full cursor-help"
                  >
                    Daily Score
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p className="text-sm">Brand visibility change compared to the previous day, based on AI mentions.</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Loading spinner */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <div className="text-center space-y-2">
                <p className="font-medium">Calculating brand score...</p>
                <p className="text-sm text-muted-foreground">This may take a moment</p>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-border/30 mt-4">
              <div className="text-xs text-muted-foreground/70 invisible">
                Placeholder for alignment
              </div>
            </div>
          </div>
        </Card>
      </TooltipProvider>
    );
  }

  // Calculate percentage change only if we have previous data
  const scoreChange = previousScore !== null 
    ? ((currentScore.visibility_score - previousScore) / previousScore) * 100 
    : null;
  const isPositive = scoreChange !== null ? scoreChange > 0 : true;
  const trendDirection = scoreChange !== null && Math.abs(scoreChange) > 3 ? (isPositive ? "up" : "down") : "stable";

  return (
    <TooltipProvider>
      <Card 
        className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-card/80 h-full min-h-[340px] cursor-pointer transition-all hover:shadow-lg hover:border-primary/30"
        onClick={() => navigate('/dashboard?tab=overview')}
      >
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        
        <div className="relative p-6 h-full flex flex-col">
          {/* Header with badge */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {storeData.name}
              </h2>
              <a 
                href={storeData.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors group"
              >
                <span>{displayUrl}</span>
                <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            </div>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className="px-3 py-1.5 text-xs font-medium border-primary/30 bg-primary/10 text-primary rounded-full cursor-help"
                >
                  Daily Score
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-sm">Brand visibility change compared to the previous day, based on AI mentions.</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Score Section */}
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="text-7xl font-bold text-foreground tabular-nums leading-none mb-4">
              {currentScore.visibility_score}
            </div>
            
            <div className="flex items-center justify-center gap-2 mb-2">
              {scoreChange !== null ? (
                <>
                  <div className={`flex items-center gap-1.5 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositive ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                    <span className="text-xl font-medium">
                      {isPositive ? '+' : ''}{scoreChange.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-base text-muted-foreground font-normal">vs yesterday</span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="text-xl font-medium">N/A</span>
                  </div>
                  <span className="text-base text-muted-foreground font-normal">vs yesterday</span>
                </>
              )}
            </div>

            {trendDirection !== "stable" && (
              <Badge 
                variant="outline" 
                className={`text-sm px-2.5 py-1 ${
                  trendDirection === "up" 
                    ? 'border-green-500/30 bg-green-500/10 text-green-500' 
                    : 'border-red-500/30 bg-red-500/10 text-red-500'
                }`}
              >
                {trendDirection === "up" ? '↑ Trending' : '↓ Declining'}
              </Badge>
            )}
          </div>

          {/* Footer with timestamp */}
          <div className="text-xs text-muted-foreground/70 pt-3 border-t border-border/30 mt-4">
            <div className="flex items-center gap-1.5">
              <span>Last updated:</span>
              <time dateTime={currentScore.updated_at}>
                {format(new Date(currentScore.updated_at), "MMM d, yyyy 'at' h:mm a")}
              </time>
            </div>
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
}
