import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Target, Bot, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";

interface PromptViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: {
    id: string;
    content: string;
    brand_name?: string;
    created_at: string;
    visibility_score?: number;
    sentiment_score?: number;
  };
}

interface PromptScores {
  visibility_score: number | null;
  sentiment_score: number | null;
}

interface PromptResponse {
  id: string;
  model_name: string;
  response_text: string;
  sources: any;
  created_at: string;
}

interface DailyScore {
  date: string;
  visibility_score: number | null;
  sentiment_score: number | null;
}

interface ChartDataPoint {
  date: string;
  score: number | null;
  formattedDate: string;
  isProjected?: boolean;
}

export const PromptViewModal = ({ isOpen, onClose, prompt }: PromptViewModalProps) => {
  const [responses, setResponses] = useState<PromptResponse[]>([]);
  const [promptScores, setPromptScores] = useState<PromptScores>({
    visibility_score: null,
    sentiment_score: null,
  });
  const [dailyScores, setDailyScores] = useState<DailyScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && prompt.id) {
      fetchPromptData();
      
      // Set up real-time subscription for daily scores
      const subscription = supabase
        .channel(`prompt_daily_scores_${prompt.id}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'prompt_daily_scores',
            filter: `prompt_id=eq.${prompt.id}`
          }, 
          (payload) => {
            console.log('New daily score added:', payload);
            // Refresh the data when a new daily score is inserted
            fetchPromptData();
          }
        )
        .subscribe();

      // Cleanup subscription on unmount or when prompt changes
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isOpen, prompt.id]);

  const fetchPromptData = async () => {
    setIsLoading(true);
    try {
      // Fetch responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('prompt_responses')
        .select('id, model_name, response_text, sources, created_at')
        .eq('prompt_id', prompt.id)
        .order('created_at', { ascending: false });

      if (responsesError) throw responsesError;

      // Fetch prompt scores from the prompts table
      const { data: promptData, error: promptError } = await supabase
        .from('prompts')
        .select('visibility_score, sentiment_score')
        .eq('id', prompt.id)
        .single();

      if (promptError) {
        console.warn('Could not fetch prompt scores:', promptError);
      } else {
        setPromptScores({
          visibility_score: promptData?.visibility_score ?? null,
          sentiment_score: promptData?.sentiment_score ?? null,
        });
      }

      // Fetch daily scores for time series - rolling 7-day window
      const { data: dailyScoresData, error: dailyScoresError } = await supabase
        .from('prompt_daily_scores')
        .select('date, visibility_score, sentiment_score')
        .eq('prompt_id', prompt.id)
        .order('date', { ascending: false })
        .limit(7);

      if (dailyScoresError) {
        console.warn('Could not fetch daily scores:', dailyScoresError);
      } else {
        // Reverse the array so oldest date appears first for chart rendering
        const reversedData = (dailyScoresData || []).reverse();
        setDailyScores(reversedData);
      }

      setResponses(responsesData || []);
    } catch (error: any) {
      console.error('Error fetching prompt data:', error);
      toast({
        title: "Error",
        description: "Failed to load prompt data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const chartConfig = {
    score: {
      label: "Score",
      color: "hsl(var(--primary))",
    },
  };

  // Prepare chart data to always show 7 days on x-axis, filling gaps with null
  const prepareChartData = (
    scoreType: "visibility" | "sentiment"
  ): ChartDataPoint[] => {
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    console.log("Chart Debug:", {
      userTimeZone,
      dailyScoresCount: dailyScores.length,
      scoreType,
      existingDates: dailyScores.map((s) => s.date),
    });

    // Create a lookup map for existing scores
    const scoreMap = new Map();
    dailyScores.forEach((score) => {
      const scoreValue = scoreType === "visibility" 
        ? score.visibility_score 
        : score.sentiment_score;
      
      if (scoreValue !== null) {
        scoreMap.set(score.date, scoreValue);
      }
    });

    const chartData: ChartDataPoint[] = [];
    
    // Always generate 7 days for x-axis
    // If we have data, use the date range from our rolling window
    // If we have less than 7 days, extend forward from the latest date
    let startDate: Date;
    if (dailyScores.length > 0) {
      // Use the oldest date from our rolling window as the start
      startDate = new Date(dailyScores[0].date + 'T00:00:00');
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
        score: existingScore ?? null,
        formattedDate: formatInTimeZone(date, userTimeZone, "MMM dd"),
        isProjected: false,
      });
    }
    
    console.log("Generated chart data:", chartData);
    return chartData;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Prompt Analysis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Prompt Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Prompt Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">{prompt.content}</p>
                {prompt.brand_name && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Brand:</span> {prompt.brand_name}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  Created {format(new Date(prompt.created_at), 'PPP')}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prompt Scores */}
          <div className="grid grid-cols-2 gap-6">
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary/5 to-primary/10">
              <div className="absolute inset-0 bg-grid-pattern opacity-5" />
              <CardHeader className="relative pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  Visibility Score
                </CardTitle>
              </CardHeader>
              <CardContent className="relative pt-2">
                {isLoading ? (
                  <div className="h-20 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : promptScores.visibility_score !== null && promptScores.visibility_score !== undefined ? (
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <div className="text-3xl font-bold text-primary">
                        {promptScores.visibility_score}
                      </div>
                      <div className="text-lg font-medium text-primary/70">%</div>
                    </div>
                    <div className="w-full bg-primary/10 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${promptScores.visibility_score}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Brand visibility rating
                    </p>
                  </div>
                ) : (
                  <div className="h-20 flex flex-col items-center justify-center space-y-2">
                    <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">?</span>
                    </div>
                    <span className="text-sm text-muted-foreground">No Data Available</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-success/5 to-success/10">
              <div className="absolute inset-0 bg-grid-pattern opacity-5" />
              <CardHeader className="relative pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-success">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-success" />
                  </div>
                  Sentiment Score
                </CardTitle>
              </CardHeader>
              <CardContent className="relative pt-2">
                {isLoading ? (
                  <div className="h-20 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-success/20 border-t-success rounded-full animate-spin" />
                  </div>
                ) : promptScores.sentiment_score !== null && promptScores.sentiment_score !== undefined ? (
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <div className="text-3xl font-bold text-success">
                        {promptScores.sentiment_score}
                      </div>
                      <div className="text-lg font-medium text-success/70">%</div>
                    </div>
                    <div className="w-full bg-success/10 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-success to-success/80 h-2 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${promptScores.sentiment_score}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Sentiment analysis rating
                    </p>
                  </div>
                ) : (
                  <div className="h-20 flex flex-col items-center justify-center space-y-2">
                    <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">?</span>
                    </div>
                    <span className="text-sm text-muted-foreground">No Data Available</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Time Series Charts */}
          {dailyScores.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Visibility Score Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Visibility Score Over Time
                  </CardTitle>
                </CardHeader>
                 <CardContent>
                   <ChartContainer config={chartConfig} className="h-64 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart 
                          data={prepareChartData('visibility')} 
                          margin={{ top: 10, right: 20, left: -10, bottom: 10 }}
                        >
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
                            width={50} // may need to increase slightly so labels don't get cut off
                            orientation="left"
                          />
                           <CartesianGrid 
                             strokeDasharray="1 1" 
                             stroke="hsl(var(--muted-foreground))" 
                             opacity={0.3}
                             horizontal={true}
                             vertical={false}
                           />
                          <defs>
                           <linearGradient id="visibilityGradient" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                             <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                           </linearGradient>
                         </defs>
                          <ChartTooltip 
                            content={<ChartTooltipContent />}
                            labelFormatter={(value, payload) => {
                              if (payload && payload[0] && payload[0].payload.date) {
                                const date = new Date(payload[0].payload.date + 'T00:00:00');
                                return format(date, 'PPP');
                              }
                              return value;
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="score" 
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            connectNulls={false}
                            dot={(props) => {
                              const { payload } = props;
                              if (payload && payload.score !== null) {
                                return <circle 
                                  cx={props.cx} 
                                  cy={props.cy} 
                                  r={3} 
                                  fill="hsl(var(--primary))" 
                                  strokeWidth={2}
                                  stroke="hsl(var(--background))"
                                />;
                              }
                              return null;
                            }}
                            activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
                          />
                       </LineChart>
                     </ResponsiveContainer>
                   </ChartContainer>
                 </CardContent>
              </Card>

              {/* Sentiment Score Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Sentiment Score Over Time
                  </CardTitle>
                </CardHeader>
                 <CardContent>
                   <ChartContainer config={chartConfig} className="h-64 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart 
                          data={prepareChartData('sentiment')} 
                          margin={{ top: 10, right: 20, left: -10, bottom: 10 }}
                        >
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
                            width={50} // may need to increase slightly so labels don't get cut off
                            orientation="left"
                          />
                            <CartesianGrid 
                              strokeDasharray="1 1" 
                              stroke="hsl(var(--muted-foreground))" 
                              opacity={0.3}
                              horizontal={true}
                              vertical={false}
                            />
                          <defs>
                            <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <ChartTooltip 
                            content={<ChartTooltipContent />}
                            labelFormatter={(value, payload) => {
                              if (payload && payload[0] && payload[0].payload.date) {
                                const date = new Date(payload[0].payload.date + 'T00:00:00');
                                return format(date, 'PPP');
                              }
                              return value;
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="score" 
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            connectNulls={false}
                            dot={(props) => {
                              const { payload } = props;
                              if (payload && payload.score !== null) {
                                return <circle 
                                  cx={props.cx} 
                                  cy={props.cy} 
                                  r={3} 
                                  fill="hsl(var(--primary))" 
                                  strokeWidth={2}
                                  stroke="hsl(var(--background))"
                                />;
                              }
                              return null;
                            }}
                            activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
                          />
                       </LineChart>
                     </ResponsiveContainer>
                   </ChartContainer>
                 </CardContent>
              </Card>
            </div>
          )}

          {/* Responses Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">AI Responses</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading responses...</div>
              ) : responses.length > 0 ? (
                <div className="space-y-4">
                  {responses.map((response) => (
                    <div key={response.id} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-4 h-4" />
                        <Badge variant="outline" className="text-xs">
                          {response.model_name.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(response.created_at), 'PPp')}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{response.response_text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No responses available</div>
              )}
            </CardContent>
          </Card>

        </div>
      </DialogContent>
    </Dialog>
  );
};