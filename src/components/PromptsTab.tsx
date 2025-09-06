import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MessageCircle, Sparkles, Bot, BookmarkPlus, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIResponse {
  platform: string;
  result: string;
  loading: boolean;
  error?: string;
  score?: number;
  scoreLoading?: boolean;
}

export const PromptsTab = () => {
  const [prompt, setPrompt] = useState("");
  const [brandName, setBrandName] = useState("");
  const [responses, setResponses] = useState<AIResponse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [savedPrompts, setSavedPrompts] = useState<Array<{ id: string; title: string; content: string; created_at: string }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive",
      });
      return;
    }

    if (!brandName.trim()) {
      toast({
        title: "Error", 
        description: "Please enter a brand name for visibility scoring",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setResponses([
      { platform: "ChatGPT", result: "", loading: true, scoreLoading: false },
      { platform: "Gemini", result: "", loading: true, scoreLoading: false },
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

      // Score brand visibility for successful responses
      const scoringPromises = newResponses.map(async (response, index) => {
        if (response.result && !response.error) {
          // Mark as loading score
          setResponses(prev => prev.map((r, i) => 
            i === index ? { ...r, scoreLoading: true } : r
          ));

          try {
            const { data: scoreData } = await supabase.functions.invoke('score-brand-visibility', {
              body: { content: response.result, brandName: brandName.trim() }
            });

            if (scoreData?.score !== undefined) {
              setResponses(prev => prev.map((r, i) => 
                i === index ? { ...r, score: scoreData.score, scoreLoading: false } : r
              ));
            } else {
              setResponses(prev => prev.map((r, i) => 
                i === index ? { ...r, scoreLoading: false } : r
              ));
            }
          } catch (error) {
            console.error('Error scoring response:', error);
            setResponses(prev => prev.map((r, i) => 
              i === index ? { ...r, scoreLoading: false } : r
            ));
          }
        }
      });

      await Promise.allSettled(scoringPromises);

      toast({
        title: "Success",
        description: "Responses received and scored for brand visibility",
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

const fetchSavedPrompts = async () => {
  try {
    setIsLoadingSaved(true);
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    if (!userData?.user) {
      setSavedPrompts([]);
      setIsLoadingSaved(false);
      return;
    }

    const { data, error } = await (supabase as any)
      .from('prompts')
      .select('id, title, content, created_at')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setSavedPrompts(data ?? []);
  } catch (e: any) {
    console.error('Error fetching prompts', e);
    toast({ title: 'Error', description: 'Failed to load saved prompts', variant: 'destructive' });
  } finally {
    setIsLoadingSaved(false);
  }
};

useEffect(() => {
  fetchSavedPrompts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

const handleSavePrompt = async () => {
  if (!prompt.trim()) {
    toast({ title: 'Error', description: 'Please enter a prompt', variant: 'destructive' });
    return;
  }
  setIsSaving(true);
  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    if (!userData?.user) {
      toast({ title: 'Not signed in', description: 'Please sign in to save prompts', variant: 'destructive' });
      return;
    }

    const finalTitle = (title || prompt.trim().split('\n')[0]).slice(0, 100);

    const { error } = await (supabase as any)
      .from('prompts')
      .insert({ user_id: userData.user.id, title: finalTitle, content: prompt.trim() });

    if (error) throw error;

    toast({ title: 'Saved', description: 'Prompt saved to your library' });
    setTitle("");
    fetchSavedPrompts();
  } catch (e: any) {
    console.error('Error saving prompt', e);
    toast({ title: 'Error', description: e.message || 'Failed to save prompt', variant: 'destructive' });
  } finally {
    setIsSaving(false);
  }
};

const loadPrompt = (content: string) => {
  setPrompt(content);
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
          <div className="space-y-3">
            <Label htmlFor="title" className="block">Prompt title</Label>
            <Input
              id="title"
              placeholder="e.g., Blog intro about AI safety"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Label htmlFor="brandName" className="block">Brand name (for visibility scoring)</Label>
            <Input
              id="brandName"
              placeholder="e.g., Tesla, Apple, Microsoft"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
            />
            <Label htmlFor="prompt" className="block">Enter your prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Ask anything you'd like to compare across AI platforms..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              onClick={handleSavePrompt}
              disabled={isSaving || !prompt.trim()}
              className="sm:w-1/3"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-4 h-4 mr-2" />
                  Save prompt
                </>
              )}
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !prompt.trim() || !brandName.trim()}
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
          </div>
        </CardContent>
      </Card>

      {/* Saved Prompts */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Prompts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingSaved ? (
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading your prompts...
            </div>
          ) : savedPrompts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No prompts saved yet. Use "Save prompt" to keep one.</p>
          ) : (
            <div className="space-y-3">
              {savedPrompts.map((p) => (
                <div key={p.id} className="flex items-start justify-between rounded-md border p-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(p.created_at).toLocaleString()}</p>
                  </div>
                  <div className="ml-3 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => loadPrompt(p.content)}>
                      Use
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {responses.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {responses.map((response, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getPlatformIcon(response.platform)}
                    {response.platform}
                  </div>
                  {response.score !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="w-4 h-4" />
                      <span className="font-medium">Score: {response.score}/100</span>
                    </div>
                  )}
                  {response.scoreLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Scoring...</span>
                    </div>
                  )}
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