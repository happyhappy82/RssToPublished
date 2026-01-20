"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueueItem, UploadStatus, Platform } from "@/types";

interface CreateQueueItemInput {
  content: string;
  target_platforms: Platform[];
  processed_content_id?: string;
  scheduled_at?: string;
}

interface UpdateQueueItemInput {
  id: string;
  content?: string;
  target_platforms?: Platform[];
  status?: UploadStatus;
  scheduled_at?: string | null;
  position?: number;
}

async function fetchQueue(status?: UploadStatus): Promise<QueueItem[]> {
  const url = status ? `/api/queue?status=${status}` : "/api/queue";
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch queue");
  }
  return response.json();
}

async function createQueueItem(input: CreateQueueItemInput): Promise<QueueItem> {
  const response = await fetch("/api/queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error("Failed to create queue item");
  }
  return response.json();
}

async function updateQueueItem(input: UpdateQueueItemInput): Promise<QueueItem> {
  const { id, ...data } = input;
  const response = await fetch(`/api/queue/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Failed to update queue item");
  }
  return response.json();
}

async function deleteQueueItem(id: string): Promise<void> {
  const response = await fetch(`/api/queue/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete queue item");
  }
}

async function uploadNow(id: string): Promise<QueueItem> {
  const response = await fetch(`/api/queue/${id}/upload`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to upload");
  }
  return response.json();
}

export function useQueue(status?: UploadStatus) {
  return useQuery({
    queryKey: ["queue", status],
    queryFn: () => fetchQueue(status),
  });
}

export function useCreateQueueItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createQueueItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });
}

export function useUpdateQueueItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateQueueItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });
}

export function useDeleteQueueItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteQueueItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });
}

export function useUploadNow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadNow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });
}
