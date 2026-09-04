import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FileText } from "lucide-react";
import { User } from "./App";

interface AuthViewProps {
  onLogin: (user: User) => void;
}

export function AuthView({ onLogin }: AuthViewProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) {
        await invoke("register", { username, password });
        setIsRegister(false);
        setError("Account created. Please login.");
      } else {
        const user: User = await invoke("login", { username, password });
        onLogin(user);
      }
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#f4f4f5" }}>
      <div style={{ width: "380px", backgroundColor: "#ffffff", padding: "32px", borderRadius: "12px", border: "1px solid #e4e4e7", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
        <div style={{ marginBottom: "32px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            <div style={{ backgroundColor: "#18181b", color: "#ffffff", padding: "12px", borderRadius: "10px" }}>
              <FileText size={24} />
            </div>
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: "600", margin: "0", color: "#09090b" }}>Template Workspace</h1>
          <p style={{ fontSize: "14px", color: "#71717a", margin: "8px 0 0" }}>Đăng nhập để tiếp tục làm việc</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "500", marginBottom: "6px", color: "#27272a" }}>Username</label>
            <input 
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e4e4e7", outline: "none", transition: "border-color 0.2s, ring 0.2s", boxSizing: "border-box" }} 
              onFocus={(e) => { e.target.style.borderColor = "#18181b"; e.target.style.boxShadow = "0 0 0 2px #e4e4e7"; }}
              onBlur={(e) => { e.target.style.borderColor = "#e4e4e7"; e.target.style.boxShadow = "none"; }}
              placeholder="Nhập tên đăng nhập" value={username} onChange={(e) => setUsername(e.target.value)} 
            />
          </div>
          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "500", marginBottom: "6px", color: "#27272a" }}>Password</label>
            <input 
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e4e4e7", outline: "none", transition: "border-color 0.2s, ring 0.2s", boxSizing: "border-box" }} 
              type="password" 
              onFocus={(e) => { e.target.style.borderColor = "#18181b"; e.target.style.boxShadow = "0 0 0 2px #e4e4e7"; }}
              onBlur={(e) => { e.target.style.borderColor = "#e4e4e7"; e.target.style.boxShadow = "none"; }}
              placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} 
            />
          </div>
          <button style={{ width: "100%", padding: "10px", backgroundColor: "#18181b", color: "white", border: "none", borderRadius: "8px", fontWeight: "500", cursor: "pointer", transition: "background 0.2s" }} type="submit">{isRegister ? "Đăng ký" : "Đăng nhập"}</button>
        </form>
        <div style={{ marginTop: "16px", textAlign: "center", fontSize: "13px" }}>
          <button style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer", fontWeight: "500" }} onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký"}
          </button>
        </div>
        {error && <div style={{ marginTop: "20px", padding: "10px", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "8px", fontSize: "13px", textAlign: "center", border: "1px solid #fee2e2" }}>{error}</div>}
      </div>
    </div>
  );
}
