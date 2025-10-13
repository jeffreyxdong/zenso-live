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

  // Helper function to extract clean brand name
  const getCleanBrandName = (sourceName: string): string => {
    // Remove common domain extensions
    return sourceName
      .replace(/\.(com|ai|org|net|io|co|dev)$/i, '')
      .trim();
  };

  // Helper function to get favicon URL
  const getFaviconUrl = (sourceName: string): string => {
    // Map common AI platforms to their domains
    const domainMap: Record<string, string> = {
      'chatgpt': 'openai.com',
      'openai': 'openai.com',
      'perplexity': 'perplexity.ai',
      'gemini': 'gemini.google.com',
      'claude': 'claude.ai',
      'anthropic': 'anthropic.com',
      'meta': 'meta.ai',
      'llama': 'meta.ai',
      'bing': 'bing.com',
      'copilot': 'copilot.microsoft.com',
      'bard': 'google.com',
    };

    const lowerName = sourceName.toLowerCase();
    const domain = domainMap[lowerName] || `${lowerName}.com`;
    
    // Use Google's favicon service
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Sources / Mentions Feed</CardTitle>
        <CardDescription>Most common sources that mention your brand across AI responses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sourceCounts.map((source, index) => {
            const cleanName = getCleanBrandName(source.name);
            const faviconUrl = getFaviconUrl(source.name);
            
            return (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    <img 
                      src={faviconUrl} 
                      alt={`${cleanName} favicon`}
                      className="w-5 h-5 object-contain"
                      onError={(e) => {
                        // Fallback to Globe icon if favicon fails to load
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`;
                      }}
                    />
                  </div>
                  <span className="font-semibold">{cleanName}</span>
                </div>
                <span className="text-muted-foreground text-sm">{source.count} mentions</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TopSourcesFeed;
