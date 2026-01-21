"use client";

import { useState, useEffect } from "react";
import { Trash2, ChevronRight, Clock, Plus, Settings, X, ExternalLink, Database, Webhook, Eye, EyeOff } from "lucide-react";
import { useQueue, useDeleteQueueItem, useUploadNow } from "@/hooks/useQueue";

interface IntegrationSettings {
  notionApiKey: string;
  notionDatabaseId: string;
  notionEmbedUrl: string;
  makeWebhookUrl: string;
}

export default function QueuePage() {
  const { data: queue, isLoading } = useQueue();
  const deleteItem = useDeleteQueueItem();
  const uploadNow = useUploadNow();

  // 설정 모달 상태
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<IntegrationSettings>({
    notionApiKey: "",
    notionDatabaseId: "",
    notionEmbedUrl: "",
    makeWebhookUrl: "",
  });

  // 임베드 표시 여부
  const [showEmbed, setShowEmbed] = useState(true);

  // 로컬 스토리지에서 설정 불러오기
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("integration_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({
          notionApiKey: parsed.notionApiKey || "",
          notionDatabaseId: parsed.notionDatabaseId || "",
          notionEmbedUrl: parsed.notionEmbedUrl || "",
          makeWebhookUrl: parsed.makeWebhookUrl || "",
        });
      }
    }
  }, []);

  // 설정 저장
  const saveSettings = () => {
    localStorage.setItem("integration_settings", JSON.stringify(settings));
    alert("설정이 저장되었습니다.");
    setShowSettings(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("이 항목을 삭제하시겠습니까?")) {
      try {
        await deleteItem.mutateAsync(id);
      } catch {
        alert("삭제에 실패했습니다");
      }
    }
  };

  const handleUpload = async (id: string) => {
    try {
      await uploadNow.mutateAsync(id);
      alert("Buffer를 통해 업로드되었습니다!");
    } catch {
      alert("업로드에 실패했습니다. Buffer 설정을 확인해주세요.");
    }
  };

  // Notion 연동 여부 확인
  const isNotionConnected = settings.notionApiKey && settings.notionDatabaseId;
  const isMakeConnected = !!settings.makeWebhookUrl;
  const hasEmbedUrl = !!settings.notionEmbedUrl;

  // Notion 임베드 URL 변환 (공개 URL -> 임베드 URL)
  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    // notion.so URL을 임베드 가능한 형태로 변환
    // 이미 임베드 URL이면 그대로 사용
    if (url.includes("notion.site") || url.includes("notion.so")) {
      return url;
    }
    return url;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">업로드 대기열</h2>
        <button
          onClick={() => setShowSettings(true)}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition-all flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>연동 설정</span>
        </button>
      </div>

      {/* 연동 상태 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-4 rounded-xl border ${isNotionConnected ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900/50 border-slate-700/50'}`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isNotionConnected ? 'bg-emerald-500/20' : 'bg-slate-800'}`}>
              <Database size={20} className={isNotionConnected ? 'text-emerald-400' : 'text-slate-500'} />
            </div>
            <div>
              <p className="font-medium">Notion 연동</p>
              <p className="text-xs text-slate-500">
                {isNotionConnected ? '연결됨 - 콘텐츠가 Notion DB에 저장됩니다' : '설정되지 않음'}
              </p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${isMakeConnected ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-900/50 border-slate-700/50'}`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isMakeConnected ? 'bg-blue-500/20' : 'bg-slate-800'}`}>
              <Webhook size={20} className={isMakeConnected ? 'text-blue-400' : 'text-slate-500'} />
            </div>
            <div>
              <p className="font-medium">Make 웹훅</p>
              <p className="text-xs text-slate-500">
                {isMakeConnected ? '연결됨 - Buffer로 자동 발행됩니다' : '설정되지 않음'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notion 데이터베이스 임베드 */}
      {hasEmbedUrl && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Database size={18} className="text-emerald-400" />
              <span className="font-medium">Notion 데이터베이스</span>
            </div>
            <div className="flex items-center space-x-2">
              <a
                href={settings.notionEmbedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
              >
                <ExternalLink size={14} />
                <span>새 탭에서 열기</span>
              </a>
              <button
                onClick={() => setShowEmbed(!showEmbed)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                {showEmbed ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {showEmbed && (
            <div className="relative" style={{ paddingBottom: "60%", height: 0 }}>
              <iframe
                src={getEmbedUrl(settings.notionEmbedUrl)}
                className="absolute top-0 left-0 w-full h-full border-0"
                style={{ minHeight: "500px" }}
                allow="fullscreen"
              />
            </div>
          )}
        </div>
      )}

      {/* 대기열 테이블 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">콘텐츠 내용</th>
              <th className="px-6 py-4">타겟 플랫폼</th>
              <th className="px-6 py-4">상태</th>
              <th className="px-6 py-4">등록일</th>
              <th className="px-6 py-4 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  로딩 중...
                </td>
              </tr>
            ) : queue?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  <div className="space-y-2">
                    <p>현재 대기 중인 업로드 항목이 없습니다.</p>
                    {!isNotionConnected && (
                      <p className="text-xs text-slate-600">
                        Notion을 연동하면 AI 가공 결과가 여기에 표시됩니다.
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              queue?.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-sm line-clamp-2 text-slate-300 font-light">{item.content}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex -space-x-2">
                      {item.target_platforms.map((p) => (
                        <div
                          key={p}
                          className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-300"
                          title={p}
                        >
                          {p[0].toUpperCase()}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center w-fit space-x-1 ${
                        item.status === "pending"
                          ? "bg-blue-500/10 text-blue-500"
                          : item.status === "uploaded"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : item.status === "failed"
                          ? "bg-red-500/10 text-red-500"
                          : "bg-purple-500/10 text-purple-500"
                      }`}
                    >
                      <Clock size={12} />
                      <span>
                        {item.status === "pending"
                          ? "대기"
                          : item.status === "uploaded"
                          ? "완료"
                          : item.status === "failed"
                          ? "실패"
                          : "예약됨"}
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleUpload(item.id)}
                      disabled={uploadNow.isPending}
                      className="bg-slate-950 hover:bg-emerald-600/20 text-emerald-500 p-2 rounded-lg transition-colors mr-2"
                      title="지금 업로드"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-slate-500 hover:text-red-500 p-2"
                      title="삭제"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 설정 모달 */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-700/50 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-xl">
                  <Settings size={20} className="text-blue-400" />
                </div>
                <h3 className="text-lg font-bold">연동 설정</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Notion API 설정 */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Database size={18} className="text-slate-400" />
                  <h4 className="font-medium">Notion API 연동</h4>
                </div>
                <p className="text-xs text-slate-500">
                  AI로 생성된 콘텐츠를 Notion 데이터베이스에 저장합니다.{" "}
                  <a
                    href="https://www.notion.so/my-integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline inline-flex items-center"
                  >
                    Integration 만들기 <ExternalLink size={12} className="ml-1" />
                  </a>
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Notion API Key</label>
                    <input
                      type="password"
                      value={settings.notionApiKey}
                      onChange={(e) => setSettings({ ...settings, notionApiKey: e.target.value })}
                      placeholder="secret_xxxxxxxxxxxxx"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Database ID</label>
                    <input
                      type="text"
                      value={settings.notionDatabaseId}
                      onChange={(e) => setSettings({ ...settings, notionDatabaseId: e.target.value })}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-600 mt-1">
                      데이터베이스 URL에서 추출: notion.so/[Database ID]?v=...
                    </p>
                  </div>
                </div>
              </div>

              {/* Notion 임베드 설정 */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center space-x-2">
                  <Eye size={18} className="text-slate-400" />
                  <h4 className="font-medium">Notion 데이터베이스 임베드</h4>
                </div>
                <p className="text-xs text-slate-500">
                  Notion 데이터베이스를 이 페이지에서 바로 볼 수 있습니다.
                  데이터베이스를 &quot;웹에 공개&quot;한 후 URL을 입력하세요.
                </p>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Notion 공개 URL</label>
                  <input
                    type="url"
                    value={settings.notionEmbedUrl}
                    onChange={(e) => setSettings({ ...settings, notionEmbedUrl: e.target.value })}
                    placeholder="https://your-workspace.notion.site/..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-600 mt-1">
                    데이터베이스 → 공유 → 웹에 공개 → 링크 복사
                  </p>
                </div>
              </div>

              {/* Make 웹훅 설정 */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center space-x-2">
                  <Webhook size={18} className="text-slate-400" />
                  <h4 className="font-medium">Make 웹훅 (선택사항)</h4>
                </div>
                <p className="text-xs text-slate-500">
                  Make 시나리오의 웹훅 URL을 입력하면 Buffer로 자동 발행됩니다.
                </p>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Webhook URL</label>
                  <input
                    type="url"
                    value={settings.makeWebhookUrl}
                    onChange={(e) => setSettings({ ...settings, makeWebhookUrl: e.target.value })}
                    placeholder="https://hook.make.com/xxxxxxxxxxxxx"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={saveSettings}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all"
              >
                설정 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
