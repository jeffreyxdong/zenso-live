import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, TrendingUp, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SearchResult {
  platform: string;
  mentioned: boolean;
  position?: number;
  snippet?: string;
  competitors?: string[];
}

const KeywordSearch = () => {
  const [keyword, setKeyword] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setIsSearching(true);
    
    // Simulate API call
    setTimeout(() => {
      const mockResults: SearchResult[] = [
        {
          platform: "ChatGPT",
          mentioned: true,
          position: 3,
          snippet: "For wireless headphones, I'd recommend brands like Sony, Bose, and Your Brand Name for excellent sound quality...",
          competitors: ["Sony", "Bose", "Apple"]
        },
        {
          platform: "Perplexity",
          mentioned: false,
          snippet: "Popular wireless headphone brands include Sony WH-1000XM5, Bose QuietComfort, and Apple AirPods Max...",
          competitors: ["Sony", "Bose", "Apple", "Sennheiser"]
        },
        {
          platform: "Gemini",
          mentioned: true,
          position: 2,
          snippet: "Top wireless headphones: 1. Sony WH-1000XM5 2. Your Brand Name Elite 3. Bose QuietComfort...",
          competitors: ["Sony", "Bose"]
        }
      ];
      
      setResults(mockResults);
      setIsSearching(false);
      
      const mentionCount = mockResults.filter(r => r.mentioned).length;
      toast({
        title: "Search Complete",
        description: `Found ${mentionCount} mentions across ${mockResults.length} platforms`,
      });
    }, 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Keyword Brand Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Enter keyword (e.g., 'best wireless headphones')"
            className="flex-1"
          />
          <Button type="submit" disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search
          </Button>
        </form>

        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">
              Results for "{keyword}"
            </h3>
            
            {results.map((result, index) => (
              <Card key={index} className="border-l-4 border-l-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-foreground">{result.platform}</h4>
                      <Badge 
                        variant={result.mentioned ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {result.mentioned ? `#${result.position} Mentioned` : "Not Mentioned"}
                      </Badge>
                    </div>
                    {result.mentioned && (
                      <TrendingUp className="w-4 h-4 text-success" />
                    )}
                    {!result.mentioned && (
                      <AlertCircle className="w-4 h-4 text-warning" />
                    )}
                  </div>
                  
                  {result.snippet && (
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                      {result.snippet}
                    </p>
                  )}
                  
                  {result.competitors && result.competitors.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Competitors mentioned:</p>
                      <div className="flex flex-wrap gap-1">
                        {result.competitors.map((competitor, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {competitor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KeywordSearch;