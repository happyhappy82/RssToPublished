"use client";

import { Trash2, ChevronRight, Clock } from "lucide-react";
import { useQueue, useDeleteQueueItem, useUploadNow } from "@/hooks/useQueue";

export default function QueuePage() {
  const { data: queue, isLoading } = useQueue();
  const deleteItem = useDeleteQueueItem();
  const uploadNow = useUploadNow();

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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">업로드 대기열</h2>

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
                  현재 대기 중인 업로드 항목이 없습니다.
                </td>
              </tr>
            ) : (
              queue?.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-sm line-clamp-1 text-slate-300 font-light">{item.content}</p>
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
                    >
                      <ChevronRight size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-slate-500 hover:text-red-500 p-2"
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
    </div>
  );
}
