import { ExternalLink, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ToolItem } from "@/lib/types";

type Props = {
  tool: ToolItem;
};

export function AIToolCard({ tool }: Props) {
  return (
    <Card className="overflow-hidden bg-white/85">
      <div className="aspect-[16/9] overflow-hidden bg-slate-200">
        <img src={tool.image} alt={tool.name} className="h-full w-full object-cover" loading="lazy" />
      </div>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base md:text-lg">{tool.name}</CardTitle>
          <Badge className="border-transparent bg-slate-900 text-white">{tool.price}</Badge>
        </div>
        <CardDescription>{tool.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-1 text-sm text-amber-500">
          <Star size={15} fill="currentColor" />
          <span className="font-semibold">{tool.score.toFixed(1)}</span>
          <span className="text-slate-500">추천 점수</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {tool.features.map((feature) => (
            <Badge key={feature} className="bg-slate-100 text-slate-700">
              {feature}
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Button className="flex-1">자세히 보기</Button>
          <Button variant="secondary" className="flex-1">
            <span className="inline-flex items-center gap-1">
              공식 링크
              <ExternalLink size={14} />
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
