import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { AuthView } from "./AuthView";
import { LibraryView } from "./LibraryView";

export interface User {
  id: number;
  username: string;
}

export interface Template {
  id: number;
  name: string;
}

export interface Document {
  id: number;
  name: string;
}

// JSON content types
export interface DocumentContent {
  schema_version: string;
  page: PageConfiguration;
  elements: Element[];
}

export interface PageConfiguration {
  width_mm: number;
  height_mm: number;
  margin_left_mm: number;
  margin_right_mm: number;
  margin_top_mm: number;
  margin_bottom_mm: number;
}

export interface Element {
  id: string;
  element_type: ElementType;
  position_x_mm: number;
  position_y_mm: number;
  width_mm: number;
  height_mm: number;
  properties: ElementProperties;
}

export type ElementType = "Text" | "Checkbox" | "Image";

export type ElementProperties = any; // simplified for phase 06 UI

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const currentUser: User | null = await invoke("get_current_user");
      setUser(currentUser);
      setLoading(false);
    }
    checkUser();
  }, []);

  async function handleLogout() {
    await invoke("logout");
    setUser(null);
  }

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <AuthView onLogin={setUser} />;
  }

  return <LibraryView onLogout={handleLogout} />;
}

export default App;
