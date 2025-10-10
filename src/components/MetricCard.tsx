import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  icon: LucideIcon;
  score: number;
  description: string;
  isLoading?: boolean;
}

const MetricCard = ({ title, icon: Icon, score, description, isLoading }: MetricCardProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-success";
    if (score >= 60) return "bg-yellow-500";
    return "bg-destructive";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <div className="text-center">
              <p className="text-sm font-medium">Generating {title}...</p>
              <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold tracking-tight tabular-nums">{score}</div>
              <div className="text-lg text-muted-foreground font-light">/100</div>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${getScoreColor(score)}`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;
