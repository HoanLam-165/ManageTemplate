import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
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
    <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9" }}>
      <div style={{ width: "380px", backgroundColor: "#ffffff", padding: "32px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}>
        <div style={{ marginBottom: "24px", textAlign: "center" }}>
          <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: "0" }}>📑 Template Workspace</h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "8px 0 0" }}>Đăng nhập để quản lý và tái sử dụng biểu mẫu</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>Username</label>
            <input style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", boxSizing: "border-box" }} placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>Password</label>
            <input style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", boxSizing: "border-box" }} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button style={{ width: "100%", padding: "10px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }} type="submit">{isRegister ? "Đăng ký" : "Đăng nhập"}</button>
        </form>
        <div style={{ marginTop: "16px", textAlign: "center", fontSize: "14px" }}>
          <button style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: "500" }} onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký"}
          </button>
        </div>
        {error && <div style={{ marginTop: "20px", padding: "12px", backgroundColor: "#fef2f2", color: "#dc2626", borderRadius: "8px", fontSize: "14px", textAlign: "center" }}>{error}</div>}
      </div>
    </div>
  );
}
