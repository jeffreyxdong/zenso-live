import { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Target, Bot, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";

interface PromptData {
  id: string;
  content: string;
  brand_name?: string;
  created_at: string;
  visibility_score?: number;
  sentiment_score?: number;
  product_id?: string;
  status?: "active" | "suggested" | "inactive";
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

const PromptDetail = () => {
  const { promptId } = useParams();
  const navigate = useNavigate();
  const { activeStore } = useOutletContext<{ activeStore: { id: string; name: string; website: string; is_active: boolean } | null }>();
  const [prompt, setPrompt] = useState<PromptData | null>(null);
  const [responses, setResponses] = useState<PromptResponse[]>([]);
  const [promptScores, setPromptScores] = useState<PromptScores>({
    visibility_score: null,
    sentiment_score: null,
  });
  const [dailyScores, setDailyScores] = useState<DailyScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (promptId) {
      fetchPromptData();
      
      // Set up real-time subscription for daily scores
      const subscription = supabase
        .channel(`prompt_daily_scores_${promptId}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'prompt_daily_scores',
            filter: `prompt_id=eq.${promptId}`
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
  }, [promptId]);

  const fetchPromptData = async () => {
    if (!promptId) return;
    
    setIsLoading(true);
    try {
      // Fetch prompt data
      const { data: promptData, error: promptError } = await supabase
        .from('user_generated_prompts')
        .select('*')
        .eq('id', promptId)
        .single();

      if (promptError) throw promptError;
      setPrompt({
        ...promptData,
        status: (promptData.status as "active" | "suggested" | "inactive") || "active"
      });

      // Fetch responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('user_generated_prompt_responses')
        .select('id, model_name, response_text, sources, created_at')
        .eq('prompt_id', promptId)
        .order('created_at', { ascending: false });

      if (responsesError) throw responsesError;

      setPromptScores({
        visibility_score: promptData?.visibility_score ?? null,
        sentiment_score: promptData?.sentiment_score ?? null,
      });

      // Fetch daily scores for time series - rolling 7-day window
      const { data: dailyScoresData, error: dailyScoresError } = await supabase
        .from('prompt_daily_scores')
        .select('date, visibility_score, sentiment_score')
        .eq('prompt_id', promptId)
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
    
    return chartData;
  };

  if (isLoading && !prompt) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-muted-foreground">Prompt not found</p>
        <Button onClick={() => navigate('/dashboard?tab=prompts')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/dashboard?tab=prompts')}
          className="hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Prompts
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1 pr-4">
          <h1 className="text-3xl font-bold text-foreground">{prompt.content}</h1>
          {prompt.brand_name && (
            <p className="text-sm text-muted-foreground mt-2">
              Brand: {prompt.brand_name}
            </p>
          )}
        </div>
        <Badge 
          variant={prompt.status === "active" ? "default" : "secondary"}
          className="capitalize"
        >
          {prompt.status}
        </Badge>
      </div>

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
                      width={50}
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
                      type="basis" 
                      dataKey="score" 
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      connectNulls={true}
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
                <Bot className="w-4 h-4" />
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
                      width={50}
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
                        <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
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
                      type="basis" 
                      dataKey="score" 
                      stroke="hsl(var(--success))"
                      strokeWidth={2}
                      connectNulls={true}
                      dot={(props) => {
                        const { payload } = props;
                        if (payload && payload.score !== null) {
                          return <circle 
                            cx={props.cx} 
                            cy={props.cy} 
                            r={3} 
                            fill="hsl(var(--success))" 
                            strokeWidth={2}
                            stroke="hsl(var(--background))"
                          />;
                        }
                        return null;
                      }}
                      activeDot={{ r: 4, fill: "hsl(var(--success))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Responses */}
      {responses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="w-4 h-4" />
              AI Responses ({responses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {responses.map((response) => (
                <div key={response.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{response.model_name}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(response.created_at), 'PPp')}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{response.response_text}</p>
                  {response.sources && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Sources:</span> {JSON.stringify(response.sources).slice(0, 100)}...
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PromptDetail;
