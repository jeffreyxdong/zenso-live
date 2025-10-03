import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatInTimeZone } from "date-fns-tz";

interface ChartDataPoint {
  date: string;
  value: number | null;
  formattedDate: string;
}

interface BrandVisibilityOverviewProps {
  storeId: string;
}

type TimeRange = 'day' | '7days' | '30days' | '90days';

const BrandVisibilityOverview = ({ storeId }: BrandVisibilityOverviewProps) => {
  const [visibilityData, setVisibilityData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [currentScore, setCurrentScore] = useState<number | null>(null);

  useEffect(() => {
    if (storeId) {
      fetchVisibilityData();
      
      const channel = supabase
        .channel('brand-visibility-overview')
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
  }, [storeId, timeRange]);

  const getDaysCount = (range: TimeRange): number => {
    switch (range) {
      case 'day': return 1;
      case '7days': return 7;
      case '30days': return 30;
      case '90days': return 90;
      default: return 7;
    }
  };

  const fetchVisibilityData = async () => {
    try {
      setIsLoading(true);
      
      const daysCount = getDaysCount(timeRange);
      
      const { data: brandScores, error } = await supabase
        .from('brand_scores')
        .select('date, visibility_score')
        .eq('store_id', storeId)
        .order('date', { ascending: false })
        .limit(daysCount);

      if (error) throw error;

      const reversedScores = (brandScores || []).reverse();
      
      if (reversedScores.length > 0) {
        const latestScore = brandScores?.[0]?.visibility_score || null;
        setCurrentScore(latestScore);
      }
      
      const chartData = prepareChartData(reversedScores);
      setVisibilityData(chartData);
    } catch (error) {
      console.error('Error fetching visibility data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const prepareChartData = (scores: Array<{ date: string; visibility_score: number | null }>): ChartDataPoint[] => {
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const scoreMap = new Map<string, number>();
    
    scores.forEach((score) => {
      if (score.visibility_score !== null) {
        scoreMap.set(score.date, score.visibility_score);
      }
    });

    const chartData: ChartDataPoint[] = [];
    const daysCount = getDaysCount(timeRange);
    
    let startDate: Date;
    if (scores.length > 0) {
      startDate = new Date(scores[0].date + 'T00:00:00');
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - (daysCount - 1));
    }

    for (let i = 0; i < daysCount; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = formatInTimeZone(date, userTimeZone, "yyyy-MM-dd");
      const existingScore = scoreMap.get(dateStr);
      
      chartData.push({
        date: dateStr,
        value: existingScore ?? null,
        formattedDate: formatInTimeZone(date, userTimeZone, "MMM dd"),
      });
    }
    
    return chartData;
  };

  const calculateTrend = () => {
    const validData = visibilityData.filter(d => d.value !== null);
    if (validData.length < 2) return null;
    
    const latest = validData[validData.length - 1].value!;
    const earliest = validData[0].value!;
    const change = ((latest - earliest) / earliest) * 100;
    
    return {
      value: Math.abs(change).toFixed(1),
      isPositive: change >= 0
    };
  };

  const trend = calculateTrend();

  const timeRangeLabels = {
    'day': 'Past Day',
    '7days': 'Past 7 Days',
    '30days': 'Past 30 Days',
    '90days': 'Past 90 Days'
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Brand Visibility Score</CardTitle>
            {currentScore !== null && (
              <div className="mt-2">
                <div className="text-3xl font-bold text-primary">{currentScore}</div>
                {trend && (
                  <div className={`text-sm ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
                    {trend.isPositive ? '+' : '-'}{trend.value}% from start of period
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant={timeRange === 'day' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setTimeRange('day')}
            >
              1D
            </Button>
            <Button 
              variant={timeRange === '7days' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setTimeRange('7days')}
            >
              7D
            </Button>
            <Button 
              variant={timeRange === '30days' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setTimeRange('30days')}
            >
              30D
            </Button>
            <Button 
              variant={timeRange === '90days' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setTimeRange('90days')}
            >
              90D
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[250px] flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="h-[250px]">
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
                  interval={timeRange === '90days' ? 'preserveStartEnd' : 0}
                  angle={timeRange === '30days' || timeRange === '90days' ? -45 : 0}
                  textAnchor={timeRange === '30days' || timeRange === '90days' ? 'end' : 'middle'}
                  height={60}
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
        )}
        <div className="mt-2 text-sm text-muted-foreground">
          {timeRangeLabels[timeRange]}
        </div>
      </CardContent>
    </Card>
  );
};

export default BrandVisibilityOverview;
