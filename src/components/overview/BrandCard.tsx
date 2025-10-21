if (isLoading) {
    return (
      <TooltipProvider>
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-card/80 h-full min-h-[280px]">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
          
          <div className="relative p-6 h-full flex flex-col">
            {storeData ? (
              <>
                <div className="flex items-start justify-between mb-6">
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
                </div>

                <div className="flex-1 flex flex-col items-import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp, TrendingDown, MessageSquare } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  mention_count?: number;
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
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('name, website')
        .eq('id', storeId)
        .single();

      if (storeError) throw storeError;
      setStoreData(store);

      await fetchScoreData();
    } catch (error) {
      console.error('Error fetching brand card data:', error);
      setIsLoading(false);
    }
  };

  const fetchScoreData = async () => {
    try {
      const { data: scores, error: scoresError } = await supabase
        .from('brand_scores')
        .select('visibility_score, date, updated_at, mention_count')
        .eq('store_id', storeId)
        .order('date', { ascending: false })
        .limit(2);

      if (scoresError) throw scoresError;

      if (scores && scores.length > 0) {
        setCurrentScore(scores[0]);
        if (scores.length > 1) {
          setPreviousScore(scores[1].visibility_score);
        }
      } else {
        // No scores found, still set loading to false
        setCurrentScore(null);
      }
    } catch (error) {
      console.error('Error fetching brand score data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!storeData) {
    return (
      <TooltipProvider>
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-card/80 h-full min-h-[280px]">
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

  const displayUrl = storeData.website.replace(/^https?:\/\//, '').replace(/\/$/, '');

  if (isLoading || !currentScore) {
    return (
      <TooltipProvider>
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-card/80 h-full min-h-[280px]">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
          
          <div className="relative p-6 h-full flex flex-col">
            <div className="flex items-start justify-between mb-6">
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
            </div>

            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <div className="text-center space-y-2">
                <p className="font-medium">Calculating brand score...</p>
                <p className="text-sm text-muted-foreground">This may take a moment</p>
              </div>
            </div>

            <div className="pt-3 border-t border-border/30 mt-4">
              <div className="text-xs text-muted-foreground/70 invisible">
                Placeholder
              </div>
            </div>
          </div>
        </Card>
      </TooltipProvider>
    );
  }

  const scoreChange = previousScore !== null 
    ? currentScore.visibility_score - previousScore
    : null;
  const isPositive = scoreChange !== null ? scoreChange > 0 : null;
  const isFlat = scoreChange === 0;
  const isNew = previousScore === 0;
  
  let trendBadge = null;
  if (isNew) {
    trendBadge = {
      icon: "✨",
      text: "New",
      color: "border-blue-500/30 bg-blue-500/10 text-blue-500"
    };
  } else if (scoreChange !== null) {
    if (isFlat) {
      trendBadge = {
        icon: "—",
        text: "Flat",
        color: "border-gray-500/30 bg-gray-500/10 text-gray-500"
      };
    } else if (isPositive) {
      trendBadge = {
        icon: <TrendingUp className="w-3.5 h-3.5" />,
        text: "Trending Up",
        color: "border-green-500/30 bg-green-500/10 text-green-500"
      };
    } else {
      trendBadge = {
        icon: <TrendingDown className="w-3.5 h-3.5" />,
        text: "Trending Down",
        color: "border-red-500/30 bg-red-500/10 text-red-500"
      };
    }
  }

  return (
    <TooltipProvider>
      <Card 
        className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-card/80 h-full min-h-[280px] cursor-pointer transition-all hover:shadow-lg hover:border-primary/30"
        onClick={() => navigate('/dashboard?tab=overview')}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        
        <div className="relative p-6 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
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
            
            {trendBadge ? (
              <Badge 
                variant="outline" 
                className={`px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1.5 ${trendBadge.color}`}
              >
                {trendBadge.icon}
                {trendBadge.text}
              </Badge>
            ) : (
              <Badge 
                variant="outline" 
                className="px-2.5 py-1 text-xs font-medium rounded-full border-muted bg-muted/10 text-muted-foreground"
              >
                New
              </Badge>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col justify-center space-y-4">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Brand Visibility Score</div>
              <div className="text-6xl font-bold text-foreground tabular-nums">
                {currentScore.visibility_score}
              </div>
            </div>
            
            {scoreChange !== null ? (
              <div className="flex items-center gap-2">
                {isFlat ? (
                  <span className="text-lg font-medium text-gray-500">
                    — No change since yesterday
                  </span>
                ) : (
                  <>
                    <span className={`text-lg font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                      {isPositive ? '↑' : '↓'} {isPositive ? '+' : ''}{scoreChange} since yesterday
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div className="text-base text-muted-foreground italic">
                Track changes starting tomorrow
              </div>
            )}

            {currentScore.mention_count !== undefined && currentScore.mention_count > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                <span className="text-base">
                  Mentions: <span className="font-semibold text-foreground">{currentScore.mention_count}</span>
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
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