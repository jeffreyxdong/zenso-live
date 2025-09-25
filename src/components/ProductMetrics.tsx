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

  const getPositionColor = (position: number) => {
    if (position <= 3) return "bg-success text-success-foreground";
    if (position <= 7) return "bg-yellow-500 text-white";
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
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-2xl font-bold">{metrics.visibility}</div>
              <div className="text-sm text-muted-foreground">Score: {metrics.visibilityScore}/100</div>
            </div>
            <Badge className={getVisibilityColor(metrics.visibility)}>
              {metrics.visibility}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            How often your product appears in AI responses
          </p>
        </CardContent>
      </Card>

      {/* Sentiment */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sentiment Score</CardTitle>
          <Heart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-2xl font-bold">{metrics.sentiment}</div>
              <div className="text-sm text-muted-foreground">Score: {metrics.sentimentScore}/100</div>
            </div>
            <Badge className={getSentimentColor(metrics.sentiment)}>
              {metrics.sentiment}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Overall sentiment in AI recommendations
          </p>
        </CardContent>
      </Card>

      {/* Position */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Position</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-2xl font-bold">#{metrics.position}</div>
              <div className="text-sm text-muted-foreground">Score: {metrics.positionScore}/100</div>
            </div>
            <Badge className={getPositionColor(metrics.position)}>
              Rank {metrics.position}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Average ranking position in AI responses
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductMetrics;