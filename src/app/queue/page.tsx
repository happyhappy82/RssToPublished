"use client";

import { useState, useEffect } from "react";
import { Trash2, Clock, Settings, X, ExternalLink, Database, Webhook, Calendar, Upload, CheckSquare, Square, Loader2 } from "lucide-react";
import { useQueue, useDeleteQueueItem, useBatchSetDates, useBatchUploadToNotion } from "@/hooks/useQueue";

interface IntegrationSettings {
  notionApiKey: string;
  notionDatabaseId: string;
  notionEmbedUrl: string;
  makeWebhookUrl: string;
}

export default function QueuePage() {
  const { data: queue, isLoading, refetch } = useQueue();
  const deleteItem = useDeleteQueueItem();
  const batchSetDates = useBatchSetDates();
  const batchUploadToNotion = useBatchUploadToNotion();

  // 선택된 항목 ID
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 설정 모달 상태
  const [showSettings, setShowSettings] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [settings, setSettings] = useState<IntegrationSettings>({
    notionApiKey: "",
    notionDatabaseId: "",
    notionEmbedUrl: "",
    makeWebhookUrl: "",
  });

  // 날짜 설정 옵션
  const [customStartDate, setCustomStartDate] = useState("");
  const [customStartTime, setCustomStartTime] = useState("09:00");
  const [customInterval, setCustomInterval] = useState(24);

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

      // 내일 날짜를 기본값으로 설정
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setCustomStartDate(tomorrow.toISOString().split("T")[0]);
    }
  }, []);

  // 설정 저장
  const saveSettings = () => {
    localStorage.setItem("integration_settings", JSON.stringify(settings));
    alert("설정이 저장되었습니다.");
    setShowSettings(false);
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    const pendingItems = queue?.filter(item => item.status === "pending" || item.status === "scheduled") || [];
    if (selectedIds.size === pendingItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingItems.map(item => item.id)));
    }
  };

  // 단일 항목 선택/해제
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // 빠른 날짜 설정 (내일 오전 9시부터 1일 간격)
  const handleQuickDateSet = async () => {
    if (selectedIds.size === 0) {
      alert("먼저 항목을 선택해주세요");
      return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    try {
      await batchSetDates.mutateAsync({
        ids: Array.from(selectedIds),
        startDate: tomorrow.toISOString(),
        intervalHours: 24,
      });
      alert(`${selectedIds.size}개 항목의 날짜가 설정되었습니다.`);
      setSelectedIds(new Set());
      refetch();
    } catch {
      alert("날짜 설정에 실패했습니다");
    }
  };

  // 커스텀 날짜 설정
  const handleCustomDateSet = async () => {
    if (selectedIds.size === 0) {
      alert("먼저 항목을 선택해주세요");
      return;
    }

    if (!customStartDate) {
      alert("시작 날짜를 선택해주세요");
      return;
    }

    const startDateTime = new Date(`${customStartDate}T${customStartTime}:00`);

    try {
      await batchSetDates.mutateAsync({
        ids: Array.from(selectedIds),
        startDate: startDateTime.toISOString(),
        intervalHours: customInterval,
      });
      alert(`${selectedIds.size}개 항목의 날짜가 설정되었습니다.`);
      setSelectedIds(new Set());
      setShowDateModal(false);
      refetch();
    } catch {
      alert("날짜 설정에 실패했습니다");
    }
  };

  // 일괄 Notion 저장
  const handleBatchNotionUpload = async () => {
    if (selectedIds.size === 0) {
      alert("먼저 항목을 선택해주세요");
      return;
    }

    if (!settings.notionApiKey || !settings.notionDatabaseId) {
      alert("Notion 연동 설정이 필요합니다.");
      setShowSettings(true);
      return;
    }

    if (!confirm(`선택한 ${selectedIds.size}개 항목을 Notion에 저장하시겠습니까?`)) {
      return;
    }

    try {
      const result = await batchUploadToNotion.mutateAsync({
        ids: Array.from(selectedIds),
        notionApiKey: settings.notionApiKey,
        notionDatabaseId: settings.notionDatabaseId,
      });
      alert(`${result.uploaded}개 저장 완료, ${result.failed}개 실패`);
      setSelectedIds(new Set());
      refetch();
    } catch {
      alert("Notion 저장에 실패했습니다");
    }
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

  // Notion 연동 여부 확인
  const isNotionConnected = settings.notionApiKey && settings.notionDatabaseId;
  const isMakeConnected = !!settings.makeWebhookUrl;
  const hasEmbedUrl = !!settings.notionEmbedUrl;

  // pending/scheduled 항목만 선택 가능
  const selectableItems = queue?.filter(item => item.status === "pending" || item.status === "scheduled") || [];
  const isAllSelected = selectableItems.length > 0 && selectedIds.size === selectableItems.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">업로드 대기열</h2>
        <button
          onClick={() => setShowSettings(true)}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition-all flex items-center space-x-2"
        >
          <Settings size={18} />
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

      {/* Notion 데이터베이스 바로가기 */}
      {hasEmbedUrl && (
        <a
          href={settings.notionEmbedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-2xl p-5 transition-all hover:shadow-lg hover:shadow-emerald-500/10 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-emerald-500/20 rounded-xl group-hover:bg-emerald-500/30 transition-colors">
                <Database size={24} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg group-hover:text-emerald-400 transition-colors">Notion 데이터베이스 열기</h3>
                <p className="text-sm text-slate-500">콘텐츠 관리 및 발행 상태 확인</p>
              </div>
            </div>
            <ExternalLink size={20} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
        </a>
      )}

      {/* 액션 버튼 영역 */}
      {selectableItems.length > 0 && (
        <div className="flex flex-wrap gap-3 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
          <span className="text-sm text-slate-400 self-center">
            {selectedIds.size > 0 ? `${selectedIds.size}개 선택됨` : "항목을 선택하세요"}
          </span>
          <div className="flex-1" />

          {/* 빠른 날짜 설정 */}
          <button
            onClick={handleQuickDateSet}
            disabled={selectedIds.size === 0 || batchSetDates.isPending}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white rounded-xl font-medium transition-all flex items-center space-x-2 text-sm"
          >
            <Calendar size={16} />
            <span>내일부터 1일 간격</span>
          </button>

          {/* 커스텀 날짜 설정 */}
          <button
            onClick={() => setShowDateModal(true)}
            disabled={selectedIds.size === 0}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-xl font-medium transition-all flex items-center space-x-2 text-sm"
          >
            <Settings size={16} />
            <span>날짜 직접 설정</span>
          </button>

          {/* 일괄 Notion 저장 */}
          <button
            onClick={handleBatchNotionUpload}
            disabled={selectedIds.size === 0 || batchUploadToNotion.isPending || !isNotionConnected}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-xl font-medium transition-all flex items-center space-x-2 text-sm"
          >
            {batchUploadToNotion.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            <span>일괄 Notion 저장</span>
          </button>
        </div>
      )}

      {/* 대기열 테이블 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-4 w-12">
                <button onClick={toggleSelectAll} className="p-1 hover:bg-slate-800 rounded">
                  {isAllSelected ? <CheckSquare size={18} className="text-emerald-500" /> : <Square size={18} />}
                </button>
              </th>
              <th className="px-4 py-4">콘텐츠</th>
              <th className="px-4 py-4">유형</th>
              <th className="px-4 py-4">예약 날짜</th>
              <th className="px-4 py-4">상태</th>
              <th className="px-4 py-4 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  로딩 중...
                </td>
              </tr>
            ) : queue?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  <div className="space-y-2">
                    <p>현재 대기 중인 업로드 항목이 없습니다.</p>
                    <p className="text-xs text-slate-600">
                      AI 가공 후 &quot;대기열에 추가&quot; 버튼을 눌러 항목을 추가하세요.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              queue?.map((item) => {
                const isSelectable = item.status === "pending" || item.status === "scheduled";
                const isSelected = selectedIds.has(item.id);

                return (
                  <tr key={item.id} className={`hover:bg-slate-800/30 transition-colors ${isSelected ? 'bg-emerald-500/5' : ''}`}>
                    <td className="px-4 py-4">
                      {isSelectable ? (
                        <button onClick={() => toggleSelect(item.id)} className="p-1 hover:bg-slate-800 rounded">
                          {isSelected ? <CheckSquare size={18} className="text-emerald-500" /> : <Square size={18} className="text-slate-500" />}
                        </button>
                      ) : (
                        <span className="text-slate-700">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 max-w-xs">
                      <p className="text-sm font-medium text-slate-200 truncate">{item.title || "제목 없음"}</p>
                      <p className="text-xs text-slate-500 line-clamp-1">{item.content}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs font-medium">
                        {item.content_type || "기타"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {item.scheduled_at ? (
                        <div className="text-slate-300">
                          <p>{new Date(item.scheduled_at).toLocaleDateString("ko-KR")}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(item.scheduled_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-600">미설정</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
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
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-slate-500 hover:text-red-500 p-2"
                        title="삭제"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 날짜 설정 모달 */}
      {showDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-700/50 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-500/20 rounded-xl">
                  <Calendar size={20} className="text-purple-400" />
                </div>
                <h3 className="text-lg font-bold">날짜 직접 설정</h3>
              </div>
              <button
                onClick={() => setShowDateModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-sm text-slate-400">
                선택한 {selectedIds.size}개 항목에 순차적으로 날짜가 설정됩니다.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">시작 날짜</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">시작 시간</label>
                  <select
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, "0");
                      const displayHour = i === 0 ? "오전 12" : i < 12 ? `오전 ${i}` : i === 12 ? "오후 12" : `오후 ${i - 12}`;
                      return (
                        <option key={hour} value={`${hour}:00`}>
                          {displayHour}:00
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">간격 (시간)</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={customInterval}
                      onChange={(e) => setCustomInterval(Math.max(1, Math.min(168, Number(e.target.value) || 1)))}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-sm text-slate-400 whitespace-nowrap">시간</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">1~168시간 (최대 7일)</p>
                </div>
              </div>

              <button
                onClick={handleCustomDateSet}
                disabled={batchSetDates.isPending}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white rounded-xl font-bold transition-all flex items-center justify-center space-x-2"
              >
                {batchSetDates.isPending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Calendar size={18} />
                )}
                <span>날짜 설정</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

              {/* Notion 바로가기 설정 */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center space-x-2">
                  <ExternalLink size={18} className="text-slate-400" />
                  <h4 className="font-medium">Notion 바로가기</h4>
                </div>
                <p className="text-xs text-slate-500">
                  Notion 데이터베이스 링크를 등록하면 대기열 페이지에서 바로 열 수 있습니다.
                </p>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Notion 데이터베이스 URL</label>
                  <input
                    type="url"
                    value={settings.notionEmbedUrl}
                    onChange={(e) => setSettings({ ...settings, notionEmbedUrl: e.target.value })}
                    placeholder="https://www.notion.so/your-database-..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
