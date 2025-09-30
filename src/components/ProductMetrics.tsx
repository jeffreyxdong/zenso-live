import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Heart, MapPin } from "lucide-react";

interface Metrics {
  visibility: "High" | "Medium" | "Low";
  sentiment: "Positive" | "Neutral" | "Negative";
  position: number;
  visibilityScore: number;
  sentimentScore: number;
  positionScore: number;
}

interface ProductMetricsProps {
  metrics: Metrics;
}

const ProductMetrics = ({ metrics }: ProductMetricsProps) => {
  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case "High": return "bg-success text-success-foreground";
      case "Medium": return "bg-yellow-500 text-white";
      case "Low": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "Positive": return "bg-success text-success-foreground";
      case "Neutral": return "bg-muted text-muted-foreground";
      case "Negative": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-success text-success-foreground";
    if (score >= 60) return "bg-yellow-500 text-white";
    return "bg-destructive text-destructive-foreground";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Visibility */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">AI Visibility</CardTitle>
          <Eye className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <div className="text-5xl font-bold tracking-tight">{metrics.visibilityScore}</div>
              <div className="text-2xl text-muted-foreground font-light">/100</div>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    metrics.visibilityScore >= 80 ? 'bg-success' : 
                    metrics.visibilityScore >= 60 ? 'bg-yellow-500' : 
                    'bg-destructive'
                  }`}
                  style={{ width: `${metrics.visibilityScore}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                How often your product appears in AI responses
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sentiment */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sentiment Score</CardTitle>
          <Heart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <div className="text-5xl font-bold tracking-tight">{metrics.sentimentScore}</div>
              <div className="text-2xl text-muted-foreground font-light">/100</div>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    metrics.sentimentScore >= 80 ? 'bg-success' : 
                    metrics.sentimentScore >= 60 ? 'bg-yellow-500' : 
                    'bg-destructive'
                  }`}
                  style={{ width: `${metrics.sentimentScore}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Overall sentiment in AI recommendations
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Position */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Position Score</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <div className="text-5xl font-bold tracking-tight">{metrics.positionScore}</div>
              <div className="text-2xl text-muted-foreground font-light">/100</div>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    metrics.positionScore >= 80 ? 'bg-success' : 
                    metrics.positionScore >= 60 ? 'bg-yellow-500' : 
                    'bg-destructive'
                  }`}
                  style={{ width: `${metrics.positionScore}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                How well your product ranks in AI responses
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductMetrics;