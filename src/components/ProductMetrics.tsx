import React from "react";
import { Eye, Heart, MapPin } from "lucide-react";
import MetricCard from "./MetricCard";

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
  visibilityLoading?: boolean;
  sentimentLoading?: boolean;
  positionLoading?: boolean;
}

const ProductMetrics = ({ 
  metrics, 
  visibilityLoading = false, 
  sentimentLoading = false, 
  positionLoading = false 
}: ProductMetricsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <MetricCard
        title="AI Visibility"
        icon={Eye}
        score={metrics.visibilityScore}
        description="How often your product appears in AI responses"
        isLoading={visibilityLoading}
      />
      
      <MetricCard
        title="Sentiment Score"
        icon={Heart}
        score={metrics.sentimentScore}
        description="Overall sentiment in AI recommendations"
        isLoading={sentimentLoading}
      />
      
      <MetricCard
        title="Position Score"
        icon={MapPin}
        score={metrics.positionScore}
        description="How well your product ranks in AI responses"
        isLoading={positionLoading}
      />
    </div>
  );
};

export default ProductMetrics;