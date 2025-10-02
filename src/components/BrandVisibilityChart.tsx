import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";

interface ChartData {
  date: string;
  value: number | null;
}

interface BrandVisibilityChartProps {
  storeId: string;
}

const BrandVisibilityChart = ({ storeId }: BrandVisibilityChartProps) => {
  const [visibilityData, setVisibilityData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (storeId) {
      fetchVisibilityData();
      
      // Set up real-time subscription for updates
      const channel = supabase
        .channel('brand-visibility-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'brand_scores'
          },
          () => {
            fetchVisibilityData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [storeId]);

  const fetchVisibilityData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all brand scores for this store
      const { data: brandScores, error } = await supabase
        .from('brand_scores')
        .select('date, visibility_score')
        .eq('store_id', storeId)
        .order('date', { ascending: true });

      if (error) throw error;

      if (!brandScores || brandScores.length === 0) {
        setVisibilityData([]);
        return;
      }

      // Get date range from first score to today
      const firstDate = new Date(brandScores[0].date);
      const endDate = new Date();
      
      // Create a map of scores by date
      const scoresByDate = new Map<string, number>();
      brandScores.forEach((score: any) => {
        if (score.visibility_score !== null) {
          scoresByDate.set(score.date, score.visibility_score);
        }
      });

      // Create chart data for all days from first score to today
      const chartData: ChartData[] = [];
      let currentDate = new Date(firstDate);
      
      while (currentDate <= endDate) {
        const dateKey = format(currentDate, 'yyyy-MM-dd');
        const score = scoresByDate.get(dateKey);
        
        chartData.push({
          date: dateKey,
          value: score ?? null
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      setVisibilityData(chartData);
    } catch (error) {
      console.error('Error fetching visibility data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate trend
  const calculateTrend = () => {
    const validData = visibilityData.filter(d => d.value !== null);
    if (validData.length < 2) return null;
    
    const latest = validData[validData.length - 1].value!;
    const earliest = validData[0].value!;
    const change = latest - earliest;
    
    return {
      value: Math.abs(change),
      isPositive: change >= 0
    };
  };

  const trend = calculateTrend();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Brand Visibility Trend</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Brand Visibility Trend</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visibilityData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                label={{ 
                  value: 'Date', 
                  position: 'insideBottom', 
                  offset: -5, 
                  style: { fontSize: 12, fill: 'hsl(var(--muted-foreground))' }
                }}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                domain={[0, 100]}
                label={{ 
                  value: 'Visibility Score', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fontSize: 12, fill: 'hsl(var(--muted-foreground))' }
                }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                formatter={(value) => [`${value}%`, 'Visibility']}
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <Line 
                type="basis" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-between mt-2 text-sm">
          <span className="text-muted-foreground">
            {visibilityData.length > 0 && `${visibilityData.length} day${visibilityData.length !== 1 ? 's' : ''}`}
          </span>
          {trend && (
            <span className={`font-medium ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
              {trend.isPositive ? '+' : '-'}{trend.value}% {trend.isPositive ? '↗' : '↘'}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BrandVisibilityChart;
