import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useSupabase } from "./useSupabase";
import type { Exercise } from "@/types/exercises";

export const useExercises = (completed?: boolean) => {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();

  const {
    data: exercises,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["exercises", completed],
    queryFn: async () => {
      let query = supabase.from("exercises").select("*");

      if (completed !== undefined) {
        query = query.eq("completed", completed);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;
      return data as Exercise[];
    },
  });

  const updateExercise = useMutation({
    mutationFn: async ({
      exerciseId,
      updates,
    }: {
      exerciseId: string;
      updates: Partial<Exercise>;
    }) => {
      const { data, error } = await supabase
        .from("exercises")
        .update(updates)
        .eq("id", exerciseId)
        .select()
        .single();

      if (error) throw error;
      return data as Exercise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
  });

  const completeExercise = useMutation({
    mutationFn: async ({
      exerciseId,
      score,
      currentAttempts,
    }: {
      exerciseId: string;
      score: number;
      currentAttempts: number;
    }) => {
      const { data, error } = await supabase
        .from("exercises")
        .update({
          completed: true,
          score,
          completed_at: new Date().toISOString(),
          attempts: currentAttempts + 1,
        })
        .eq("id", exerciseId)
        .select()
        .single();

      if (error) throw error;
      return data as Exercise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
  });

  return {
    exercises: exercises ?? [],
    isLoading,
    error,
    refetch,
    updateExercise: updateExercise.mutateAsync,
    completeExercise: completeExercise.mutateAsync,
  };
};
