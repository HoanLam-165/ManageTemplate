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
    <div className="container">
      <h1>{isRegister ? "Register" : "Login"}</h1>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">{isRegister ? "Register" : "Login"}</button>
      </form>
      <button onClick={() => setIsRegister(!isRegister)}>
        {isRegister ? "Back to Login" : "Need an account? Register"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
