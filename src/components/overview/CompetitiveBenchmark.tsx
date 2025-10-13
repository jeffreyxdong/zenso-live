import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

  useEffect(() => {
    if (storeId) {
      fetchBenchmarkData();
    }
  }, [storeId]);

  const fetchBenchmarkData = async () => {
    try {
      setIsLoading(true);
      
      // Get your brand's visibility score
      const { data: brandScores, error: brandError } = await supabase
        .from('brand_scores')
        .select('visibility_score')
        .eq('store_id', storeId)
        .order('date', { ascending: false })
        .limit(1);

      if (brandError) throw brandError;

      const yourScore = brandScores?.[0]?.visibility_score || 0;

      // Get competitors with their latest scores
      const today = new Date().toISOString().split('T')[0];
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
        .eq('competitor_scores.date', today)
        .limit(4);

      if (competitorsError) {
        console.error('Error fetching competitors:', competitorsError);
      }

      // If no scores exist for today, trigger scoring
      if (!competitors || competitors.length === 0) {
        console.log('No competitor scores found for today, triggering scoring...');
        
        // Call the edge function to calculate competitor scores
        const { error: scoringError } = await supabase.functions.invoke('score-competitor-visibility', {
          body: { storeId }
        });

        if (scoringError) {
          console.error('Error triggering competitor scoring:', scoringError);
        }

        // Fetch competitors without scores for now (scores will be available after edge function completes)
        const { data: competitorsNoScores } = await supabase
          .from('competitor_analytics')
          .select('id, name')
          .eq('store_id', storeId)
          .limit(4);

        const competitorBenchmarks: BenchmarkData[] = (competitorsNoScores || []).map((comp) => ({
          name: comp.name,
          score: 0, // Will be updated when scores are calculated
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
        // Build benchmark data from competitors with scores
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            Competitive Benchmark
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px]">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5" />
          Competitive Benchmark
        </CardTitle>
      </CardHeader>
      <CardContent>
        {benchmarkData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No competitor data available
          </div>
        ) : (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={benchmarkData} layout="vertical">
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
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  width={120}
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
