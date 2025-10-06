import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatInTimeZone } from "date-fns-tz";

interface ChartDataPoint {
  date: string;
  value: number | null;
  formattedDate: string;
}

interface BrandVisibilityChartProps {
  storeId: string;
}

const BrandVisibilityChart = ({ storeId }: BrandVisibilityChartProps) => {
  const [visibilityData, setVisibilityData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

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
          (payload) => {
            console.log('Brand scores updated:', payload);
            setIsGenerating(false); // Stop generating state when data arrives
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
      
      // Fetch last 7 days of brand scores for this store (rolling window)
      const { data: brandScores, error } = await supabase
        .from('brand_scores')
        .select('date, visibility_score')
        .eq('store_id', storeId)
        .order('date', { ascending: false })
        .limit(7);

      if (error) throw error;

      // If no data exists, set generating state
      if (!brandScores || brandScores.length === 0) {
        setIsGenerating(true);
      } else {
        setIsGenerating(false);
      }

      // Reverse so oldest date is first
      const reversedScores = (brandScores || []).reverse();
      
      // Prepare chart data using the same logic as PromptViewModal
      const chartData = prepareChartData(reversedScores);
      
      setVisibilityData(chartData);
    } catch (error) {
      console.error('Error fetching visibility data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare chart data to always show 7 days on x-axis, filling gaps with null
  const prepareChartData = (scores: Array<{ date: string; visibility_score: number | null }>): ChartDataPoint[] => {
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Create a lookup map for existing scores
    const scoreMap = new Map<string, number>();
    scores.forEach((score) => {
      if (score.visibility_score !== null) {
        scoreMap.set(score.date, score.visibility_score);
      }
    });

    const chartData: ChartDataPoint[] = [];
    
    // Always generate 7 days for x-axis
    // If we have data, use the date range from our rolling window
    // If we have less than 7 days, extend forward from the latest date
    let startDate: Date;
    if (scores.length > 0) {
      // Use the oldest date from our rolling window as the start
      startDate = new Date(scores[0].date + 'T00:00:00');
    } else {
      // If no data, start from today and go backwards
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
    }

    // Generate exactly 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = formatInTimeZone(date, userTimeZone, "yyyy-MM-dd");
      
      // Check if we have data for this date
      const existingScore = scoreMap.get(dateStr);
      
      chartData.push({
        date: dateStr,
        value: existingScore ?? null,
        formattedDate: formatInTimeZone(date, userTimeZone, "MMM dd"),
      });
    }
    
    return chartData;
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

  if (isGenerating) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Brand Visibility Trend</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <div className="text-center space-y-2">
              <p className="font-medium">Calculating brand visibility...</p>
              <p className="text-sm text-muted-foreground">This may take a moment</p>
            </div>
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
      <CardContent className="pr-6">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visibilityData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
             <XAxis
                dataKey="formattedDate"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{
                  fill: 'hsl(var(--muted-foreground))',
                  dy: 10,
                }}
                interval={0}
                angle={0}
                textAnchor="middle"
                height={40}
                padding={{ left: 0, right: 20 }}   // <-- this adds space for the last tick
              />
              <YAxis
                domain={[0, 100]}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{
                  fill: 'hsl(var(--muted-foreground))',
                  dx: -5,
                }}
                tickFormatter={(value) => `${value}%`}
                width={50}
                orientation="left"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                formatter={(value) => [`${value}%`, 'Visibility']}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0] && payload[0].payload.date) {
                    return new Date(payload[0].payload.date).toLocaleDateString();
                  }
                  return label;
                }}
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
