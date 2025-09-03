import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, Globe, BarChart3, Plus, Settings } from "lucide-react";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-foreground">LLMrefs</h1>
              <Badge variant="secondary" className="text-xs">
                Pro Plan
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
              <Button size="sm">
                <Plus className="w-4 h-4" />
                Add Project
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats Overview */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    LLMrefs Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">87</div>
                  <div className="flex items-center gap-1 text-xs text-success">
                    <TrendingUp className="w-3 h-3" />
                    +12% from last month
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    AI Mentions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">324</div>
                  <div className="text-xs text-muted-foreground">
                    Across 8 AI platforms
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Source URLs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">42</div>
                  <div className="text-xs text-muted-foreground">
                    Referenced sources
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Recent AI Searches
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    query: "best video editing software",
                    platform: "ChatGPT",
                    mentioned: true,
                    time: "2 hours ago"
                  },
                  {
                    query: "online video editor tools",
                    platform: "Claude",
                    mentioned: true,
                    time: "4 hours ago"
                  },
                  {
                    query: "free video editing apps",
                    platform: "Gemini",
                    mentioned: false,
                    time: "6 hours ago"
                  }
                ].map((search, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-foreground">
                        "{search.query}"
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {search.platform} • {search.time}
                      </div>
                    </div>
                    <Badge variant={search.mentioned ? "default" : "secondary"} className="text-xs">
                      {search.mentioned ? "Mentioned" : "Not mentioned"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="w-5 h-5" />
                  AI Platform Coverage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "ChatGPT", coverage: 92, color: "bg-green-500" },
                  { name: "Claude", coverage: 87, color: "bg-blue-500" },
                  { name: "Gemini", coverage: 76, color: "bg-purple-500" },
                  { name: "Perplexity", coverage: 68, color: "bg-orange-500" },
                  { name: "Copilot", coverage: 54, color: "bg-teal-500" }
                ].map((platform, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">{platform.name}</span>
                      <span className="text-muted-foreground">{platform.coverage}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`${platform.color} h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${platform.coverage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Search className="w-4 h-4" />
                  Run New Search
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="w-4 h-4" />
                  View Analytics
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Globe className="w-4 h-4" />
                  Check Competitors
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;