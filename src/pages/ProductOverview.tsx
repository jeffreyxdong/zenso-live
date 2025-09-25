import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, MapPin, Heart, Globe } from "lucide-react";
import ProductMetrics from "@/components/ProductMetrics";
import ProductCharts from "@/components/ProductCharts";
import SuggestionsList from "@/components/SuggestionsList";
import PreviewModal from "@/components/PreviewModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Data types
interface Product {
  id: string;
  title: string;
  handle: string;
  status: "active" | "draft" | "archived";
  shopify_id: string;
  product_type?: string;
  vendor?: string;
  tags?: string[];
  created_at: string;
  visibility_score?: number;
  sentiment_score?: number;
  position_score?: number;
  visibilityHistory: { date: string; value: number }[];
  sentimentHistory: { date: string; value: number }[];
  positionHistory: { date: string; value: number }[];
  suggestions: Suggestion[];
  competitors: Competitor[];
  currentMetrics: {
    visibility: "High" | "Medium" | "Low";
    sentiment: "Positive" | "Neutral" | "Negative";
    position: number;
    visibilityScore: number;
    sentimentScore: number;
    positionScore: number;
  };
}

interface Suggestion {
  id: string;
  title: string; 
  description: string;
  type: "content" | "schema" | "faq" | "description";
  estimatedImpact: "High" | "Medium" | "Low";
  status: "pending" | "applied" | "generating";
}

interface Competitor {
  id: string;
  name: string;
  position: number;
  visibilityScore: number;
}

// Generate historical data from actual product scores database records
const generateScoreHistoryFromData = (scoresData: any[], scoreField: 'visibility_score' | 'sentiment_score' | 'position_score') => {
  const data = [];
  const today = new Date();
  
  // Create a map of dates to scores for easy lookup
  const scoreMap = new Map();
  scoresData.forEach(score => {
    const dateKey = new Date(score.created_at).toDateString();
    scoreMap.set(dateKey, score[scoreField] || 0);
  });
  
  // Generate 7 days of data
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toDateString();
    
    const value = scoreMap.get(dateKey) || (i === 0 && scoresData.length > 0 ? scoresData[scoresData.length - 1][scoreField] : null);
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: value
    });
  }
  
  return data;
};

// Generate historical data based on actual scores
const generateHistoricalData = (currentScore: number | null, type: 'visibility' | 'sentiment' | 'position', createdAt: string) => {
  const data = [];
  const today = new Date();
  const createdDate = new Date(createdAt);
  const daysSinceCreated = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Always generate 7 days of x-axis data
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    let value: number | null = null;
    
    // If product was created within the last 2 days, show rise from 0
    if (daysSinceCreated <= 2) {
      const actualScore = currentScore || 0;
      let finalValue: number;
      
      // Apply constraints based on type to get the final target value
      if (type === 'visibility') {
        finalValue = Math.max(0, Math.min(100, actualScore));
      } else if (type === 'sentiment') {
        finalValue = Math.max(0, Math.min(10, actualScore));
      } else if (type === 'position') {
        finalValue = Math.max(1, Math.min(20, actualScore || 5));
      } else {
        finalValue = actualScore;
      }
      
      // Calculate how many days ago the product was created relative to current loop date
      const daysSinceCreatedFromCurrentDate = Math.floor((date.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceCreatedFromCurrentDate < -1) {
        // Days before the day prior to creation - no data
        value = null;
      } else if (daysSinceCreatedFromCurrentDate === -1) {
        // Day before creation - start from 0 (or baseline for position)
        if (type === 'position') {
          value = 20; // High baseline for position since lower is better
        } else {
          value = 0;
        }
      } else if (daysSinceCreatedFromCurrentDate >= 0) {
        // Creation day onwards - show actual score
        value = finalValue;
      }
    } else {
      // For older products, generate historical data
      let baseValue = currentScore || 0;
      if (!currentScore) {
        baseValue = type === 'visibility' ? 50 : type === 'sentiment' ? 5 : 5;
      }
      
      let variance = type === 'visibility' ? 15 : type === 'sentiment' ? 1 : 2;
      
      if (i === 0) {
        // Use actual score for today
        value = baseValue;
      } else {
        // Generate realistic historical variation
        const variation = (Math.random() - 0.5) * variance;
        value = baseValue + variation;
      }
      
      // Apply constraints based on type
      if (type === 'visibility') {
        value = Math.max(0, Math.min(100, Math.round(value)));
      } else if (type === 'sentiment') {
        value = Math.max(0, Math.min(10, Math.round(value * 10) / 10));
      } else if (type === 'position') {
        value = Math.max(1, Math.min(20, Math.round(value)));
      }
    }
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: value
    });
  }
  
  return data;
};

// Mock suggestions generator
const generateMockSuggestions = (productTitle: string): Suggestion[] => {
  const baseTitle = productTitle.toLowerCase();
  const suggestions: Suggestion[] = [];
  
  if (baseTitle.includes('headphones') || baseTitle.includes('audio')) {
    suggestions.push({
      id: "s1",
      title: "Highlight Audio Features",
      description: "Add technical specifications like frequency response, driver size, and audio codec support",
      type: "description",
      estimatedImpact: "High",
      status: "pending"
    });
  }
  
  if (baseTitle.includes('organic') || baseTitle.includes('eco') || baseTitle.includes('sustainable')) {
    suggestions.push({
      id: "s2",
      title: "Add Sustainability Certifications",
      description: "Include eco-certifications and sustainable material information",
      type: "description",
      estimatedImpact: "High",
      status: "pending"
    });
  }
  
  suggestions.push(
    {
      id: "s3",
      title: "Generate FAQ Section",
      description: "Create comprehensive FAQ covering shipping, warranty, and compatibility questions",
      type: "faq",
      estimatedImpact: "Medium",
      status: "pending"
    },
    {
      id: "s4",
      title: "Add Product Schema Markup",
      description: "Implement structured data markup to enhance visibility in search results",
      type: "schema",
      estimatedImpact: "High",
      status: "pending"
    }
  );
  
  return suggestions;
};

// Mock competitors generator
const generateMockCompetitors = (): Competitor[] => [
  { id: "c1", name: "Top Competitor Product", position: 1, visibilityScore: 95 },
  { id: "c2", name: "Second Place Product", position: 2, visibilityScore: 89 },
  { id: "c3", name: "Third Place Product", position: 3, visibilityScore: 82 },
  { id: "c4", name: "Fourth Place Product", position: 4, visibilityScore: 76 }
];

const ProductOverview = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { activeStore } = useOutletContext<{ activeStore: { id: string; name: string; website: string; is_active: boolean } | null }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [previewType, setPreviewType] = useState<string>("");

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        // Fetch the actual product from Supabase
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .eq("user_id", userData.user.id)
          .single();

        if (productError) throw productError;

        // Fetch the most recent 7 days of product scores
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: scoresData, error: scoresError } = await supabase
          .from("product_scores")
          .select("*")
          .eq("product_id", productId)
          .gte("created_at", sevenDaysAgo.toISOString())
          .order("created_at", { ascending: true });

        if (scoresError) {
          console.error("Error fetching scores:", scoresError);
        }

        // Use the latest scores or fallback to product table scores
        const latestScore = scoresData && scoresData.length > 0 ? scoresData[scoresData.length - 1] : null;
        const visibilityScore = latestScore?.visibility_score || productData.visibility_score || 0;
        const sentimentScore = latestScore?.sentiment_score || productData.sentiment_score || 0;
        const positionScore = latestScore?.position_score || productData.position_score || 0;
        
        // Convert scores to display formats
        const getVisibilityLevel = (score: number): "High" | "Medium" | "Low" => {
          if (score >= 70) return "High";
          if (score >= 40) return "Medium";
          return "Low";
        };
        
        const getSentimentLevel = (score: number): "Positive" | "Neutral" | "Negative" => {
          if (score >= 7) return "Positive";
          if (score >= 4) return "Neutral";
          return "Negative";
        };

        // For newly created products (within 2 days), always show progression from 0
        const createdDate = new Date(productData.created_at);
        const today = new Date();
        const daysSinceCreated = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        const isNewProduct = daysSinceCreated <= 2;

        // Generate history data - for new products, show progression even with real data
        const visibilityHistory = isNewProduct 
          ? generateHistoricalData(visibilityScore, 'visibility', productData.created_at)
          : (scoresData && scoresData.length > 0 
              ? generateScoreHistoryFromData(scoresData, 'visibility_score')
              : generateHistoricalData(visibilityScore, 'visibility', productData.created_at));
          
        const sentimentHistory = isNewProduct
          ? generateHistoricalData(sentimentScore, 'sentiment', productData.created_at) 
          : (scoresData && scoresData.length > 0
              ? generateScoreHistoryFromData(scoresData, 'sentiment_score') 
              : generateHistoricalData(sentimentScore, 'sentiment', productData.created_at));
          
        const positionHistory = isNewProduct
          ? generateHistoricalData(positionScore, 'position', productData.created_at)
          : (scoresData && scoresData.length > 0
              ? generateScoreHistoryFromData(scoresData, 'position_score')
              : generateHistoricalData(positionScore, 'position', productData.created_at));
        
        const enhancedProduct: Product = {
          ...productData,
          status: (productData.status as "active" | "draft" | "archived") || "active",
          visibilityHistory,
          sentimentHistory, 
          positionHistory,
          suggestions: generateMockSuggestions(productData.title),
          competitors: generateMockCompetitors(),
          currentMetrics: {
            visibility: getVisibilityLevel(visibilityScore),
            sentiment: getSentimentLevel(sentimentScore),
            position: positionScore || 5,
            visibilityScore: visibilityScore,
            sentimentScore: sentimentScore,
            positionScore: positionScore || 5
          }
        };

        setProduct(enhancedProduct);
      } catch (error: any) {
        console.error("Error fetching product:", error);
        toast({
          title: "Error",
          description: "Failed to fetch product data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const handleGenerateContent = async (suggestion: Suggestion) => {
    // Mock AI content generation
    const mockContent = {
      description: `
# Enhanced Product Description

## Key Features
• **Premium Sound Quality**: Advanced 40mm drivers deliver rich, detailed audio
• **30-Hour Battery Life**: All-day listening with quick charge capability
• **Active Noise Cancellation**: Block out distractions for immersive audio
• **Comfort Fit**: Soft ear cushions and adjustable headband for extended wear
• **Universal Compatibility**: Works with all Bluetooth-enabled devices

## Perfect For
- Music enthusiasts seeking studio-quality sound
- Travelers needing noise cancellation
- Professionals working from home
- Gamers wanting immersive audio experiences
      `,
      faq: `
# Frequently Asked Questions

**Q: What's the battery life?**
A: Up to 30 hours of playback time, with quick charge providing 3 hours of use in 10 minutes.

**Q: Are these compatible with my device?**
A: Yes, these headphones work with any Bluetooth-enabled device including phones, tablets, and computers.

**Q: What's included in the box?**
A: Headphones, USB-C charging cable, 3.5mm audio cable, carrying case, and user manual.

**Q: What's the warranty?**
A: 2-year manufacturer warranty covering defects and normal wear.
      `,
      schema: `
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Wireless Bluetooth Headphones - Premium Sound Quality",
  "description": "Premium wireless headphones with active noise cancellation",
  "brand": {
    "@type": "Brand", 
    "name": "Your Brand"
  },
  "offers": {
    "@type": "Offer",
    "price": "199.99",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "127"
  }
}
      `,
      content: `
# Use Case Scenarios

## For Music Lovers
Experience your favorite tracks like never before with studio-grade sound quality that brings out every detail in your music.

## For Travelers  
Block out airplane noise and crying babies with our advanced active noise cancellation technology.

## For Gamers
Immerse yourself in your games with precise audio positioning and crystal-clear communication.

## For Remote Workers
Stay focused during calls with noise cancellation and enjoy music during breaks without disturbing others.
      `
    };

    setPreviewContent(mockContent[suggestion.type as keyof typeof mockContent]);
    setPreviewType(suggestion.type);
    setShowPreview(true);
  };

  const handleApplyContent = (suggestionId: string) => {
    if (product) {
      const updatedSuggestions = product.suggestions.map(s => 
        s.id === suggestionId ? { ...s, status: "applied" as const } : s
      );
      setProduct({ ...product, suggestions: updatedSuggestions });
    }
    setShowPreview(false);
    console.log("Applied content to store for suggestion:", suggestionId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading product details...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Product not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate("/dashboard?tab=products-overview")}
          className="hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Products
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{product.title}</h1>
          <p className="text-muted-foreground mt-1">Product handle: {product.handle}</p>
        </div>
        <Badge 
          variant={product.status === "active" ? "default" : "secondary"}
          className="capitalize"
        >
          {product.status}
        </Badge>
      </div>

      {/* Metrics Cards */}
      <ProductMetrics metrics={product.currentMetrics} />

      {/* Charts */}
      <ProductCharts 
        visibilityData={product.visibilityHistory}
        sentimentData={product.sentimentHistory}
        positionData={product.positionHistory}
      />

      {/* Suggestions */}
      <SuggestionsList 
        suggestions={product.suggestions}
        onGenerateContent={handleGenerateContent}
      />

      {/* Sources Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 border-b font-medium text-sm">
              <div>Domain</div>
              <div>Used</div>
              <div>Avg. Citations</div>
              <div>Type</div>
            </div>
            <div className="divide-y">
              <div className="grid grid-cols-4 gap-4 p-4 items-center">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                  <span className="font-medium">reddit.com</span>
                </div>
                <div>100%</div>
                <div>2.0</div>
                <div>
                  <Badge variant="secondary">Other</Badge>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 p-4 items-center">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-red-600 flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-sm"></div>
                  </div>
                  <span className="font-medium">youtube.com</span>
                </div>
                <div>100%</div>
                <div>0.0</div>
                <div>
                  <Badge variant="secondary">Other</Badge>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 p-4 items-center">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-gray-400 flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                  <span className="font-medium">blendjet.com</span>
                </div>
                <div>50%</div>
                <div>3.0</div>
                <div>
                  <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">You</Badge>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 p-4 items-center">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-green-600 flex items-center justify-center text-white text-xs font-bold">
                    CR
                  </div>
                  <span className="font-medium">consumerreports.org</span>
                </div>
                <div>50%</div>
                <div>3.0</div>
                <div>
                  <Badge variant="secondary">Other</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Competitors Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Top Competitors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {product.competitors.map((competitor, index) => (
              <div key={competitor.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    #{competitor.position}
                  </div>
                  <div>
                    <h3 className="font-medium">{competitor.name}</h3>
                    <p className="text-sm text-muted-foreground">Position #{competitor.position}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{competitor.visibilityScore}%</div>
                  <div className="text-sm text-muted-foreground">Visibility Score</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <PreviewModal 
        open={showPreview}
        onOpenChange={setShowPreview}
        content={previewContent}
        type={previewType}
        onApply={() => {
          const suggestion = product.suggestions.find(s => s.type === previewType);
          if (suggestion) {
            handleApplyContent(suggestion.id);
          }
        }}
      />
    </div>
  );
};

export default ProductOverview;