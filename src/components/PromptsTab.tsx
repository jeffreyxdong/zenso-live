import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, Bot, Eye, Trash2, MoreVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PromptViewModal } from "./PromptViewModal";

interface SavedPrompt {
  id: string;
  content: string;
  created_at: string;
  status: "active" | "suggested" | "inactive";
  brand_name?: string;
  product_id?: string;
  visibility_score?: number;
  sentiment_score?: number;
}

interface Store {
  id: string;
  name: string;
  website: string;
  is_active: boolean;
}

interface PromptsTabProps {
  activeStore: Store | null;
}

export const PromptsTab = ({ activeStore }: PromptsTabProps) => {
  const [prompt, setPrompt] = useState("");
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<SavedPrompt | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const { toast } = useToast();

  /** Fetch AI responses from OpenAI + Gemini */
  const fetchAIResponses = async (prompt: string) => {
    const [openaiRes, geminiRes] = await Promise.allSettled([
      supabase.functions.invoke("chat-with-openai", { body: { prompt } }),
      supabase.functions.invoke("chat-with-gemini", { body: { prompt } }),
    ]);

    const responses: { model: string; content: string }[] = [];
    if (openaiRes.status === "fulfilled" && openaiRes.value.data?.result) {
      responses.push({ model: "openai", content: openaiRes.value.data.result });
    }
    if (geminiRes.status === "fulfilled" && geminiRes.value.data?.result) {
      responses.push({ model: "gemini", content: geminiRes.value.data.result });
    }
    return responses;
  };

  /** Call Supabase scoring functions — they handle the GPT prompt logic */
  const scoreResponses = async (responses: { model: string; content: string }[], brandName: string) => {
    let totalVisibility = 0;
    let totalSentiment = 0;

    for (const res of responses) {
      console.log(`Scoring content for ${res.model} with brand "${brandName}"`);
      console.log(`Content preview: ${res.content.substring(0, 200)}...`);
      
      const [visibilityRes, sentimentRes] = await Promise.allSettled([
        supabase.functions.invoke("score-brand-visibility", {
          body: { content: res.content, brandName },
        }),
        supabase.functions.invoke("score-sentiment", {
          body: { content: res.content, brandName },
        }),
      ]);

      console.log('Visibility result:', visibilityRes);
      console.log('Sentiment result:', sentimentRes);

      if (visibilityRes.status === "fulfilled" && visibilityRes.value.data?.score !== undefined) {
        totalVisibility += visibilityRes.value.data.score;
        console.log(`Visibility (${res.model}):`, visibilityRes.value.data.score);
      } else {
        console.error(`Visibility scoring failed for ${res.model}:`, visibilityRes);
      }
      
      if (sentimentRes.status === "fulfilled" && sentimentRes.value.data?.score !== undefined) {
        totalSentiment += sentimentRes.value.data.score;
        console.log(`Sentiment (${res.model}):`, sentimentRes.value.data.score);
      } else {
        console.error(`Sentiment scoring failed for ${res.model}:`, sentimentRes);
      }
    }

    return {
      avgVisibility: responses.length ? Math.round(totalVisibility / responses.length) : 0,
      avgSentiment: responses.length ? Math.round(totalSentiment / responses.length) : 0,
    };
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast({ title: "Error", description: "Please enter a prompt", variant: "destructive" });
      return;
    }
    if (!activeStore?.name) {
      toast({ title: "Error", description: "No store selected. Please select a store.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const responses = await fetchAIResponses(prompt);
      if (responses.length === 0) throw new Error("No AI responses received.");

      const { avgVisibility, avgSentiment } = await scoreResponses(responses, activeStore.name);
      await savePromptWithScores(avgVisibility, avgSentiment, responses);

      toast({
        title: "Success",
        description: `Visibility: ${avgVisibility}/100, Sentiment: ${avgSentiment}/100`,
      });

      setPrompt("");
    } catch (err: any) {
      console.error("Error processing prompt:", err);
      toast({ title: "Error", description: err.message || "Failed to process prompt", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const savePromptWithScores = async (visibilityScore: number, sentimentScore: number, responses: any[]) => {
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) throw new Error("Not signed in");
      if (!activeStore?.id) throw new Error("No store selected");

      const { data: promptData, error } = await supabase
        .from("prompts")
        .insert({
          user_id: userData.user.id,
          store_id: activeStore.id,
          content: prompt.trim(),
          brand_name: activeStore.name,
          status: "active",
          visibility_score: visibilityScore,
          sentiment_score: sentimentScore,
        })
        .select()
        .single();

      if (error) throw error;

      if (responses.length > 0 && promptData) {
        await supabase.from("prompt_responses").insert(
          responses.map((r) => ({
            prompt_id: promptData.id,
            model_name: r.model,
            response_text: r.content,
          }))
        );
      }

      fetchSavedPrompts();
    } catch (err: any) {
      console.error("Error saving prompt:", err);
      toast({ title: "Error", description: err.message || "Failed to save prompt", variant: "destructive" });
    }
  };

  const fetchSavedPrompts = async () => {
    try {
      setIsLoadingSaved(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user || !activeStore?.id) {
        setSavedPrompts([]);
        return;
      }

      const { data, error } = await supabase
        .from("prompts")
        .select("id, content, created_at, status, brand_name, product_id, visibility_score, sentiment_score")
        .eq("user_id", userData.user.id)
        .eq("store_id", activeStore.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavedPrompts((data ?? []) as SavedPrompt[]);
    } catch (err) {
      console.error("Error fetching prompts:", err);
      toast({ title: "Error", description: "Failed to load saved prompts", variant: "destructive" });
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const deletePrompt = async (id: string) => {
    try {
      await supabase.from("prompts").delete().eq("id", id);
      fetchSavedPrompts();
      toast({ title: "Success", description: "Prompt deleted" });
    } catch (err) {
      console.error("Error deleting prompt:", err);
      toast({ title: "Error", description: "Failed to delete prompt", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchSavedPrompts();
  }, [activeStore]);

  const getScoreDisplay = (score: number | undefined, type: "visibility" | "sentiment") => {
    if (score == null) {
      return <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted/50">No Data</span>;
    }
    const colorClass =
      type === "visibility"
        ? score >= 80
          ? "text-green-700 bg-green-50 border-green-200"
          : score >= 60
          ? "text-yellow-700 bg-yellow-50 border-yellow-200"
          : "text-red-700 bg-red-50 border-red-200"
        : score >= 70
        ? "text-green-700 bg-green-50 border-green-200"
        : score >= 30
        ? "text-yellow-700 bg-yellow-50 border-yellow-200"
        : "text-red-700 bg-red-50 border-red-200";

    return <span className={`text-sm font-semibold px-3 py-1.5 rounded-md border ${colorClass}`}>{score}/100</span>;
  };

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" /> Add New Prompt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            id="prompt"
            placeholder="Ask anything you'd like to test across AI platforms..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!isProcessing && prompt.trim() && activeStore) handleSubmit();
              }
            }}
            className="min-h-[100px]"
          />
          {activeStore && (
            <p className="text-sm text-muted-foreground">
              Prompts will be scored for: <strong>{activeStore.name}</strong>
            </p>
          )}
          <Button onClick={handleSubmit} disabled={isProcessing || !prompt.trim() || !activeStore} className="w-full">
            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Process & Score Prompt"}
          </Button>
        </CardContent>
      </Card>

      {/* Saved Prompts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Prompts</span>
            <Badge variant="outline">{savedPrompts.length} Prompts</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingSaved ? (
            <div className="flex items-center gap-2 text-sm py-8">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading prompts...
            </div>
          ) : savedPrompts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No prompts yet. Create one above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prompt</TableHead>
                  <TableHead className="text-center">Visibility</TableHead>
                  <TableHead className="text-center">Sentiment</TableHead>
                  <TableHead className="text-center">Created</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savedPrompts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell onClick={() => { setSelectedPrompt(p); setIsViewModalOpen(true); }}>
                      <p className="text-sm text-muted-foreground truncate cursor-pointer hover:bg-muted/50 rounded px-2 py-1">
                        {p.content}
                      </p>
                    </TableCell>
                    <TableCell className="text-center">{getScoreDisplay(p.visibility_score, "visibility")}</TableCell>
                    <TableCell className="text-center">{getScoreDisplay(p.sentiment_score, "sentiment")}</TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedPrompt(p); setIsViewModalOpen(true); }}>
                            <Eye className="w-4 h-4 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deletePrompt(p.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedPrompt && (
        <PromptViewModal
          isOpen={isViewModalOpen}
          onClose={() => { setIsViewModalOpen(false); setSelectedPrompt(null); }}
          prompt={selectedPrompt}
        />
      )}
    </div>
  );
};
