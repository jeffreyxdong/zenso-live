import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare } from "lucide-react";

interface SourceCount {
  name: string;
  count: number;
}

interface TopSourcesFeedProps {
  storeId: string;
}

const TopSourcesFeed = ({ storeId }: TopSourcesFeedProps) => {
  const [sources, setSources] = useState<SourceCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (storeId) {
      fetchTopSources();
    }
  }, [storeId]);

  const fetchTopSources = async () => {
    try {
      setIsLoading(true);

      // Query prompt_responses for this store via prompts table
      const { data: responses, error } = await supabase
        .from('prompt_responses')
        .select(`
          sources_final,
          prompt_id,
          prompts!inner(store_id)
        `)
        .eq('prompts.store_id', storeId);

      if (error) throw error;

      // Aggregate all sources
      const sourceFrequency: Record<string, number> = {};
      
      responses?.forEach((response: any) => {
        const sourcesArray = response.sources_final;
        if (Array.isArray(sourcesArray)) {
          sourcesArray.forEach((source: string) => {
            if (source && source.trim()) {
              sourceFrequency[source] = (sourceFrequency[source] || 0) + 1;
            }
          });
        }
      });

      // Convert to array, sort by frequency, take top 5
      const topSources = Object.entries(sourceFrequency)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setSources(topSources);
    } catch (error) {
      console.error('Error fetching top sources:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Top Sources / Mentions Feed
          </CardTitle>
          <CardDescription>
            Most common sources that mention your brand across AI responses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Top Sources / Mentions Feed
        </CardTitle>
        <CardDescription>
          Most common sources that mention your brand across AI responses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sources.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No mentions found yet — check back after your next score update.
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((source, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {source.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold">{source.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {source.count} {source.count === 1 ? 'mention' : 'mentions'}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopSourcesFeed;
