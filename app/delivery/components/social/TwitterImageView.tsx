export default function TwitterImageView() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: 64,
        background:
          "radial-gradient(1200px 600px at -10% -10%, #34d39922 0%, transparent 60%), radial-gradient(1200px 600px at 110% 110%, #60a5fa22 0%, transparent 60%), linear-gradient(135deg, #065f46 0%, #047857 100%)",
        color: "#ffffff",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 14,
          backgroundColor: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.25)",
          color: "white",
          borderRadius: 14,
          padding: "10px 16px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            backgroundColor: "#10b981",
          }}
        />
        <span style={{ fontSize: 24, fontWeight: 700 }}>ItapoáDelivery</span>
      </div>
      <h1
        style={{
          marginTop: 24,
          fontSize: 68,
          fontWeight: 800,
          letterSpacing: -1.1,
          lineHeight: 1.05,
        }}
      >
        Peça online. Receba rápido.
      </h1>
      <p
        style={{
          marginTop: 16,
          fontSize: 28,
          color: "#e5e7eb",
          maxWidth: 920,
        }}
      >
        Restaurantes selecionados, rastreamento em tempo real e ofertas para
        você.
      </p>
    </div>
  );
}
