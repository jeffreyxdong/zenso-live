import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle, CheckCircle2, Eye, RefreshCw } from "lucide-react";

interface Mention {
  id: string;
  platform: string;
  query: string;
  mentioned: boolean;
  position?: number;
  timestamp: string;
  snippet: string;
  category: string;
}

const BrandMentions = () => {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    const mockMentions: Mention[] = [
      {
        id: "1",
        platform: "ChatGPT",
        query: "best wireless headphones under $200",
        mentioned: true,
        position: 2,
        timestamp: "2 hours ago",
        snippet: "For budget-friendly options, consider TechStore Pro X2, which offers excellent sound quality and noise cancellation...",
        category: "Electronics"
      },
      {
        id: "2",
        platform: "Perplexity",
        query: "top rated bluetooth speakers 2024",
        mentioned: false,
        timestamp: "4 hours ago",
        snippet: "Popular Bluetooth speakers include JBL Charge 5, Sony SRS-XB43, and Bose SoundLink...",
        category: "Electronics"
      },
      {
        id: "3",
        platform: "Gemini",
        query: "sustainable fashion brands",
        mentioned: true,
        position: 1,
        timestamp: "6 hours ago",
        snippet: "Leading sustainable fashion brands: 1. TechStore Eco 2. Patagonia 3. Everlane...",
        category: "Fashion"
      },
      {
        id: "4",
        platform: "ChatGPT",
        query: "home office setup essentials",
        mentioned: true,
        position: 4,
        timestamp: "8 hours ago",
        snippet: "Essential home office items include a good desk, ergonomic chair, monitor, and TechStore's wireless charging station...",
        category: "Home & Office"
      },
      {
        id: "5",
        platform: "Perplexity",
        query: "best gaming accessories 2024",
        mentioned: false,
        timestamp: "12 hours ago",
        snippet: "Top gaming accessories include Razer peripherals, SteelSeries headsets, and Corsair keyboards...",
        category: "Gaming"
      }
    ];
    setMentions(mockMentions);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  };

  const stats = {
    totalMentions: mentions.filter(m => m.mentioned).length,
    totalQueries: mentions.length,
    avgPosition: mentions
      .filter(m => m.mentioned && m.position)
      .reduce((acc, m) => acc + (m.position || 0), 0) / 
      mentions.filter(m => m.mentioned && m.position).length || 0
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Brand Mentions</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalMentions}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Queries Tracked</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalQueries}</p>
              </div>
              <Eye className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Position</p>
                <p className="text-2xl font-bold text-foreground">#{stats.avgPosition.toFixed(1)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Mentions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Recent Brand Mentions
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {mentions.map((mention) => (
            <div key={mention.id} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {mention.platform}
                    </Badge>
                    <Badge 
                      variant={mention.mentioned ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {mention.mentioned ? `#${mention.position} Mentioned` : "Not Mentioned"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {mention.category}
                    </Badge>
                  </div>
                  
                  <h4 className="font-medium text-foreground mb-2">
                    "{mention.query}"
                  </h4>
                  
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                    {mention.snippet}
                  </p>
                  
                  <p className="text-xs text-muted-foreground">
                    {mention.timestamp}
                  </p>
                </div>
                
                <div className="ml-4">
                  {mention.mentioned ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-warning" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default BrandMentions;