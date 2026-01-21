"use client";

import { useState } from "react";
import { X, Sparkles, Loader2, Send, Save } from "lucide-react";
import type { ScrapedContent, Platform } from "@/types";

interface AIProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: ScrapedContent;
  onSuccess?: () => void;
}

const DEFAULT_PROMPT = `다음 콘텐츠를 한국 SNS용으로 재작성해주세요.
- 짧고 임팩트 있게
- 이모지 적절히 사용
- 핵심만 전달`;

export default function AIProcessModal({
  isOpen,
  onClose,
  content,
  onSuccess,
}: AIProcessModalProps) {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [result, setResult] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddingToQueue, setIsAddingToQueue] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["threads"]);

  const platforms: { value: Platform; label: string }[] = [
    { value: "threads", label: "Threads" },
    { value: "twitter", label: "Twitter/X" },
    { value: "linkedin", label: "LinkedIn" },
  ];

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scraped_content_id: content.id,
          content_type: "insight",
          prompt_used: prompt,
        }),
      });

      const data = await response.json();
      if (response.ok && data.data?.processed_content) {
        setResult(data.data.processed_content);
      } else {
        alert(data.error || "AI 가공에 실패했습니다");
      }
    } catch (error) {
      console.error("Process error:", error);
      alert("AI 가공 중 오류가 발생했습니다");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddToQueue = async () => {
    if (!result.trim()) {
      alert("먼저 AI로 콘텐츠를 생성해주세요");
      return;
    }
    if (selectedPlatforms.length === 0) {
      alert("업로드할 플랫폼을 선택해주세요");
      return;
    }

    setIsAddingToQueue(true);
    try {
      const response = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: result,
          target_platforms: selectedPlatforms,
        }),
      });

      if (response.ok) {
        alert("대기열에 추가되었습니다!");
        onSuccess?.();
        onClose();
      } else {
        const data = await response.json();
        alert(data.error || "대기열 추가에 실패했습니다");
      }
    } catch (error) {
      console.error("Queue error:", error);
      alert("대기열 추가 중 오류가 발생했습니다");
    } finally {
      setIsAddingToQueue(false);
    }
  };

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  if (!isOpen) return null;

  // 본문이 HTML인지 체크
  const isRawHtml = content.content?.includes("<div") || content.content?.includes("<iframe");
  const displayContent = isRawHtml ? "본문을 먼저 가져와주세요" : content.content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl">
              <Sparkles size={20} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">AI 콘텐츠 가공</h3>
              <p className="text-xs text-slate-500">{content.title || "제목 없음"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 원본 콘텐츠 */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              원본 콘텐츠
            </label>
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 max-h-32 overflow-y-auto">
              {displayContent || "내용 없음"}
            </div>
          </div>

          {/* 프롬프트 */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              프롬프트 (지시사항)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              placeholder="AI에게 전달할 지시사항을 입력하세요..."
            />
          </div>

          {/* 생성 버튼 */}
          <button
            onClick={handleProcess}
            disabled={isProcessing || isRawHtml}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white py-3 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all"
          >
            {isProcessing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Sparkles size={18} />
            )}
            <span>{isProcessing ? "생성 중..." : "AI로 콘텐츠 만들기"}</span>
          </button>

          {/* 결과 (편집 가능) */}
          {result && (
            <div className="space-y-3 pt-2">
              <label className="block text-sm font-medium text-slate-400">
                생성된 콘텐츠 (수정 가능)
              </label>
              <textarea
                value={result}
                onChange={(e) => setResult(e.target.value)}
                rows={8}
                className="w-full bg-slate-950 border border-emerald-500/30 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />

              {/* 플랫폼 선택 */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  업로드 플랫폼
                </label>
                <div className="flex flex-wrap gap-2">
                  {platforms.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => togglePlatform(p.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        selectedPlatforms.includes(p.value)
                          ? "bg-blue-600 text-white"
                          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 대기열 추가 버튼 */}
              <button
                onClick={handleAddToQueue}
                disabled={isAddingToQueue}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white py-3 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all"
              >
                {isAddingToQueue ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
                <span>{isAddingToQueue ? "추가 중..." : "대기열에 추가"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
