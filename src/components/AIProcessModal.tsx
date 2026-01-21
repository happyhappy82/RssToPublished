"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Loader2, Save, Copy, Settings, ExternalLink, Plus, Trash2, RotateCcw } from "lucide-react";
import { getContentTypes, updateContentType, addContentType, deleteContentType, resetContentTypes } from "@/lib/constants";
import { useProcessStore } from "@/store";
import type { ScrapedContent, ContentTypeItem } from "@/types";

interface IntegrationSettings {
  notionApiKey: string;
  notionDatabaseId: string;
  makeWebhookUrl: string;
}

interface AIProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: ScrapedContent;
  onSuccess?: () => void;
}

export default function AIProcessModal({
  isOpen,
  onClose,
  content,
  onSuccess,
}: AIProcessModalProps) {
  // 전역 상태에서 처리 작업 가져오기 (상태 읽기용)
  const { processingJobs, clearProcessingJob } = useProcessStore();

  const job = processingJobs[content.id];
  const isProcessing = job?.status === "processing";

  // 콘텐츠 유형 목록 (localStorage에서 동적으로 관리)
  const [contentTypes, setContentTypes] = useState<ContentTypeItem[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [currentPrompt, setCurrentPrompt] = useState<string>("");

  // 유형 관리 모달
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypePrompt, setNewTypePrompt] = useState("");

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
  const [isSavingToNotion, setIsSavingToNotion] = useState(false);

  // 초기 로드: 콘텐츠 유형 불러오기
  useEffect(() => {
    const types = getContentTypes();
    setContentTypes(types);
    if (types.length > 0) {
      setSelectedTypeId(types[0].id);
      setCurrentPrompt(types[0].prompt);
    }
  }, []);

  // 모달 열릴 때 기존 작업 결과 복원
  useEffect(() => {
    if (isOpen && job?.status === "completed" && job.result) {
      setResult(job.result);
    }
  }, [isOpen, job]);

  // 콘텐츠 타입 변경 시 프롬프트 업데이트
  useEffect(() => {
    const selectedType = contentTypes.find(t => t.id === selectedTypeId);
    if (selectedType) {
      setCurrentPrompt(selectedType.prompt);
    }
  }, [selectedTypeId, contentTypes]);

  // 프롬프트 저장
  const savePrompt = () => {
    const selectedType = contentTypes.find(t => t.id === selectedTypeId);
    if (!selectedType) return;

    const updatedTypes = updateContentType(selectedTypeId, { prompt: currentPrompt });
    setContentTypes(updatedTypes);
    alert(`"${selectedType.label}" 유형의 프롬프트가 저장되었습니다.`);
  };

  // 유형 추가
  const handleAddType = () => {
    if (!newTypeName.trim()) {
      alert("유형 이름을 입력해주세요");
      return;
    }

    const newType: ContentTypeItem = {
      id: `custom_${Date.now()}`,
      label: newTypeName.trim(),
      prompt: newTypePrompt.trim() || "이 내용을 바탕으로 마케팅 콘텐츠를 작성해줘.",
    };

    const updatedTypes = addContentType(newType);
    setContentTypes(updatedTypes);
    setNewTypeName("");
    setNewTypePrompt("");
    setSelectedTypeId(newType.id);
    alert(`"${newType.label}" 유형이 추가되었습니다.`);
  };

  // 유형 삭제
  const handleDeleteType = (id: string) => {
    const typeToDelete = contentTypes.find(t => t.id === id);
    if (!typeToDelete) return;

    if (contentTypes.length <= 1) {
      alert("최소 1개의 유형은 있어야 합니다.");
      return;
    }

    if (!confirm(`"${typeToDelete.label}" 유형을 삭제하시겠습니까?`)) return;

    const updatedTypes = deleteContentType(id);
    setContentTypes(updatedTypes);

    // 삭제된 유형이 선택되어 있었으면 첫 번째로 변경
    if (selectedTypeId === id && updatedTypes.length > 0) {
      setSelectedTypeId(updatedTypes[0].id);
    }
  };

  // 기본값으로 초기화
  const handleResetTypes = () => {
    if (!confirm("모든 유형을 기본값으로 초기화하시겠습니까? 커스텀 유형이 모두 삭제됩니다.")) return;

    const defaultTypes = resetContentTypes();
    setContentTypes(defaultTypes);
    setSelectedTypeId(defaultTypes[0].id);
    alert("기본값으로 초기화되었습니다.");
  };

  // 백그라운드 처리 시작 - 컴포넌트 언마운트와 무관하게 동작
  const handleProcess = async () => {
    // 이미 처리 중이면 무시 (직접 스토어 확인)
    const store = useProcessStore.getState();
    if (store.processingJobs[content.id]?.status === "processing") return;

    // 전역 상태에 처리 시작 기록 (직접 스토어 접근)
    useProcessStore.getState().startProcessingJob(content.id);

    // 필요한 값들을 클로저 외부 변수로 캡처
    const contentId = content.id;
    const requestBody = {
      scraped_content_id: content.id,
      content_type: selectedTypeId,
      prompt_used: currentPrompt,
      model_settings: modelSettings,
    };

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.data?.processed_content) {
        // 직접 스토어에 접근하여 결과 저장 (컴포넌트 언마운트와 무관)
        useProcessStore.getState().completeProcessingJob(contentId, data.data.processed_content);
        // 컴포넌트가 아직 마운트되어 있으면 로컬 상태도 업데이트
        setResult(data.data.processed_content);
      } else {
        useProcessStore.getState().failProcessingJob(contentId, data.error || "AI 가공에 실패했습니다");
      }
    } catch (error) {
      console.error("Process error:", error);
      useProcessStore.getState().failProcessingJob(contentId, "AI 가공 중 오류가 발생했습니다");
    }
  };

  const handleSaveToNotion = async () => {
    if (!result.trim()) {
      alert("먼저 AI로 콘텐츠를 생성해주세요");
      return;
    }

    // 로컬 스토리지에서 연동 설정 가져오기
    const savedSettings = localStorage.getItem("integration_settings");
    const integrationSettings: IntegrationSettings | null = savedSettings
      ? JSON.parse(savedSettings)
      : null;

    // Notion 연동 확인
    if (!integrationSettings?.notionApiKey || !integrationSettings?.notionDatabaseId) {
      alert("Notion 연동이 필요합니다. 업로드 대기열 페이지에서 설정해주세요.");
      return;
    }

    const selectedType = contentTypes.find(t => t.id === selectedTypeId);

    setIsSavingToNotion(true);
    try {
      // Notion에 저장
      const response = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notionApiKey: integrationSettings.notionApiKey,
          notionDatabaseId: integrationSettings.notionDatabaseId,
          title: content.title || "AI 생성 콘텐츠",
          content: result,
          contentType: selectedType?.label || "기타",
          targetPlatforms: [],
          sourceUrl: content.original_url,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 작업 완료 후 정리
        clearProcessingJob(content.id);
        onSuccess?.();
        onClose();

        // Notion 페이지 열기
        if (data.pageUrl) {
          window.open(data.pageUrl, "_blank");
        }
      } else {
        alert(data.error || "Notion 저장에 실패했습니다");
      }
    } catch (error) {
      console.error("Notion error:", error);
      alert("Notion 저장 중 오류가 발생했습니다");
    } finally {
      setIsSavingToNotion(false);
    }
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
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-400">
                  마케팅 콘텐츠 유형
                </label>
                <button
                  onClick={() => setShowTypeManager(true)}
                  className="text-xs text-blue-500 hover:text-blue-400 flex items-center space-x-1"
                >
                  <Settings size={14} />
                  <span>유형 관리</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {contentTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedTypeId(type.id)}
                    className={`p-2.5 rounded-xl text-xs font-medium border transition-all ${
                      selectedTypeId === type.id
                        ? "bg-blue-600/20 border-blue-500 text-blue-400"
                        : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                    }`}
                  >
                    {type.label}
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

            {/* Notion 저장 */}
            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
              <button
                onClick={handleSaveToNotion}
                disabled={isSavingToNotion || !result.trim() || isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white py-3 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all"
              >
                {isSavingToNotion ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ExternalLink size={18} />
                )}
                <span>{isSavingToNotion ? "저장 중..." : "Notion에 저장"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 유형 관리 모달 */}
      {showTypeManager && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center space-x-2">
                <Settings size={20} className="text-blue-500" />
                <span>콘텐츠 유형 관리</span>
              </h3>
              <button
                onClick={() => setShowTypeManager(false)}
                className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* 새 유형 추가 */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <h4 className="text-sm font-medium text-slate-300 flex items-center space-x-2">
                  <Plus size={16} className="text-emerald-500" />
                  <span>새 유형 추가</span>
                </h4>
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="유형 이름 (예: 뉴스레터형)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <textarea
                  value={newTypePrompt}
                  onChange={(e) => setNewTypePrompt(e.target.value)}
                  placeholder="기본 프롬프트 (선택사항)"
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
                <button
                  onClick={handleAddType}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center space-x-2"
                >
                  <Plus size={16} />
                  <span>추가</span>
                </button>
              </div>

              {/* 기존 유형 목록 */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-400">기존 유형 ({contentTypes.length}개)</h4>
                {contentTypes.map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-200">{type.label}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[280px]">{type.prompt}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteType(type.id)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* 초기화 버튼 */}
              <button
                onClick={handleResetTypes}
                className="w-full py-2.5 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 rounded-xl font-medium text-sm transition-all flex items-center justify-center space-x-2"
              >
                <RotateCcw size={16} />
                <span>기본값으로 초기화</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
