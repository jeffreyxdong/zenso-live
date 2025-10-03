import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, TrendingUp, Globe, BarChart3, Eye, Heart, MapPin, FileText, Database, Cpu, Target, Sparkles, CheckCircle, RefreshCw } from "lucide-react";
import { PromptsTab } from "@/components/PromptsTab";
import MyProducts from "@/components/MyProducts";
import ProductMetrics from "@/components/ProductMetrics";
import BrandVisibilityChart from "@/components/BrandVisibilityChart";
import { useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeStore } = useOutletContext<{ activeStore: { id: string; name: string; website: string; is_active: boolean } | null }>();
  const [activeTab, setActiveTab] = useState(() => {
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get("tab") || "overview";
  });
  const [companyName, setCompanyName] = useState("BrandRefs");
  const [brandVisibility, setBrandVisibility] = useState<number | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [brandRecommendations, setBrandRecommendations] = useState<any[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  // Update activeTab when URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    setActiveTab(urlParams.get("tab") || "overview");
  }, [location.search]);

  // Load brand analytics when brand-overview tab is active
  useEffect(() => {
    if (activeTab === "brand-overview" && activeStore?.id) {
      loadBrandAnalytics();
      loadBrandRecommendations();
    }
  }, [activeTab, activeStore?.id]);

  // Set up realtime subscription for brand recommendations
  useEffect(() => {
    if (!activeStore?.id) return;

    const channel = supabase
      .channel('brand-recommendations-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'brand_recommendations',
          filter: `store_id=eq.${activeStore.id}`
        },
        (payload) => {
          console.log('New recommendation added:', payload);
          loadBrandRecommendations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeStore?.id]);

  const loadBrandRecommendations = async () => {
    if (!activeStore?.id) return;
    
    try {
      setIsLoadingRecommendations(true);
      const { data, error } = await supabase
        .from('brand_recommendations')
        .select('*')
        .eq('store_id', activeStore.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setBrandRecommendations(data || []);
    } catch (error) {
      console.error('Error loading brand recommendations:', error);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const handleGenerateBrandRecommendations = async () => {
    if (!activeStore?.id) return;
    
    try {
      setIsLoadingRecommendations(true);
      
      const { data, error } = await supabase.functions.invoke('generate-brand-recommendations', {
        body: { storeId: activeStore.id }
      });

      if (error) throw error;
      
      console.log('Generated brand recommendations:', data);
      
      // Reload recommendations
      await loadBrandRecommendations();
    } catch (error) {
      console.error('Error generating brand recommendations:', error);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const loadBrandAnalytics = async (forceRescore = false) => {
    if (!activeStore?.id) return;
    
    try {
      setIsLoadingAnalytics(true);
      
      // Check if we already have brand analytics (skip if forcing rescore)
      if (!forceRescore) {
        const { data: existingPrompts } = await supabase
          .from('brand_prompts')
          .select('visibility_score')
          .eq('store_id', activeStore.id);

        if (existingPrompts && existingPrompts.length > 0) {
          // Calculate average from existing data
          const scores = existingPrompts.filter(p => p.visibility_score !== null);
          if (scores.length > 0) {
            const avg = Math.round(
              scores.reduce((sum, p) => sum + (p.visibility_score || 0), 0) / scores.length
            );
            setBrandVisibility(avg);
            setIsLoadingAnalytics(false);
            return;
          }
        }
      }

      // Generate new analytics
      const { data, error } = await supabase.functions.invoke('brand-analytics', {
        body: { storeId: activeStore.id }
      });

      if (error) {
        console.error('Error calling brand-analytics:', error);
        throw error;
      }
      
      if (data?.averageVisibility !== undefined) {
        setBrandVisibility(data.averageVisibility);
      }
    } catch (error) {
      console.error('Error loading brand analytics:', error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

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
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Score & Trend */}
          <div className="space-y-6">
            {/* Brand AI Visibility Score */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>AI Visibility Score</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadBrandAnalytics(true)}
                  disabled={isLoadingAnalytics}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
                  Rescore
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    {isLoadingAnalytics ? (
                      <>
                        <div className="text-6xl font-bold text-muted-foreground mb-2">
                          ...
                        </div>
                        <p className="text-muted-foreground">
                          Analyzing brand visibility...
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="text-6xl font-bold text-primary mb-2">
                          {brandVisibility !== null ? brandVisibility : '--'}
                        </div>
                        <p className="text-muted-foreground">
                          Average visibility across brand prompts
                        </p>
                        {brandVisibility === null && !isLoadingAnalytics && (
                          <Button 
                            onClick={() => loadBrandAnalytics(true)}
                            className="mt-4"
                            size="sm"
                          >
                            Generate Analytics
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Brand AI Visibility Trends */}
            {activeStore?.id && <BrandVisibilityChart storeId={activeStore.id} />}
          </div>

          {/* Right Column - AI Optimization Suggestions */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Optimization Suggestions
                  </CardTitle>
                  {brandRecommendations.length === 0 && (
                    <Button
                      onClick={handleGenerateBrandRecommendations}
                      disabled={isLoadingRecommendations}
                      size="sm"
                    >
                      {isLoadingRecommendations ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Recommendations
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingRecommendations ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                    <div className="text-center space-y-2">
                      <p className="font-medium">Generating AI Optimization Suggestions...</p>
                      <p className="text-sm text-muted-foreground">This may take a moment</p>
                    </div>
                  </div>
                ) : brandRecommendations.length > 0 ? (
                  <div className="space-y-4">
                    {brandRecommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{rec.title}</h3>
                              <Badge 
                                variant={rec.impact === "high" ? "default" : rec.impact === "medium" ? "secondary" : "outline"} 
                                className="capitalize"
                              >
                                {rec.impact} Impact
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {rec.effort} Effort
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {rec.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{rec.description}</p>
                            {rec.site_url && (
                              <a
                                href={rec.site_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                              >
                                View brand website
                                <Globe className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      No AI optimization recommendations yet. Generate recommendations to improve your brand's visibility in AI-powered search.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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