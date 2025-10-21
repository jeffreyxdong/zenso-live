import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toZonedTime, format as formatTz } from "date-fns-tz";

interface ChartDataPoint {
  date: string;
  value: number | null;
}

interface BrandVisibilityChartProps {
  storeId: string;
  testDate?: string; // Optional test date for debugging (format: YYYY-MM-DD)
}

// Helper to convert UTC date to user's local date string
const getLocalDateString = (utcDate: Date, userTimeZone: string): string => {
  const zonedDate = toZonedTime(utcDate, userTimeZone);
  return formatTz(zonedDate, "yyyy-MM-dd", { timeZone: userTimeZone });
};

const generateScoreHistoryFromData = (
  scores: any[],
  storeCreatedAt: string,
  testDate?: string,
) => {
  // Get user's timezone
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Convert store creation date to user's local timezone
  const storeCreationDateUTC = new Date(storeCreatedAt);
  const storeCreationDate = toZonedTime(storeCreationDateUTC, userTimeZone);
  storeCreationDate.setHours(0, 0, 0, 0);

  // Calculate the end of the initial 7-day window (creation date + 6 days)
  const initialWindowEnd = new Date(storeCreationDate);
  initialWindowEnd.setDate(storeCreationDate.getDate() + 6);
  const initialWindowEndStr = formatTz(initialWindowEnd, "yyyy-MM-dd", { timeZone: userTimeZone });

  // Sort scores by date
  const sorted = [...(scores || [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Create a map of date -> score for quick lookup
  const scoreMap = new Map<string, number>();
  let latestDataDate = "";

  sorted.forEach((score) => {
    if (score.visibility_score != null) {
      // For brand_scores, the date field is already a date string (not timestamp)
      scoreMap.set(score.date, score.visibility_score);
      if (score.date > latestDataDate) {
        latestDataDate = score.date;
      }
    }
  });

  const result = [];

  // If we DON'T have data beyond the initial 7-day window, show fixed window (creation + 6 days)
  // Otherwise, show rolling window of most recent 7 days
  if (latestDataDate <= initialWindowEndStr || !latestDataDate) {
    // Show from store creation date + 6 future days in user's timezone
    // Always show full 7-day window on X-axis, even if data is missing
    for (let i = 0; i < 7; i++) {
      const date = new Date(storeCreationDate);
      date.setDate(storeCreationDate.getDate() + i);
      const dateKey = formatTz(date, "yyyy-MM-dd", { timeZone: userTimeZone });

      result.push({
        date: dateKey,
        value: scoreMap.get(dateKey) ?? null, // null for dates without data
      });
    }
  } else {
    // Show most recent 7 days of actual data (rolling window)
    const allDates = Array.from(scoreMap.keys()).sort();
    const recentDates = allDates.slice(-7);

    recentDates.forEach((dateKey) => {
      result.push({
        date: dateKey,
        value: scoreMap.get(dateKey) ?? null,
      });
    });
  }

  return result;
};

const BrandVisibilityChart = ({ storeId, testDate }: BrandVisibilityChartProps) => {
  const [visibilityData, setVisibilityData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [storeCreatedAt, setStoreCreatedAt] = useState<string>("");

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
            table: 'brand_scores',
            filter: `store_id=eq.${storeId}`
          },
          (payload) => {
            console.log('Brand scores updated:', payload);
            setIsGenerating(false);
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
      
      // Fetch store creation date
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('created_at')
        .eq('id', storeId)
        .single();

      if (storeError) throw storeError;

      const createdAt = testDate || storeData.created_at;
      setStoreCreatedAt(createdAt);
      
      // Fetch brand scores for this store
      const { data: brandScores, error } = await supabase
        .from('brand_scores')
        .select('date, visibility_score')
        .eq('store_id', storeId)
        .order('date', { ascending: true });

      if (error) throw error;

      // Check if we should be generating
      const hasValidScores = brandScores && brandScores.some(s => s.visibility_score != null && s.visibility_score > 0);
      setIsGenerating(!hasValidScores);

      // Generate chart data using the same logic as PDP
      const chartData = generateScoreHistoryFromData(brandScores || [], createdAt, testDate);
      
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
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (isLoading) {
    return (
      <Card className="min-h-[340px]">
        <CardHeader>
          <CardTitle>Brand Visibility Trend</CardTitle>
          <CardDescription>7-day rolling visibility score tracking brand mentions</CardDescription>
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
      <Card className="min-h-[340px]">
        <CardHeader>
          <CardTitle>Brand Visibility Trend</CardTitle>
          <CardDescription>7-day rolling visibility score tracking brand mentions</CardDescription>
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
    <Card className="min-h-[340px] flex flex-col">
      <CardHeader>
        <CardTitle>Brand Visibility Trend</CardTitle>
        <CardDescription>7-day rolling visibility score tracking brand mentions</CardDescription>
      </CardHeader>
      <CardContent className="pr-6 flex flex-col">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visibilityData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 10 }}
                tickFormatter={(dateStr) => {
                  const [year, month, day] = dateStr.split('-').map(Number);
                  const date = new Date(year, month - 1, day);
                  return formatTz(date, "MMM dd", { timeZone: userTimeZone });
                }}
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
                labelFormatter={(dateStr) => {
                  const [year, month, day] = dateStr.split('-').map(Number);
                  const date = new Date(year, month - 1, day);
                  return formatTz(date, 'MMM dd, yyyy', { timeZone: userTimeZone });
                }}
              />
              <Line 
                type="monotone" 
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
