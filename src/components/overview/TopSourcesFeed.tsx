import React, { useEffect, useState } from "react";
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

        // Convert to array, sort by frequency, and take top 10
        const sortedSources = Array.from(sourceMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

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
      <Card className="min-h-[380px]">
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
      <Card className="min-h-[380px]">
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
    <Card className="h-full min-h-[380px] flex flex-col">
      <CardHeader>
        <CardTitle>Top Sources / Mentions Feed</CardTitle>
        <CardDescription>Most common sources that mention your brand across AI responses</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex flex-wrap gap-3">
          {sourceCounts.map((source, index) => {
            const name = source.name.replace(/\.(com|org|net|io|co|edu|gov|ai)$/i, "");
            
            return (
              <div
                key={index}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${source.name}&sz=32`}
                    alt={source.name}
                    className="w-5 h-5"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `<span class='text-sm font-semibold text-primary'>${name.charAt(0).toUpperCase()}</span>`;
                      }
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm capitalize">{name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TopSourcesFeed;
