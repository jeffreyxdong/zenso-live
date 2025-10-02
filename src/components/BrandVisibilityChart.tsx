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
            table: 'prompt_daily_scores'
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
      
      // Get last 7 days of data
      const endDate = new Date();
      const startDate = subDays(endDate, 6);
      
      // Fetch daily scores for brand prompts associated with this store
      const { data: dailyScores, error } = await supabase
        .from('prompt_daily_scores')
        .select(`
          date,
          visibility_score,
          prompts!inner(store_id)
        `)
        .eq('prompts.store_id', storeId)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) throw error;

      // Aggregate scores by date (average across all prompts)
      const scoresByDate = new Map<string, number[]>();
      
      dailyScores?.forEach((score: any) => {
        const dateKey = score.date;
        if (!scoresByDate.has(dateKey)) {
          scoresByDate.set(dateKey, []);
        }
        if (score.visibility_score !== null) {
          scoresByDate.get(dateKey)!.push(score.visibility_score);
        }
      });

      // Create chart data with all 7 days
      const chartData: ChartData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = format(subDays(endDate, i), 'yyyy-MM-dd');
        const scores = scoresByDate.get(date);
        const avgScore = scores && scores.length > 0
          ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
          : null;
        
        chartData.push({
          date,
          value: avgScore
        });
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
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 10 }}
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 10 }}
                domain={[0, 100]}
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
          <span className="text-muted-foreground">Last 7 days</span>
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
