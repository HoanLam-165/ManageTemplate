import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Image as ImageIcon } from "lucide-react";

export function ImageElement({ assetId }: { assetId: number }) {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    if (assetId) {
      invoke<string>("get_asset_base64", { id: assetId })
        .then(setSrc)
        .catch(console.error);
    }
  }, [assetId]);

  return src ? (
    <img
      src={src}
      draggable={false}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        pointerEvents: "none",
        userSelect: "none",
        display: "block",
      }}
    />
  ) : (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "#f8fafc",
        color: "#a1a1aa",
        fontSize: "11px",
        gap: "6px",
        pointerEvents: "none",
      }}
    >
      <ImageIcon size={20} /> Chưa có ảnh
    </div>
  );
}
