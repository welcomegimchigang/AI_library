import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export interface Tool {
  id: number;
  name: string;
  description: string;
  category: string;
  url: string;
  isFree: boolean;
  thumbnail?: string;
  monthly_visits?: number;
}

interface ToolContextType {
  tools: Tool[];
  loading: boolean;
  error: string | null;
  compareIds: number[];
  toggleCompare: (id: number) => void;
  clearCompare: () => void;
  refreshTools: () => Promise<void>;
}

const ToolContext = createContext<ToolContextType | undefined>(undefined);

export function ToolProvider({ children }: { children: ReactNode }) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<number[]>([]);

  const toggleCompare = (id: number) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 3) {
        alert("최대 3개까지만 비교 가능합니다.");
        return prev;
      }
      return [...prev, id];
    });
  };

  const clearCompare = () => setCompareIds([]);

  const loadTools = async () => {
    setLoading(true);
    try {
      const res = await fetch("/data/tools.jsonl");
      if (!res.ok) throw new Error("Failed to load tools data");
      const text = await res.text();
      const lines = text.split("\n").filter((line) => line.trim() !== "");
      const parsedTools: Tool[] = lines
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      setTools(parsedTools);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTools();
  }, []);

  return (
    <ToolContext.Provider
      value={{
        tools,
        loading,
        error,
        compareIds,
        toggleCompare,
        clearCompare,
        refreshTools: loadTools,
      }}
    >
      {children}
    </ToolContext.Provider>
  );
}

export function useTools() {
  const context = useContext(ToolContext);
  if (context === undefined) {
    throw new Error("useTools must be used within a ToolProvider");
  }
  return context;
}
