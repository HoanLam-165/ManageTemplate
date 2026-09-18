import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { HashRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import { AuthView } from "./AuthView";
import { LibraryView } from "./LibraryView";
import { Editor } from "./Editor";

export interface User { id: number; username: string; }
export interface Template { id: number; name: string; metadata: string; description?: string; is_system: boolean; }
export interface Document { id: number; name: string; metadata: string; source_template_id?: number | null; }
export interface DocumentContent { schema_version: string; page: PageConfiguration; elements: Element[]; }
export interface PageConfiguration { width_mm: number; height_mm: number; margin_left_mm: number; margin_right_mm: number; margin_top_mm: number; margin_bottom_mm: number; }
export interface Element { id: string; element_type: ElementType; position_x_mm: number; position_y_mm: number; width_mm: number; height_mm: number; properties: any; }
export type ElementType = "Text" | "Checkbox" | "Image";

function MainApp() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      try {
        const currentUser: User | null = await invoke("get_current_user");
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkUser();
  }, []);

  async function handleLogout() {
    await invoke("logout");
    setUser(null);
  }

  if (loading) return <div>Loading...</div>;
  if (!user) return <AuthView onLogin={setUser}/>;
  return <LibraryView onLogout={handleLogout}/>;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<MainApp />} path="/"/>
        <Route element={<Editor />} path="/editor"/>
      </Routes>
    </HashRouter>
  );
}
