import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, TrendingUp, Globe, BarChart3, Eye, Heart, MapPin, FileText, Database, Cpu, Target } from "lucide-react";
import { PromptsTab } from "@/components/PromptsTab";
import MyProducts from "@/components/MyProducts";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get("tab") || "overview";
  });
  const [activeStore, setActiveStore] = useState<{ id: string; name: string; website: string; is_active: boolean } | null>(null);
  const [companyName, setCompanyName] = useState("BrandRefs");

  // Update activeTab when URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    setActiveTab(urlParams.get("tab") || "overview");
  }, [location.search]);

  // Load company profile data
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("company_name")
          .eq("user_id", session.user.id)
          .single();
        
        if (profileData?.company_name) {
          setCompanyName(profileData.company_name);
        }
      }
    };
    
    loadProfile();
  }, []);

  // Protect route: redirect unauthenticated users and ensure onboarding complete
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/", { replace: true });
        return;
      }
      // Defer profile check to avoid deadlocks
      setTimeout(async () => {
        const { data, error } = await supabase
          .from("stores")
          .select("id")
          .eq("user_id", session.user.id)
          .limit(1);
        if (error || !data || data.length === 0) {
          navigate("/onboarding", { replace: true });
        }
      }, 0);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate("/", { replace: true });
        return;
      }
      const { data, error } = await supabase
        .from("stores")
        .select("id")
        .eq("user_id", session.user.id)
        .limit(1);
      if (error || !data || data.length === 0) {
        navigate("/onboarding", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="space-y-6">
      {/* Main tabs for different content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Top metrics tabs */}
          <Tabs defaultValue="visibility" className="space-y-6">
            <TabsList className="grid w-fit grid-cols-3">
              <TabsTrigger value="visibility" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Visibility
              </TabsTrigger>
              <TabsTrigger value="sentiment" className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Sentiment
              </TabsTrigger>
              <TabsTrigger value="position" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Position
              </TabsTrigger>
            </TabsList>

            <TabsContent value="visibility" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart Area */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Stats Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Brand Visibility Score
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-primary">87</div>
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <TrendingUp className="w-3 h-3" />
                          +12% from last month
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Product Mentions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">156</div>
                        <div className="text-xs text-muted-foreground">
                          Across 3 AI platforms
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Monthly Growth
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">+23%</div>
                        <div className="text-xs text-muted-foreground">
                          AI visibility increase
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Main Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>AI Visibility Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 bg-muted/50 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">Visibility chart will go here</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Sidebar - Top Performing Products */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Top Performing Products</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[
                          { name: "Wireless Headphones", score: 92, change: "+8%" },
                          { name: "Smart Watch", score: 87, change: "+12%" },
                          { name: "Laptop Stand", score: 83, change: "+5%" },
                          { name: "USB-C Cable", score: 79, change: "+3%" },
                        ].map((product, index) => (
                          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div>
                              <div className="font-medium text-sm">{product.name}</div>
                              <div className="text-xs text-muted-foreground">Score: {product.score}</div>
                            </div>
                            <div className="text-xs text-green-600 font-medium">{product.change}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">AI Platforms</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { name: "ChatGPT", mentions: 78, color: "bg-green-500" },
                          { name: "Claude", mentions: 45, color: "bg-orange-500" },
                          { name: "Gemini", mentions: 33, color: "bg-blue-500" },
                        ].map((platform, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${platform.color}`}></div>
                            <div className="flex-1 text-sm">{platform.name}</div>
                            <div className="text-sm font-medium">{platform.mentions}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sentiment" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Overall Sentiment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">Positive</div>
                    <div className="text-xs text-muted-foreground">
                      8.4/10 average score
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Positive Mentions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">142</div>
                    <div className="text-xs text-green-600">
                      +18% this month
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Improvement Areas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">3</div>
                    <div className="text-xs text-muted-foreground">
                      Products to optimize
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="h-64 bg-muted/50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Sentiment analysis chart will go here</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="position" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Average Position
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">2.1</div>
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <TrendingUp className="w-3 h-3" />
                      Improved by 0.3 positions
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Top 3 Positions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">68%</div>
                    <div className="text-xs text-muted-foreground">
                      Of all mentions
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Best Performer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">#1</div>
                    <div className="text-xs text-muted-foreground">
                      Wireless Headphones
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="h-64 bg-muted/50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Position tracking chart will go here</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {activeTab === "products-overview" && (
        <MyProducts 
          activeStore={activeStore} 
          onProductClick={(productId) => navigate(`/product/${productId}`)}
        />
      )}

      {activeTab === "brand-overview" && (
        <div className="space-y-6">
          {/* Brand AI Visibility Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Brand Mention Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">73%</div>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  +8% from last month
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Position
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">2.4</div>
                <div className="text-xs text-muted-foreground">
                  In AI recommendations
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Sentiment Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">8.6/10</div>
                <div className="text-xs text-green-600">
                  Positive sentiment
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Brand Visibility Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Brand AI Visibility Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted/50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Brand visibility chart will go here</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Brand Mentions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Brand Mentions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    platform: "ChatGPT",
                    query: "best ecommerce tools for small business",
                    position: 2,
                    sentiment: "Positive",
                    date: "2 hours ago"
                  },
                  {
                    platform: "Claude",
                    query: "reliable online store solutions",
                    position: 1,
                    sentiment: "Very Positive", 
                    date: "5 hours ago"
                  },
                  {
                    platform: "Gemini",
                    query: "ecommerce platform comparison",
                    position: 3,
                    sentiment: "Neutral",
                    date: "1 day ago"
                  }
                ].map((mention, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="space-y-1">
                      <div className="font-medium">{mention.query}</div>
                      <div className="text-sm text-muted-foreground">{mention.platform} • {mention.date}</div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-muted-foreground text-xs">Position</div>
                        <div className="font-medium">#{mention.position}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground text-xs">Sentiment</div>
                        <Badge variant={mention.sentiment === "Very Positive" || mention.sentiment === "Positive" ? "default" : "secondary"}>
                          {mention.sentiment}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "brand-competitors" && (
        <Card>
          <CardHeader>
            <CardTitle>Brand Competitor Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Top Competitor Brand", visibility: "85%", mentions: "456", avgPosition: "1.8", sentiment: "8.2" },
                { name: "Second Place Brand", visibility: "78%", mentions: "389", avgPosition: "2.1", sentiment: "7.9" },
                { name: `${companyName} (You)`, visibility: "73%", mentions: "342", avgPosition: "2.4", sentiment: "8.6" },
                { name: "Third Competitor", visibility: "68%", mentions: "298", avgPosition: "2.9", sentiment: "7.5" },
              ].map((competitor, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm">{index + 1}</span>
                    <span className={`font-medium ${competitor.name.includes('You') ? 'text-primary' : ''}`}>
                      {competitor.name}
                    </span>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div className="text-center">
                      <div className="text-muted-foreground text-xs">Visibility</div>
                      <div className="font-medium">{competitor.visibility}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground text-xs">Mentions</div>
                      <div className="font-medium">{competitor.mentions}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground text-xs">Avg Position</div>
                      <div className="font-medium">{competitor.avgPosition}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground text-xs">Sentiment</div>
                      <div className="font-medium">{competitor.sentiment}/10</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "prompts" && <PromptsTab activeStore={activeStore} />}
    </div>
  );
};

export default Dashboard;