import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe } from "lucide-react";

interface TopSourcesFeedProps {
  storeId: string;
}

interface SourceCount {
  name: string;
  count: number;
}

const TopSourcesFeed: React.FC<TopSourcesFeedProps> = ({ storeId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [sourceCounts, setSourceCounts] = useState<SourceCount[]>([]);

  useEffect(() => {
    const fetchSourceData = async () => {
      setIsLoading(true);
      try {
        // Query prompt_responses joined with prompts to filter by store_id
        const { data, error } = await supabase
          .from("prompt_responses")
          .select("sources_final, prompts!inner(store_id)")
          .eq("prompts.store_id", storeId);

        if (error) {
          console.error("Error fetching prompt responses:", error);
          setIsLoading(false);
          return;
        }

        // Aggregate sources from sources_final arrays
        const sourceMap = new Map<string, number>();
        
        data?.forEach((response: any) => {
          const sourcesFinal = response.sources_final;
          if (Array.isArray(sourcesFinal)) {
            sourcesFinal.forEach((source: any) => {
              // Handle different possible formats of source data
              const sourceName = typeof source === 'string' 
                ? source 
                : source?.name || source?.source || 'Unknown';
              
              if (sourceName && sourceName !== 'Unknown') {
                sourceMap.set(sourceName, (sourceMap.get(sourceName) || 0) + 1);
              }
            });
          }
        });

        // Convert to array, sort by frequency, and take top 5
        const sortedSources = Array.from(sourceMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setSourceCounts(sortedSources);
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (storeId) {
      fetchSourceData();
    }
  }, [storeId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Sources / Mentions Feed</CardTitle>
          <CardDescription>Most common sources that mention your brand across AI responses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sourceCounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Sources / Mentions Feed</CardTitle>
          <CardDescription>Most common sources that mention your brand across AI responses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Globe className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              No mentions found yet — check back after your next score update.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Sources / Mentions Feed</CardTitle>
        <CardDescription>Most common sources that mention your brand across AI responses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sourceCounts.map((source, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="font-semibold">{source.name}</span>
              </div>
              <span className="text-muted-foreground text-sm">{source.count} mentions</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TopSourcesFeed;
