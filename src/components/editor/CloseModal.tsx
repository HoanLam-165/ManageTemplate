import React from 'react';

interface CloseModalProps {
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => Promise<void>;
}

export const CloseModal: React.FC<CloseModalProps> = ({ onCancel, onDiscard, onSave }) => {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "24px",
          borderRadius: "12px",
          width: "320px",
          border: "1px solid #e4e4e7",
        }}
      >
        <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 16px" }}>
          Chưa lưu thay đổi
        </h3>
        <p style={{ fontSize: "14px", color: "#71717a", marginBottom: "24px" }}>
          Bạn có muốn lưu các thay đổi trước khi thoát không?
        </p>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #e4e4e7",
              background: "white",
              cursor: "pointer",
            }}
            onClick={onCancel}
          >
            Hủy
          </button>
          <button
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "none",
              background: "#fef2f2",
              color: "#991b1b",
              cursor: "pointer",
            }}
            onClick={onDiscard}
          >
            Không lưu
          </button>
          <button
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "none",
              background: "#18181b",
              color: "white",
              cursor: "pointer",
            }}
            onClick={onSave}
          >
            Lưu và thoát
          </button>
        </div>
      </div>
    </div>
  );
};
