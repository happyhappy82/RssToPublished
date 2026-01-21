"use client";

import { useState, useEffect, useRef } from "react";
import { X, Sparkles, Loader2, Send, Save, Copy, Settings } from "lucide-react";
import { CONTENT_TYPE_LABELS, DEFAULT_PROMPTS } from "@/lib/constants";
import { useProcessStore } from "@/store";
import type { ScrapedContent, Platform, ContentType } from "@/types";

interface AIProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: ScrapedContent;
  onSuccess?: () => void;
}

const platforms: { value: Platform; label: string }[] = [
  { value: "threads", label: "Threads" },
  { value: "twitter", label: "Twitter/X" },
  { value: "linkedin", label: "LinkedIn" },
];

export default function AIProcessModal({
  isOpen,
  onClose,
  content,
  onSuccess,
}: AIProcessModalProps) {
  // 전역 상태에서 처리 작업 가져오기
  const {
    processingJobs,
    startProcessingJob,
    completeProcessingJob,
    failProcessingJob,
    clearProcessingJob,
  } = useProcessStore();

  const job = processingJobs[content.id];
  const isProcessing = job?.status === "processing";

  // 콘텐츠 유형
  const [contentType, setContentType] = useState<ContentType>("insight");

  // 유형별 프롬프트 맵 (로컬 스토리지에서 불러오기)
  const [promptsMap, setPromptsMap] = useState<Record<ContentType, string>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("user_prompts");
      return saved ? JSON.parse(saved) : DEFAULT_PROMPTS;
    }
    return DEFAULT_PROMPTS;
  });
  const [currentPrompt, setCurrentPrompt] = useState<string>(promptsMap[contentType]);

  // 모델 설정 (로컬 스토리지에서 불러오기)
  const [modelSettings, setModelSettings] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("model_settings");
      return saved ? JSON.parse(saved) : {
        model: "gemini-3-flash-preview",
        temperature: 0.8,
        maxTokens: 65536,
      };
    }
    return { model: "gemini-3-flash-preview", temperature: 0.8, maxTokens: 65536 };
  });
  const [showModelSettings, setShowModelSettings] = useState(false);

  // 결과 (job에서 가져오거나 로컬 상태)
  const [result, setResult] = useState("");
  const [isAddingToQueue, setIsAddingToQueue] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["threads"]);

  // AbortController ref for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  // 모달 열릴 때 기존 작업 결과 복원
  useEffect(() => {
    if (isOpen && job?.status === "completed" && job.result) {
      setResult(job.result);
    }
  }, [isOpen, job]);

  // 콘텐츠 타입 변경 시 프롬프트 업데이트
  useEffect(() => {
    setCurrentPrompt(promptsMap[contentType]);
  }, [contentType, promptsMap]);

  // 프롬프트 저장
  const savePrompt = () => {
    const newMap = { ...promptsMap, [contentType]: currentPrompt };
    setPromptsMap(newMap);
    localStorage.setItem("user_prompts", JSON.stringify(newMap));
    alert(`${CONTENT_TYPE_LABELS[contentType]} 유형의 프롬프트가 저장되었습니다.`);
  };

  // 백그라운드 처리 시작
  const handleProcess = async () => {
    // 이미 처리 중이면 무시
    if (isProcessing) return;

    // 전역 상태에 처리 시작 기록
    startProcessingJob(content.id);

    // AbortController 생성 (하지만 모달 닫아도 취소 안함)
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scraped_content_id: content.id,
          content_type: contentType,
          prompt_used: currentPrompt,
          model_settings: modelSettings,
        }),
        // signal 제거 - 모달 닫아도 취소 안함
      });

      const data = await response.json();

      if (response.ok && data.data?.processed_content) {
        // 전역 상태에 결과 저장
        completeProcessingJob(content.id, data.data.processed_content);
        setResult(data.data.processed_content);
      } else {
        failProcessingJob(content.id, data.error || "AI 가공에 실패했습니다");
        alert(data.error || "AI 가공에 실패했습니다");
      }
    } catch (error) {
      // 취소된 경우가 아니면 에러 처리
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Process error:", error);
        failProcessingJob(content.id, "AI 가공 중 오류가 발생했습니다");
        alert("AI 가공 중 오류가 발생했습니다");
      }
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
        // 작업 완료 후 정리
        clearProcessingJob(content.id);
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

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    alert("클립보드에 복사되었습니다.");
  };

  if (!isOpen) return null;

  // 본문이 HTML인지 체크
  const isRawHtml = content.content?.includes("<div") || content.content?.includes("<iframe");
  const displayContent = isRawHtml ? "본문을 먼저 가져와주세요" : content.content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700/50 w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl">
              <Sparkles size={20} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">AI 콘텐츠 가공</h3>
              <p className="text-xs text-slate-500 max-w-lg truncate">{content.title || "제목 없음"}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* 생성 버튼 - 헤더에 배치 */}
            <button
              onClick={handleProcess}
              disabled={isProcessing || isRawHtml}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-700 disabled:to-slate-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center space-x-2 transition-all shadow-lg shadow-emerald-900/20"
            >
              {isProcessing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Sparkles size={18} />
              )}
              <span>{isProcessing ? "생성 중..." : "마케팅 포스트 생성"}</span>
            </button>
            <button
              onClick={() => setShowModelSettings(true)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white flex items-center space-x-1"
            >
              <Settings size={18} />
              <span className="text-sm">모델 설정</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content - 2 Column Layout */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Left Column - Settings */}
          <div className="p-6 overflow-y-auto border-r border-slate-800 space-y-5">
            {/* 원본 콘텐츠 */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                원본 콘텐츠
              </label>
              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 h-40 overflow-y-auto whitespace-pre-wrap">
                {displayContent || "내용 없음"}
              </div>
            </div>

            {/* 콘텐츠 유형 선택 */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                마케팅 콘텐츠 유형
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setContentType(type)}
                    className={`p-2.5 rounded-xl text-xs font-medium border transition-all ${
                      contentType === type
                        ? "bg-blue-600/20 border-blue-500 text-blue-400"
                        : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                    }`}
                  >
                    {CONTENT_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* 프롬프트 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-400">
                  유형별 커스텀 프롬프트
                </label>
                <button
                  onClick={savePrompt}
                  className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center space-x-1"
                >
                  <Save size={14} />
                  <span>프롬프트 저장</span>
                </button>
              </div>
              <textarea
                value={currentPrompt}
                onChange={(e) => setCurrentPrompt(e.target.value)}
                rows={8}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                placeholder="AI에게 전달할 지시사항을 입력하세요..."
              />
            </div>
          </div>

          {/* Right Column - Result */}
          <div className="p-6 overflow-y-auto space-y-4 bg-slate-950/30">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-slate-400">
                가공 완료 결과 (수정 가능)
                {isProcessing && (
                  <span className="ml-2 text-emerald-400 animate-pulse">
                    AI가 생성 중...
                  </span>
                )}
              </label>
              {result && (
                <button
                  onClick={handleCopy}
                  className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
                >
                  <Copy size={14} />
                  <span>복사</span>
                </button>
              )}
            </div>
            <textarea
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder={isProcessing
                ? "AI가 콘텐츠를 생성하고 있습니다. 잠시만 기다려주세요..."
                : "AI가 생성한 결과물이 여기에 표시됩니다. 왼쪽에서 설정을 마치고 '생성' 버튼을 눌러주세요."
              }
              className="w-full h-[calc(100%-180px)] min-h-[300px] bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-slate-200 leading-relaxed"
            />

            {/* 플랫폼 선택 & 대기열 추가 */}
            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
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

              <button
                onClick={handleAddToQueue}
                disabled={isAddingToQueue || !result.trim() || isProcessing}
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
          </div>
        </div>
      </div>

      {/* 모델 설정 모달 */}
      {showModelSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center space-x-2">
                <Settings size={20} className="text-blue-500" />
                <span>AI 모델 설정</span>
              </h3>
              <button
                onClick={() => setShowModelSettings(false)}
                className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">모델 선택</label>
                <select
                  value={modelSettings.model}
                  onChange={(e) => setModelSettings({ ...modelSettings, model: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="gemini-3-flash-preview">Gemini 3 Flash Preview (최신)</option>
                  <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash Exp</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  창의성 (Temperature): {modelSettings.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={modelSettings.temperature}
                  onChange={(e) => setModelSettings({ ...modelSettings, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>정확함</span>
                  <span>창의적</span>
                </div>
              </div>

              <button
                onClick={() => {
                  localStorage.setItem("model_settings", JSON.stringify(modelSettings));
                  setShowModelSettings(false);
                  alert("모델 설정이 저장되었습니다.");
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
