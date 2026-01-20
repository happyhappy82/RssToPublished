
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Rss, 
  Sparkles, 
  ListOrdered, 
  Plus, 
  Trash2, 
  ExternalLink, 
  RefreshCcw,
  Copy,
  ChevronRight,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Loader2,
  Save,
  Settings,
  CheckSquare,
  Square,
  Globe,
  Youtube,
  Twitter,
  Linkedin,
  MessageCircle
} from 'lucide-react';
import { 
  NavigationTab, 
  Source, 
  ScrapedContent, 
  ContentType, 
  QueueItem,
  Platform
} from './types';
import { 
  MOCK_SOURCES, 
  MOCK_SCRAPED, 
  CONTENT_TYPE_LABELS, 
  DEFAULT_PROMPTS 
} from './constants';
import { geminiService } from './services/gemini';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>(NavigationTab.Dashboard);
  const [sources, setSources] = useState<Source[]>(MOCK_SOURCES as Source[]);
  const [scraped, setScraped] = useState<ScrapedContent[]>(MOCK_SCRAPED as ScrapedContent[]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  
  // 소스 추가 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSource, setNewSource] = useState<{name: string, url: string, platform: Platform}>({
    name: '',
    url: '',
    platform: 'YouTube'
  });
  const [isAddingSource, setIsAddingSource] = useState(false);

  // 가공기 상태
  const [selectedScraped, setSelectedScraped] = useState<ScrapedContent | null>(null);
  const [contentType, setContentType] = useState<ContentType>('insight');
  const [aiResult, setAiResult] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 프롬프트 관리 상태 (유형별 저장)
  const [promptsMap, setPromptsMap] = useState<Record<ContentType, string>>(() => {
    const saved = localStorage.getItem('user_prompts');
    return saved ? JSON.parse(saved) : DEFAULT_PROMPTS;
  });
  const [currentPrompt, setCurrentPrompt] = useState<string>(promptsMap[contentType]);

  // 대기열 전송 플랫폼 선택
  const [targetPlatforms, setTargetPlatforms] = useState<Platform[]>(['Threads', 'LinkedIn']);

  // 대시보드 통계 계산
  const stats = useMemo(() => {
    const activeCount = sources.filter(s => s.status === 'active').length;
    const platformBreakdown = sources.reduce((acc, curr) => {
      acc[curr.platform] = (acc[curr.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      activeCount,
      platformBreakdown,
      scrapedCount: scraped.length,
      queueCount: queue.length
    };
  }, [sources, scraped, queue]);

  // 콘텐츠 유형 변경 시 해당 유형의 프롬프트 불러오기
  useEffect(() => {
    setCurrentPrompt(promptsMap[contentType]);
  }, [contentType, promptsMap]);

  // 프롬프트 로컬 스토리지 저장
  const savePrompt = () => {
    const newMap = { ...promptsMap, [contentType]: currentPrompt };
    setPromptsMap(newMap);
    localStorage.setItem('user_prompts', JSON.stringify(newMap));
    alert(`${CONTENT_TYPE_LABELS[contentType]} 유형의 프롬프트가 저장되었습니다.`);
  };

  const handleProcess = async () => {
    if (!selectedScraped) return;
    setIsProcessing(true);
    try {
      const result = await geminiService.processContent(selectedScraped.originalText, currentPrompt);
      setAiResult(result || '결과가 생성되지 않았습니다.');
    } catch (err) {
      alert('AI 처리에 실패했습니다. API 설정이나 연결 상태를 확인해주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSource.url || !newSource.name) return;
    setIsAddingSource(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const source: Source = {
      id: Math.random().toString(36).substr(2, 9),
      platform: newSource.platform,
      name: newSource.name,
      url: newSource.url,
      status: 'active',
      lastScraped: '방금 전'
    };
    setSources([source, ...sources]);
    setIsAddingSource(false);
    setIsModalOpen(false);
    setNewSource({ name: '', url: '', platform: 'YouTube' });
  };

  const addToQueue = () => {
    if (!aiResult) return;
    if (targetPlatforms.length === 0) {
      alert('최소 하나 이상의 플랫폼을 선택해주세요.');
      return;
    }
    const newItem: QueueItem = {
      id: Math.random().toString(36).substr(2, 9),
      content: aiResult,
      status: 'pending',
      targetPlatforms: [...targetPlatforms],
      createdAt: new Date().toISOString()
    };
    setQueue([newItem, ...queue]);
    setActiveTab(NavigationTab.Queue);
  };

  const togglePlatform = (p: Platform) => {
    if (targetPlatforms.includes(p)) {
      setTargetPlatforms(targetPlatforms.filter(item => item !== p));
    } else {
      setTargetPlatforms([...targetPlatforms, p]);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case NavigationTab.Dashboard:
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">대시보드</h2>
            
            {/* 통계 카드 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 활성 소스 카드 */}
              <div 
                onClick={() => setActiveTab(NavigationTab.Sources)}
                className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-blue-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-xl bg-slate-950 text-blue-500 group-hover:scale-110 transition-transform">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm font-medium">활성 소스</p>
                    <p className="text-3xl font-bold">{stats.activeCount}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(stats.platformBreakdown).map(([platform, count]) => (
                    <span key={platform} className="text-[10px] bg-slate-950 px-2 py-1 rounded-md text-slate-400 border border-slate-800">
                      {platform}: {count}
                    </span>
                  ))}
                </div>
              </div>

              {/* 수집 콘텐츠 카드 */}
              <div 
                onClick={() => setActiveTab(NavigationTab.Scraped)}
                className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-xl bg-slate-950 text-emerald-500 group-hover:scale-110 transition-transform">
                    <Rss size={24} />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm font-medium">수집된 콘텐츠</p>
                    <p className="text-3xl font-bold">{stats.scrapedCount}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-xs text-slate-500">
                  <Clock size={12} className="mr-1" />
                  <span>오늘 총 {scraped.filter(s => new Date(s.createdAt).toDateString() === new Date().toDateString()).length}건 수집됨</span>
                </div>
              </div>

              {/* 대기열 항목 카드 */}
              <div 
                onClick={() => setActiveTab(NavigationTab.Queue)}
                className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-purple-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-xl bg-slate-950 text-purple-500 group-hover:scale-110 transition-transform">
                    <ListOrdered size={24} />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm font-medium">업로드 대기열</p>
                    <p className="text-3xl font-bold">{stats.queueCount}</p>
                  </div>
                </div>
                <div className="mt-4">
                   <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full w-2/3"></div>
                   </div>
                   <p className="text-[10px] text-slate-500 mt-1">오늘의 업로드 할당량 (8/12)</p>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-semibold">최근 수집 피드</h3>
                <button 
                  onClick={() => setActiveTab(NavigationTab.Scraped)}
                  className="text-sm text-slate-400 hover:text-white"
                >
                  전체 보기
                </button>
              </div>
              <div className="divide-y divide-slate-800">
                {scraped.slice(0, 5).map(item => (
                  <div key={item.id} className="p-4 flex justify-between items-center hover:bg-slate-800/50 transition-colors group">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-slate-950 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-blue-400">
                        {item.platform === 'YouTube' && <Youtube size={16} />}
                        {item.platform === 'Twitter' && <Twitter size={16} />}
                        {item.platform === 'LinkedIn' && <Linkedin size={16} />}
                        {item.platform === 'Threads' && <MessageCircle size={16} />}
                      </div>
                      <div>
                        <p className="font-medium text-sm line-clamp-1">{item.title}</p>
                        <p className="text-[10px] text-slate-500">{item.sourceName} • {new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setSelectedScraped(item); setActiveTab(NavigationTab.Processor); }}
                      className="p-2 bg-slate-950 hover:bg-emerald-600/20 rounded-lg text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="AI 마케팅 가공"
                    >
                      <Sparkles size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case NavigationTab.Sources:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">해외 소스 관리</h2>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-all shadow-lg shadow-blue-900/20"
              >
                <Plus size={18} />
                <span>계정 추가</span>
              </button>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">플랫폼</th>
                    <th className="px-6 py-4">계정명</th>
                    <th className="px-6 py-4">상태</th>
                    <th className="px-6 py-4">최근 수집</th>
                    <th className="px-6 py-4 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {sources.map(s => (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                         <div className="flex items-center space-x-2">
                            <span className="bg-slate-800 p-1.5 rounded-lg text-slate-300">
                              {s.platform === 'YouTube' && <Youtube size={14} />}
                              {s.platform === 'Twitter' && <Twitter size={14} />}
                              {s.platform === 'LinkedIn' && <Linkedin size={14} />}
                              {s.platform === 'Threads' && <MessageCircle size={14} />}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">{s.platform}</span>
                         </div>
                      </td>
                      <td className="px-6 py-4 font-medium">{s.name}</td>
                      <td className="px-6 py-4">
                        <span className="flex items-center space-x-1.5 text-xs text-emerald-500">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>수집 중</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{s.lastScraped}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button className="p-2 text-slate-400 hover:text-white bg-slate-950 rounded-lg hover:bg-slate-800 transition-colors"><RefreshCcw size={16}/></button>
                        <button className="p-2 text-slate-400 hover:text-red-500 bg-slate-950 rounded-lg hover:bg-slate-800 transition-colors"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case NavigationTab.Scraped:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">수집된 콘텐츠 목록</h2>
            <div className="grid grid-cols-1 gap-4">
              {scraped.map(item => (
                <div key={item.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-slate-600 transition-all flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 shadow-sm">
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-1 bg-slate-950 rounded text-slate-400">
                        {item.platform === 'YouTube' && <Youtube size={12} />}
                        {item.platform === 'Twitter' && <Twitter size={12} />}
                        {item.platform === 'LinkedIn' && <Linkedin size={12} />}
                        {item.platform === 'Threads' && <MessageCircle size={12} />}
                      </div>
                      <span className="text-xs font-bold text-blue-500">{item.platform}</span>
                      <span className="text-xs text-slate-500">• {item.sourceName}</span>
                      <span className="text-xs text-slate-500">• {new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-lg font-bold">{item.title}</h4>
                    <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">{item.originalText}</p>
                  </div>
                  <div className="flex items-center space-x-3 w-full md:w-auto">
                    <a href={item.url} target="_blank" className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors">
                      <ExternalLink size={18} />
                    </a>
                    <button 
                      onClick={() => { setSelectedScraped(item); setActiveTab(NavigationTab.Processor); }}
                      className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl flex items-center justify-center space-x-2 font-medium transition-all"
                    >
                      <Sparkles size={18} />
                      <span>AI로 가공</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case NavigationTab.Processor:
        return (
          <div className="space-y-6 h-full flex flex-col">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">콘텐츠 AI 랩</h2>
              <button 
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 px-4 rounded-xl flex items-center space-x-2 text-sm transition-all"
                onClick={() => alert('Gemini 모델 및 시스템 설정창이 준비 중입니다.')}
              >
                <Settings size={18} />
                <span>모델 설정</span>
              </button>
            </div>
            
            {!selectedScraped ? (
              <div className="flex-1 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 space-y-4">
                <Search size={48} />
                <p>수집된 콘텐츠를 선택하여 AI 마케팅 가공을 시작하세요.</p>
                <button onClick={() => setActiveTab(NavigationTab.Scraped)} className="text-emerald-500 underline">콘텐츠 선택하기</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-hidden pb-4">
                {/* 설정 영역 */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col space-y-6 overflow-y-auto">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-semibold uppercase text-slate-500">원본 소스</h3>
                      <button onClick={() => setSelectedScraped(null)} className="text-xs text-slate-500 hover:text-white flex items-center space-x-1">
                        <X size={12} />
                        <span>콘텐츠 변경</span>
                      </button>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-32 overflow-y-auto text-sm text-slate-300">
                      {selectedScraped.originalText}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">마케팅 콘텐츠 유형</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((type) => (
                          <button
                            key={type}
                            onClick={() => setContentType(type)}
                            className={`p-2 rounded-xl text-xs font-medium border transition-all ${
                              contentType === type 
                              ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                              : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                            }`}
                          >
                            {CONTENT_TYPE_LABELS[type]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-sm font-medium">유형별 커스텀 프롬프트</label>
                        <button 
                          onClick={savePrompt}
                          className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center space-x-1"
                        >
                          <Save size={14} />
                          <span>프롬프트 저장</span>
                        </button>
                      </div>
                      <textarea 
                        rows={5}
                        value={currentPrompt}
                        onChange={(e) => setCurrentPrompt(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-light leading-relaxed"
                        placeholder={`${CONTENT_TYPE_LABELS[contentType]} 유형을 위한 지시사항을 입력하세요...`}
                      />
                    </div>

                    <button 
                      onClick={handleProcess}
                      disabled={isProcessing}
                      className={`w-full py-4 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all ${isProcessing ? 'bg-slate-700 cursor-not-allowed text-slate-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-blue-900/40'}`}
                    >
                      {isProcessing ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                      <span>{isProcessing ? 'AI가 마케팅 문구 작성 중...' : '마케팅 포스트 생성'}</span>
                    </button>
                  </div>
                </div>

                {/* 결과 및 대기열 전송 */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col space-y-4 overflow-hidden">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold uppercase text-slate-500">가공 완료 결과</h3>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(aiResult); alert('클립보드에 복사되었습니다.'); }}
                      className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors"
                      disabled={!aiResult}
                    >
                      <Copy size={18}/>
                    </button>
                  </div>
                  <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-5 overflow-y-auto whitespace-pre-wrap text-slate-200 text-sm leading-relaxed scrollbar-hide">
                    {aiResult || "AI가 생성한 결과물이 여기에 표시됩니다. 왼쪽에서 설정을 마치고 '생성' 버튼을 눌러주세요."}
                  </div>
                  
                  {aiResult && (
                    <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-500">게시 채널 선택</span>
                        <div className="flex space-x-4">
                          {(['Threads', 'LinkedIn', 'Twitter'] as Platform[]).map(p => (
                            <button 
                              key={p}
                              onClick={() => togglePlatform(p)}
                              className="flex items-center space-x-2 text-xs transition-colors"
                            >
                              {targetPlatforms.includes(p) ? <CheckSquare size={16} className="text-blue-500" /> : <Square size={16} className="text-slate-600" />}
                              <span className={targetPlatforms.includes(p) ? 'text-white' : 'text-slate-500'}>{p}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <button 
                        onClick={addToQueue}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20"
                      >
                        업로드 대기열에 추가하기
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case NavigationTab.Queue:
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
                  {queue.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">현재 대기 중인 업로드 항목이 없습니다.</td>
                    </tr>
                  ) : queue.map(item => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-sm line-clamp-1 text-slate-300 font-light">{item.content}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex -space-x-2">
                          {item.targetPlatforms.map(p => (
                            <div key={p} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-300" title={p}>
                              {p[0]}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full text-[10px] font-bold flex items-center w-fit space-x-1">
                          <Clock size={12} />
                          <span>대기</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-mono">{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="bg-slate-950 hover:bg-emerald-600/20 text-emerald-500 p-2 rounded-lg transition-colors mr-2"><ChevronRight size={18} /></button>
                        <button onClick={() => setQueue(queue.filter(q => q.id !== item.id))} className="text-slate-500 hover:text-red-500 p-2"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 selection:bg-blue-500/30">
      {/* 계정 추가 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center space-x-2">
                <Plus size={20} className="text-blue-500" />
                <span>새 마케팅 소스 추가</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddSource} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">플랫폼 선택</label>
                <div className="grid grid-cols-2 gap-2">
                  {['YouTube', 'Twitter', 'LinkedIn', 'Threads'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewSource({...newSource, platform: p as Platform})}
                      className={`py-2 rounded-xl text-sm font-medium border transition-all ${newSource.platform === p ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">계정 별명</label>
                <input type="text" required value={newSource.name} onChange={e => setNewSource({...newSource, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="예: 안드레 파시 뉴스레터" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">계정 URL 또는 RSS</label>
                <input type="url" required value={newSource.url} onChange={e => setNewSource({...newSource, url: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="https://..." />
              </div>
              <button type="submit" disabled={isAddingSource} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-blue-900/20 transition-all">
                {isAddingSource ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                <span>{isAddingSource ? '수집기 연결 중...' : '소스 등록 및 수집 시작'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 사이드바 */}
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex">
        <div className="p-8">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent flex items-center space-x-2">
            <Sparkles size={24} className="text-blue-400" />
            <span>AI 마케팅 허브</span>
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {[
            { id: NavigationTab.Dashboard, label: '대시보드', icon: LayoutDashboard },
            { id: NavigationTab.Sources, label: '해외 소스 관리', icon: Users },
            { id: NavigationTab.Scraped, label: '수집 결과 확인', icon: Rss },
            { id: NavigationTab.Processor, label: '콘텐츠 AI 랩', icon: Sparkles },
            { id: NavigationTab.Queue, label: '업로드 대기열', icon: ListOrdered }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-slate-800">
          <div className="bg-slate-950 p-4 rounded-2xl flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center font-bold text-xs text-white">관리</div>
            <div>
              <p className="text-xs font-bold text-slate-200">마케팅 관리자</p>
              <p className="text-[10px] text-slate-500">Free 요금제 사용 중</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#020617] p-8">
        <div className="max-w-6xl mx-auto h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
