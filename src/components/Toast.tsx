import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export type ToastType = "loading" | "success" | "error";

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    if (toast && (toast.type === "success" || toast.type === "error")) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  const ToastComponent = toast ? (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px", zIndex: 9999,
      padding: "10px 16px", borderRadius: "8px", color: "#fafafa",
      backgroundColor: "#18181b", border: "1px solid #27272a",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15)",
      display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontWeight: 500
    }}>
      {toast.type === "loading" && <Loader2 className="animate-spin" size={16} />}
      {toast.type === "success" && <CheckCircle2 color="#22c55e" size={16} />}
      {toast.type === "error" && <AlertCircle color="#ef4444" size={16} />}
      <span>{toast.message}</span>
    </div>
  ) : null;

  return { showToast, ToastComponent };
}
