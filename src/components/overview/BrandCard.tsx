import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface BrandCardProps {
  storeId: string;
}

export function BrandCard({ storeId }: BrandCardProps) {
  const navigate = useNavigate();
  
  // Mock data - will be replaced with real data later
  const mockData = {
    brandName: "Ferrari",
    siteUrl: "www.ferrari.com",
    visibilityScore: 87,
    date: new Date(),
    scoreChange: 5.2,
    sparklineData: [75, 78, 82, 80, 85, 84, 87], // 7-day history
  };

  const isPositive = mockData.scoreChange > 0;
  const trendDirection = Math.abs(mockData.scoreChange) > 3 ? (isPositive ? "up" : "down") : "stable";
  
  // Generate SVG path for sparkline
  const generateSparkline = (data: number[]) => {
    const width = 120;
    const height = 40;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  };

  return (
    <TooltipProvider>
      <Card 
        className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-card/80 h-full cursor-pointer transition-all hover:shadow-lg hover:border-primary/30"
        onClick={() => navigate('/dashboard?tab=overview')}
      >
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        
        {/* Sparkline background */}
        <svg 
          className="absolute right-0 top-0 w-32 h-full opacity-[0.08]" 
          viewBox="0 0 120 200"
          preserveAspectRatio="none"
        >
          <path
            d={generateSparkline(mockData.sparklineData)}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary"
          />
        </svg>
        
        <div className="relative p-6 h-full flex flex-col">
          {/* Header with badge */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {mockData.brandName}
              </h2>
              <a 
                href={`https://${mockData.siteUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors group"
              >
                <span>{mockData.siteUrl}</span>
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
            <div className="text-6xl font-bold text-foreground tabular-nums leading-none mb-3">
              {mockData.visibilityScore}
            </div>
            
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className={`flex items-center gap-1.5 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="text-base font-medium">
                  {isPositive ? '+' : ''}{mockData.scoreChange}%
                </span>
              </div>
              <span className="text-sm text-muted-foreground font-normal">vs yesterday</span>
            </div>

            {trendDirection !== "stable" && (
              <Badge 
                variant="outline" 
                className={`text-xs px-2 py-0.5 ${
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
              <time dateTime={mockData.date.toISOString()}>
                {format(mockData.date, "MMM d, yyyy 'at' h:mm a")}
              </time>
            </div>
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
}
