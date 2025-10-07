import React from "react";
import { TrendingUp, Heart, MapPin } from "lucide-react";
import TrendChart from "./TrendChart";

interface ChartData {
  date: string;
  value: number | null;
}

interface ProductChartsProps {
  visibilityData: ChartData[];
  sentimentData: ChartData[];
  positionData: ChartData[];
  visibilityLoading?: boolean;
  sentimentLoading?: boolean;
  positionLoading?: boolean;
}

const ProductCharts = ({ 
  visibilityData, 
  sentimentData, 
  positionData,
  visibilityLoading = false,
  sentimentLoading = false,
  positionLoading = false
}: ProductChartsProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <TrendChart
        title="Visibility Trend"
        icon={TrendingUp}
        data={visibilityData}
        color="hsl(var(--primary))"
        changeText="+15% ↗"
        valueLabel="Visibility"
        isLoading={visibilityLoading}
      />
      
      <TrendChart
        title="Sentiment Trend"
        icon={Heart}
        data={sentimentData}
        color="hsl(var(--success))"
        changeText="+0.8 ↗"
        valueLabel="Sentiment"
        isLoading={sentimentLoading}
      />
      
      <TrendChart
        title="Position Trend"
        icon={MapPin}
        data={positionData}
        color="hsl(var(--primary))"
        changeText="-5 ranks ↗"
        valueLabel="Position"
        isLoading={positionLoading}
      />
    </div>
  );
};

export default ProductCharts;