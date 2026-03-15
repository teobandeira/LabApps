export default function OpenGraphImageView() {
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
          "radial-gradient(1200px 600px at -10% -10%, #34d39922 0%, transparent 60%), radial-gradient(1200px 600px at 110% 110%, #60a5fa22 0%, transparent 60%), linear-gradient(135deg, #0f172a 0%, #111827 100%)",
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
          backgroundColor: "#10b981",
          color: "white",
          borderRadius: 14,
          padding: "10px 16px",
          boxShadow: "0 6px 20px rgba(16,185,129,0.35)",
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            backgroundColor: "#ffffff",
          }}
        />
        <span style={{ fontSize: 24, fontWeight: 700 }}>ItapoáDelivery</span>
      </div>
      <h1
        style={{
          marginTop: 24,
          fontSize: 72,
          fontWeight: 800,
          letterSpacing: -1.2,
          lineHeight: 1.05,
        }}
      >
        Sua comida favorita, entregue em minutos
      </h1>
      <p
        style={{
          marginTop: 16,
          fontSize: 28,
          color: "#d1d5db",
          maxWidth: 920,
        }}
      >
        Explore restaurantes perto de você, acompanhe em tempo real e economize
        com ofertas exclusivas.
      </p>
    </div>
  );
}
