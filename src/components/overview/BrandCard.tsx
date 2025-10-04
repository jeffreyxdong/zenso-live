import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface BrandCardProps {
  storeId: string;
}

export function BrandCard({ storeId }: BrandCardProps) {
  // Mock data - will be replaced with real data later
  const mockData = {
    brandName: "Ferrari",
    siteUrl: "www.ferrari.com",
    visibilityScore: 87,
    date: new Date(),
    scoreChange: 5.2,
  };

  return (
    <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-card/80">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      
      <div className="relative p-6">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Brand Info */}
          <div className="space-y-3 flex-1">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {mockData.brandName}
              </h2>
              <a 
                href={`https://${mockData.siteUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors group"
              >
                <span>{mockData.siteUrl}</span>
                <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            </div>
            
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>Last updated:</span>
              <time dateTime={mockData.date.toISOString()}>
                {format(mockData.date, "MMMM d, yyyy 'at' h:mm a")}
              </time>
            </div>
          </div>

          {/* Right: Visibility Score */}
          <div className="flex flex-col items-end gap-2">
            <Badge 
              variant="outline" 
              className="px-3 py-1 text-xs font-medium border-primary/20 bg-primary/5 text-primary"
            >
              Daily Score
            </Badge>
            
            <div className="text-right">
              <div className="text-4xl font-bold text-foreground tabular-nums">
                {mockData.visibilityScore}
              </div>
              
              <div className="flex items-center justify-end gap-1 mt-1">
                <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                <span className="text-sm font-medium text-green-500">
                  +{mockData.scoreChange}%
                </span>
                <span className="text-xs text-muted-foreground ml-1">vs yesterday</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
