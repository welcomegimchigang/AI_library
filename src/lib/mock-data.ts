import type { ToolItem } from "@/lib/types";

export const sampleTools: ToolItem[] = [
  {
    id: "1",
    name: "ClipForge AI",
    description: "쇼츠/릴스 편집을 자동화해주는 영상 특화 도구",
    features: ["자동 컷편집", "자막", "템플릿"],
    price: "Freemium",
    score: 4.8,
    image: "https://images.unsplash.com/photo-1611532736579-6b16e2b50449?q=80&w=1200&auto=format&fit=crop",
    url: "#",
  },
  {
    id: "2",
    name: "DesignPulse",
    description: "브랜드 시각 요소를 빠르게 만드는 디자인 어시스턴트",
    features: ["썸네일", "브랜드 키트", "이미지 생성"],
    price: "Paid",
    score: 4.6,
    image: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?q=80&w=1200&auto=format&fit=crop",
    url: "#",
  },
  {
    id: "3",
    name: "DevPilot Studio",
    description: "개발 워크플로우에서 코드 리뷰와 테스트를 지원",
    features: ["코드 리뷰", "테스트", "문서화"],
    price: "Free",
    score: 4.7,
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop",
    url: "#",
  },
];

export const chatExamples = [
  "무료 영상 편집 AI 추천해줘",
  "디자인 작업에 좋은 툴 알려줘",
  "개발 생산성 올려주는 AI 뭐가 좋아?",
];
