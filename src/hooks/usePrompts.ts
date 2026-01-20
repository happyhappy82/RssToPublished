"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Prompt, ContentType } from "@/types";

interface CreatePromptInput {
  name: string;
  content_type: ContentType;
  prompt_text: string;
}

async function fetchPrompts(): Promise<Prompt[]> {
  const response = await fetch("/api/prompts");
  if (!response.ok) {
    throw new Error("Failed to fetch prompts");
  }
  return response.json();
}

async function createPrompt(input: CreatePromptInput): Promise<Prompt> {
  const response = await fetch("/api/prompts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error("Failed to create prompt");
  }
  return response.json();
}

async function deletePrompt(id: string): Promise<void> {
  const response = await fetch(`/api/prompts/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete prompt");
  }
}

export function usePrompts() {
  return useQuery({
    queryKey: ["prompts"],
    queryFn: fetchPrompts,
  });
}

export function usePromptsByType(contentType?: ContentType) {
  const { data: prompts, ...rest } = usePrompts();

  const filteredPrompts = contentType
    ? prompts?.filter((p) => p.content_type === contentType)
    : prompts;

  return { data: filteredPrompts, ...rest };
}

export function useCreatePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
  });
}

export function useDeletePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
  });
}
