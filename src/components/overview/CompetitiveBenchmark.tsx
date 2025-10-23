import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatInTimeZone } from "date-fns-tz";

interface BenchmarkData {
  name: string;
  score: number;
  isYourBrand: boolean;
}

interface CompetitiveBenchmarkProps {
  storeId: string;
  brandName: string;
}

const CompetitiveBenchmark = ({ storeId, brandName }: CompetitiveBenchmarkProps) => {
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScoring, setIsScoring] = useState(false);
  const [hasCompetitors, setHasCompetitors] = useState(false);

  useEffect(() => {
    if (storeId) {
      checkCompetitorsAndFetch();
    }
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel('competitor-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'competitor_analytics',
          filter: `store_id=eq.${storeId}`
        },
        () => {
          checkCompetitorsAndFetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId]);

  const checkCompetitorsAndFetch = async () => {
    try {
      const { data: competitors, error } = await supabase
        .from('competitor_analytics')
        .select('id')
        .eq('store_id', storeId)
        .limit(1);

      if (error) throw error;

      if (!competitors || competitors.length === 0) {
        setHasCompetitors(false);
        setIsLoading(false);
        return;
      }

      setHasCompetitors(true);
      await fetchBenchmarkData();
    } catch (error) {
      console.error('Error checking competitors:', error);
      setIsLoading(false);
    }
  };

  const handleManualRescore = async () => {
    try {
      setIsScoring(true);
      toast.info("Starting competitor scoring...");

      const { data, error } = await supabase.functions.invoke('score-competitor-visibility', {
        body: { storeId }
      });

      if (error) throw error;

      toast.success(`Scored ${data?.scoresCalculated || 0} competitors successfully`);
      
      await fetchBenchmarkData();
    } catch (error) {
      console.error('Error scoring competitors:', error);
      toast.error('Failed to score competitors');
    } finally {
      setIsScoring(false);
    }
  };

  const fetchBenchmarkData = async () => {
    try {
      setIsLoading(true);
      
      const { data: brandScores, error: brandError } = await supabase
        .from('brand_scores')
        .select('visibility_score')
        .eq('store_id', storeId)
        .order('date', { ascending: false })
        .limit(1);

      if (brandError) throw brandError;

      const yourScore = brandScores?.[0]?.visibility_score || 0;

      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const today = formatInTimeZone(new Date(), userTimeZone, "yyyy-MM-dd");
      const { data: competitors, error: competitorsError } = await supabase
        .from('competitor_analytics')
        .select(`
          id,
          name,
          competitor_scores!inner(
            visibility_score,
            date
          )
        `)
        .eq('store_id', storeId)
        .eq('competitor_scores.date', today);

      if (competitorsError) {
        console.error('Error fetching competitors:', competitorsError);
      }

      if (!competitors || competitors.length === 0) {
        console.log('No competitor scores found for today, triggering scoring...');
        
        const { error: scoringError } = await supabase.functions.invoke('score-competitor-visibility', {
          body: { storeId }
        });

        if (scoringError) {
          console.error('Error triggering competitor scoring:', scoringError);
        }

        const { data: competitorsNoScores } = await supabase
          .from('competitor_analytics')
          .select('id, name')
          .eq('store_id', storeId);

        const competitorBenchmarks: BenchmarkData[] = (competitorsNoScores || []).map((comp) => ({
          name: comp.name,
          score: 0,
          isYourBrand: false
        }));

        const allBenchmarks = [
          {
            name: brandName || 'Your Brand',
            score: yourScore,
            isYourBrand: true
          },
          ...competitorBenchmarks
        ].sort((a, b) => b.score - a.score);

        setBenchmarkData(allBenchmarks);
      } else {
        const competitorBenchmarks: BenchmarkData[] = competitors.map((comp: any) => ({
          name: comp.name,
          score: comp.competitor_scores[0]?.visibility_score || 0,
          isYourBrand: false
        }));

        const allBenchmarks = [
          {
            name: brandName || 'Your Brand',
            score: yourScore,
            isYourBrand: true
          },
          ...competitorBenchmarks
        ].sort((a, b) => b.score - a.score);

        setBenchmarkData(allBenchmarks);
      }
    } catch (error) {
      console.error('Error fetching benchmark data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasCompetitors && !isLoading) {
    return (
      <Card className="h-full flex flex-col flex-1">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="truncate">Competitive Benchmark</CardTitle>
              <CardDescription className="break-words">Compare your brand visibility against key competitors</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[250px] text-center px-4 space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Waiting for competitor analysis to complete...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This data will appear once competitors are identified
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col flex-1">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="truncate">Competitive Benchmark</CardTitle>
              <CardDescription className="break-words">Compare your brand visibility against key competitors</CardDescription>
            </div>
            <Button 
              onClick={handleManualRescore} 
              disabled={isScoring || isLoading}
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${isScoring ? 'animate-spin' : ''}`} />
              {isScoring ? 'Scoring...' : 'Rescore'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px]">
            <p className="text-muted-foreground">Loading benchmark data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col flex-1">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="truncate">Competitive Benchmark</CardTitle>
            <CardDescription className="break-words">Compare your brand visibility against key competitors</CardDescription>
          </div>
          <Button 
            onClick={handleManualRescore} 
            disabled={isScoring || isLoading}
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${isScoring ? 'animate-spin' : ''}`} />
            {isScoring ? 'Scoring...' : 'Rescore'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {benchmarkData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No competitor data available
          </div>
        ) : (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={benchmarkData} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  type="number" 
                  domain={[0, 100]}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis 
                  type="category" 
                  dataKey="name"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  width={180}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  formatter={(value) => [`${value}%`, 'Visibility Score']}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {benchmarkData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.isYourBrand ? 'hsl(var(--primary))' : 'hsl(var(--muted))'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompetitiveBenchmark;