import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageCircle, Sparkles, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIResponse {
  platform: string;
  result: string;
  loading: boolean;
  error?: string;
}

export const PromptsTab = () => {
  const [prompt, setPrompt] = useState("");
  const [responses, setResponses] = useState<AIResponse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setResponses([
      { platform: "ChatGPT", result: "", loading: true },
      { platform: "Gemini", result: "", loading: true },
    ]);

    try {
      // Call both APIs in parallel
      const [openaiPromise, geminiPromise] = await Promise.allSettled([
        supabase.functions.invoke('chat-with-openai', {
          body: { prompt }
        }),
        supabase.functions.invoke('chat-with-gemini', {
          body: { prompt }
        })
      ]);

      // Update responses as they come in
      const newResponses: AIResponse[] = [];

      // Handle OpenAI response
      if (openaiPromise.status === 'fulfilled' && openaiPromise.value.data) {
        newResponses.push({
          platform: "ChatGPT",
          result: openaiPromise.value.data.result,
          loading: false,
        });
      } else {
        newResponses.push({
          platform: "ChatGPT",
          result: "",
          loading: false,
          error: openaiPromise.status === 'rejected' ? openaiPromise.reason.message : 'Failed to get response',
        });
      }

      // Handle Gemini response
      if (geminiPromise.status === 'fulfilled' && geminiPromise.value.data) {
        newResponses.push({
          platform: "Gemini",
          result: geminiPromise.value.data.result,
          loading: false,
        });
      } else {
        newResponses.push({
          platform: "Gemini",
          result: "",
          loading: false,
          error: geminiPromise.status === 'rejected' ? geminiPromise.reason.message : 'Failed to get response',
        });
      }

      setResponses(newResponses);

      toast({
        title: "Success",
        description: "Responses received from AI platforms",
      });
    } catch (error) {
      console.error('Error submitting prompt:', error);
      toast({
        title: "Error",
        description: "Failed to submit prompt to AI platforms",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "ChatGPT":
        return <MessageCircle className="w-5 h-5" />;
      case "Gemini":
        return <Sparkles className="w-5 h-5" />;
      default:
        return <Bot className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            AI Prompt Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium mb-2">
              Enter your prompt
            </label>
            <Textarea
              id="prompt"
              placeholder="Ask anything you'd like to compare across AI platforms..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !prompt.trim()}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Getting responses...
              </>
            ) : (
              "Submit to AI Platforms"
            )}
          </Button>
        </CardContent>
      </Card>

      {responses.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {responses.map((response, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getPlatformIcon(response.platform)}
                  {response.platform}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {response.loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="ml-2">Generating response...</span>
                  </div>
                ) : response.error ? (
                  <div className="text-destructive py-4">
                    <p className="font-medium">Error:</p>
                    <p className="text-sm">{response.error}</p>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{response.result}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};