import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Search, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Prompt {
  id: string;
  content: string;
  brand_name?: string;
  visibility_score?: number;
  sentiment_score?: number;
  active: boolean;
  status: string;
  created_at: string;
}

interface PromptSidebarListProps {
  storeId: string;
  selectedPromptId?: string;
  onPromptSelect: (prompt: Prompt) => void;
}

export const PromptSidebarList = ({ storeId, selectedPromptId, onPromptSelect }: PromptSidebarListProps) => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchPrompts();
  }, [storeId]);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data, error } = await supabase
        .from("prompts")
        .select("*")
        .eq("user_id", userData.user.id)
        .eq("store_id", storeId)
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error("Error fetching prompts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrompts = prompts.filter(prompt =>
    prompt.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (prompt.brand_name && prompt.brand_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredPrompts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPrompts = filteredPrompts.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  const getScoreColor = (score?: number) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Prompts</h3>
          <Badge variant="secondary" className="ml-auto text-xs">
            {filteredPrompts.length}
          </Badge>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Loading prompts...
            </div>
          ) : paginatedPrompts.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No prompts found
            </div>
          ) : (
            paginatedPrompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => onPromptSelect(prompt)}
                className={`w-full text-left p-3 rounded-lg hover:bg-accent transition-colors ${
                  selectedPromptId === prompt.id ? "bg-accent" : ""
                }`}
              >
                <div className="space-y-1">
                  <div className="text-sm line-clamp-2 mb-1">
                    {prompt.content}
                  </div>
                  {prompt.brand_name && (
                    <Badge variant="outline" className="text-xs mb-1">
                      {prompt.brand_name}
                    </Badge>
                  )}
                  <div className="flex items-center gap-2 text-xs">
                    {prompt.visibility_score !== null && prompt.visibility_score !== undefined && (
                      <span className={`font-medium ${getScoreColor(prompt.visibility_score)}`}>
                        Vis: {prompt.visibility_score}
                      </span>
                    )}
                    {prompt.sentiment_score !== null && prompt.sentiment_score !== undefined && (
                      <span className={`font-medium ${getScoreColor(prompt.sentiment_score)}`}>
                        Sent: {prompt.sentiment_score}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      {totalPages > 1 && (
        <div className="p-3 border-t flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
