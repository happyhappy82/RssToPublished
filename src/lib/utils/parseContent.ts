export interface ParsedContent {
  mainContent: string;
  threadPosts: string[];
  comments: string[];
  hasStructure: boolean;
}

/**
 * 콘텐츠를 본문, 연속 포스트, 댓글로 파싱
 * Threads 형식: [본문], [연속 포스트], [댓글] 섹션
 */
export function parseContent(content: string): ParsedContent {
  if (!content) {
    return {
      mainContent: "",
      threadPosts: [],
      comments: [],
      hasStructure: false,
    };
  }

  // Threads 형식 감지
  const hasMainSection = content.includes("[본문]");
  const hasThreadSection = content.includes("[연속 포스트]");
  const hasCommentSection = content.includes("[댓글]");

  // 구조화된 콘텐츠가 아니면 전체를 본문으로 처리
  if (!hasMainSection) {
    return {
      mainContent: content.trim(),
      threadPosts: [],
      comments: [],
      hasStructure: false,
    };
  }

  const result: ParsedContent = {
    mainContent: "",
    threadPosts: [],
    comments: [],
    hasStructure: true,
  };

  // [본문] 추출
  if (hasMainSection) {
    const mainMatch = content.match(/\[본문\]\n([\s\S]*?)(?=\n\n\[|$)/);
    if (mainMatch) {
      result.mainContent = mainMatch[1].trim();
    }
  }

  // [연속 포스트] 추출
  if (hasThreadSection) {
    const threadMatch = content.match(/\[연속 포스트\]\n([\s\S]*?)(?=\n\n\[|$)/);
    if (threadMatch) {
      const threadText = threadMatch[1];
      // 1번:, 2번: 형식으로 분리
      const threadItems = threadText.split(/\n\n\d+번:\n/).filter(Boolean);
      result.threadPosts = threadItems.map((item) => item.trim());
    }
  }

  // [댓글] 추출
  if (hasCommentSection) {
    const commentMatch = content.match(/\[댓글\]\n([\s\S]*?)$/);
    if (commentMatch) {
      const commentText = commentMatch[1];
      // 각 댓글 라인 분리 (- @로 시작하거나 └로 시작)
      const commentLines = commentText
        .split("\n")
        .filter((line) => line.trim().startsWith("-") || line.trim().startsWith("└"));
      result.comments = commentLines.map((line) => line.trim());
    }
  }

  return result;
}

/**
 * ParsedContent를 다시 전체 텍스트로 변환
 */
export function stringifyContent(parsed: ParsedContent): string {
  let result = "";

  if (parsed.mainContent) {
    result += `[본문]\n${parsed.mainContent}`;
  }

  if (parsed.threadPosts.length > 0) {
    result += "\n\n[연속 포스트]";
    parsed.threadPosts.forEach((post, idx) => {
      result += `\n\n${idx + 1}번:\n${post}`;
    });
  }

  if (parsed.comments.length > 0) {
    result += "\n\n[댓글]\n";
    result += parsed.comments.join("\n");
  }

  return result;
}
