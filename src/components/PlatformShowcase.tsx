import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Lock } from "lucide-react";
import aiPlatformsBanner from "@/assets/ai-platforms-banner.jpg";

const PlatformShowcase = () => {
  const features = [
    "See exactly what AI tools say about your brand",
    "Discover which websites AI uses as sources",
    "Compare your LLMrefs Score with competitors",
    "Start for free, no credit card required"
  ];

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardContent className="p-8">
        {/* AI Platform Logos Banner */}
        <div className="mb-6 rounded-lg overflow-hidden bg-muted/30 p-4">
          <img 
            src={aiPlatformsBanner} 
            alt="AI platforms including ChatGPT, Claude, Gemini, and others"
            className="w-full h-24 object-cover rounded-md"
          />
        </div>

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Lock className="text-primary w-5 h-5" />
          <h2 className="text-xl font-bold text-foreground">
            Track your visibility in AI search
          </h2>
        </div>

        <p className="text-muted-foreground mb-6 leading-relaxed">
          LLMrefs is the leading SEO platform for AI search engines. 
          Monitor how your brand appears in ChatGPT, Claude, Gemini, and other AI tools.
        </p>

        {/* Trust Indicators */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-3">
            Trusted by SEO's, Founders & Industry Leaders:
          </p>
          <div className="flex items-center gap-4 text-muted-foreground/60 text-xs font-medium">
            <span>VEED</span>
            <span>AdBlockify</span>
            <span>getinbox</span>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-6">
          <h3 className="font-semibold text-foreground mb-4">
            Unlock powerful insights:
          </h3>
          
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <CheckCircle2 className="text-success w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-foreground leading-relaxed">
                {feature}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlatformShowcase;