import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { LucideIcon } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";

interface ChartData {
  date: string;
  value: number | null;
}

interface TrendChartProps {
  title: string;
  icon: LucideIcon;
  data: ChartData[];
  color: string;
  changeText: string;
  valueLabel: string;
  isLoading?: boolean;
}

const TrendChart = ({ title, icon: Icon, data, color, changeText, valueLabel, isLoading }: TrendChartProps) => {
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[200px] space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <div className="text-center">
              <p className="text-sm font-medium">Generating {title}...</p>
              <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
            </div>
          </div>
        ) : (
          <>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(dateStr) => {
                      const [year, month, day] = dateStr.split('-').map(Number);
                      const date = new Date(year, month - 1, day);
                      return formatInTimeZone(date, userTimeZone, "MMM dd");
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
                    formatter={(value) => [`${value}%`, valueLabel]}
                    labelFormatter={(dateStr) => {
                      const [year, month, day] = dateStr.split('-').map(Number);
                      const date = new Date(year, month - 1, day);
                      return formatInTimeZone(date, userTimeZone, "MMM dd, yyyy");
                    }}
                  />
                  <Line 
                    type="basis" 
                    dataKey="value" 
                    stroke={color}
                    strokeWidth={2}
                    dot={{ fill: color, strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between mt-2 text-sm">
              <span className="text-muted-foreground">Last 7 days</span>
              <span className="text-success font-medium">{changeText}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TrendChart;
