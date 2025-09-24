import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Sparkles, CheckCircle, Loader2, FileText, HelpCircle, Code, Edit } from "lucide-react";

interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: "content" | "schema" | "faq" | "description";
  estimatedImpact: "High" | "Medium" | "Low";
  status: "pending" | "applied" | "generating";
}

interface SuggestionsListProps {
  suggestions: Suggestion[];
  onGenerateContent: (suggestion: Suggestion) => void;
}

const SuggestionsList = ({ suggestions, onGenerateContent }: SuggestionsListProps) => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [generatingItems, setGeneratingItems] = useState<string[]>([]);

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleGenerateContent = async (suggestion: Suggestion) => {
    setGeneratingItems(prev => [...prev, suggestion.id]);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setGeneratingItems(prev => prev.filter(id => id !== suggestion.id));
    onGenerateContent(suggestion);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "High": return "bg-destructive text-destructive-foreground";
      case "Medium": return "bg-yellow-500 text-white";
      case "Low": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "description": return <Edit className="h-4 w-4" />;
      case "faq": return <HelpCircle className="h-4 w-4" />;
      case "schema": return <Code className="h-4 w-4" />;
      case "content": return <FileText className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const handleApplyToStore = (suggestionId: string) => {
    console.log("Applying to store:", suggestionId);
    // This would integrate with Shopify/WooCommerce API
    // For now, just log to console as specified
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Optimization Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestions.map((suggestion) => {
            const isExpanded = expandedItems.includes(suggestion.id);
            const isGenerating = generatingItems.includes(suggestion.id);
            const isApplied = suggestion.status === "applied";

            return (
              <Collapsible key={suggestion.id} open={isExpanded} onOpenChange={() => toggleExpanded(suggestion.id)}>
                <Card className={`transition-all ${isApplied ? 'bg-success/5 border-success/20' : 'hover:shadow-md'}`}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-muted-foreground">
                            {getTypeIcon(suggestion.type)}
                          </div>
                          <div>
                            <h3 className="font-medium text-left">{suggestion.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getImpactColor(suggestion.estimatedImpact)}>
                                {suggestion.estimatedImpact} Impact
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {suggestion.type}
                              </Badge>
                              {isApplied && (
                                <Badge className="bg-success text-success-foreground">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Applied
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <p className="text-muted-foreground mb-4">{suggestion.description}</p>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={() => handleGenerateContent(suggestion)}
                          disabled={isGenerating || isApplied}
                          className="flex items-center gap-2"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              Generate Content
                            </>
                          )}
                        </Button>
                        
                        {isApplied && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleApplyToStore(suggestion.id)}
                            className="flex items-center gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Applied to Store
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default SuggestionsList;