import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Target, Bot, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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
          visibility_score: promptData?.visibility_score || null,
          sentiment_score: promptData?.sentiment_score || null,
        });
      }

      // Fetch daily scores for time series
      const { data: dailyScoresData, error: dailyScoresError } = await supabase
        .from('prompt_daily_scores')
        .select('date, visibility_score, sentiment_score')
        .eq('prompt_id', prompt.id)
        .order('date', { ascending: true });

      if (dailyScoresError) {
        console.warn('Could not fetch daily scores:', dailyScoresError);
      } else {
        setDailyScores(dailyScoresData || []);
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

  // Prepare chart data with 5-day projection
  const prepareChartData = (scoreType: 'visibility' | 'sentiment'): ChartDataPoint[] => {
    const today = new Date();
    const futureData: ChartDataPoint[] = [];
    
    // Create data points for the next 5 days
    for (let i = 0; i < 5; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + i);
      const dateString = format(futureDate, 'yyyy-MM-dd');
      
      // Check if we have actual data for this date
      const existingScore = dailyScores.find(score => score.date === dateString);
      const scoreValue = existingScore 
        ? (scoreType === 'visibility' ? existingScore.visibility_score : existingScore.sentiment_score)
        : null;
      
      futureData.push({
        date: dateString,
        score: scoreValue,
        formattedDate: format(futureDate, 'MMM dd'),
        isProjected: !existingScore || scoreValue === null
      });
    }
    
    // Combine historical data with future projections
    const historicalData = dailyScores
      .filter(score => {
        const scoreDate = new Date(score.date);
        return scoreDate < today && (scoreType === 'visibility' ? score.visibility_score !== null : score.sentiment_score !== null);
      })
      .map(score => ({
        date: score.date,
        score: scoreType === 'visibility' ? score.visibility_score! : score.sentiment_score!,
        formattedDate: format(new Date(score.date), 'MMM dd'),
        isProjected: false
      }));
    
    return [...historicalData, ...futureData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const chartConfig = {
    score: {
      label: "Score",
      color: "hsl(var(--primary))",
    },
  };


  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Visibility Score</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-16 flex items-center justify-center text-sm text-muted-foreground">
                    Loading...
                  </div>
                ) : promptScores.visibility_score !== null ? (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {promptScores.visibility_score}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Brand visibility
                    </p>
                  </div>
                ) : (
                  <div className="h-16 flex items-center justify-center text-sm text-muted-foreground">
                    No Data
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sentiment Score</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-16 flex items-center justify-center text-sm text-muted-foreground">
                    Loading...
                  </div>
                ) : promptScores.sentiment_score !== null ? (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {promptScores.sentiment_score}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sentiment tone
                    </p>
                  </div>
                ) : (
                  <div className="h-16 flex items-center justify-center text-sm text-muted-foreground">
                    No Data
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
                   <ChartContainer config={chartConfig} className="h-40">
                     <ResponsiveContainer width="100%" height="100%">
                       <LineChart 
                         data={prepareChartData('visibility')} 
                         margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                       >
                         <XAxis 
                           dataKey="formattedDate" 
                           fontSize={11}
                           tickLine={false}
                           axisLine={false}
                           tick={{ fill: 'hsl(var(--muted-foreground))' }}
                           className="text-xs"
                         />
                         <YAxis 
                           domain={[0, 100]}
                           fontSize={11}
                           tickLine={false}
                           axisLine={false}
                           tick={{ fill: 'hsl(var(--muted-foreground))' }}
                           tickFormatter={(value) => `${value}%`}
                           width={35}
                         />
                          <CartesianGrid 
                            strokeDasharray="3 3" 
                            stroke="hsl(var(--border))" 
                            opacity={0.3}
                            horizontal={true}
                            vertical={false}
                          />
                          <CartesianGrid 
                            strokeDasharray="3 3" 
                            stroke="hsl(var(--border))" 
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
                             if (payload && payload[0]) {
                               return format(new Date(payload[0].payload.date), 'PPP');
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
                   <ChartContainer config={chartConfig} className="h-40">
                     <ResponsiveContainer width="100%" height="100%">
                       <LineChart 
                         data={prepareChartData('sentiment')} 
                         margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                       >
                         <XAxis 
                           dataKey="formattedDate" 
                           fontSize={11}
                           tickLine={false}
                           axisLine={false}
                           tick={{ fill: 'hsl(var(--muted-foreground))' }}
                           className="text-xs"
                         />
                         <YAxis 
                           domain={[0, 100]}
                           fontSize={11}
                           tickLine={false}
                           axisLine={false}
                           tick={{ fill: 'hsl(var(--muted-foreground))' }}
                           tickFormatter={(value) => `${value}%`}
                           width={35}
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
                             if (payload && payload[0]) {
                               return format(new Date(payload[0].payload.date), 'PPP');
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