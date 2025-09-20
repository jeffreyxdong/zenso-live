import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface VisibilityScore {
  date: string;
  visibility_score: number;
}

export const useVisibilityScores = (promptId: string) => {
  const [data, setData] = useState<VisibilityScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVisibilityScores = async () => {
    if (!promptId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const { data: scores, error: fetchError } = await supabase
        .from('prompt_daily_scores')
        .select('date, visibility_score')
        .eq('prompt_id', promptId)
        .not('visibility_score', 'is', null)
        .order('date', { ascending: false })
        .limit(7);

      if (fetchError) {
        throw fetchError;
      }

      // Reverse the array so oldest date is first for chart rendering
      const sortedScores = (scores || []).reverse();
      setData(sortedScores);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching visibility scores:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVisibilityScores();
  }, [promptId]);

  // Set up real-time subscription for new scores
  useEffect(() => {
    if (!promptId) return;

    const channel = supabase
      .channel('visibility-scores-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'prompt_daily_scores',
          filter: `prompt_id=eq.${promptId}`
        },
        () => {
          fetchVisibilityScores();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'prompt_daily_scores',
          filter: `prompt_id=eq.${promptId}`
        },
        () => {
          fetchVisibilityScores();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [promptId]);

  return { data, isLoading, error, refetch: fetchVisibilityScores };
};