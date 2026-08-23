import { useState, useEffect } from "react";

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
      position: "fixed", bottom: "20px", right: "20px", zIndex: 9999,
      padding: "15px", borderRadius: "5px", color: "white",
      backgroundColor: toast.type === "loading" ? "#2980b9" : toast.type === "success" ? "#27ae60" : "#c0392b"
    }}>
      {toast.type === "loading" ? "⏳ " : toast.type === "success" ? "✓ " : "✕ "}
      {toast.message}
    </div>
  ) : null;

  return { showToast, ToastComponent };
}
