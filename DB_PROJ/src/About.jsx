// About.jsx - About Us page with maintenance content
import { useNavigate } from "react-router-dom";

export default function About() {
  const navigate = useNavigate();

  return (
    <div style={{ 
      fontFamily: "'DM Sans', 'DM Mono', monospace, sans-serif", 
      minHeight: "100vh", 
      background: "#030303", 
      color: "#E8E8E8" 
    }}>
      {/* HEADER */}
      <div style={{ 
        background: "#000000", 
        borderBottom: "1px solid #E5484D", 
        padding: "16px 40px", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between" 
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 48,
            height: 48,
            background: "#E5484D",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "skewX(-8deg)"
          }}>
            <span
            onClick={() => navigate("/")}
            style={{ 
              color: "#000000", 
              fontSize: 28, 
              fontWeight: 800, 
              fontFamily: "'DM Sans', sans-serif",
              transform: "skewX(8deg)",
              display: "inline-block"
            }}>⛭</span>
          </div>
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: 32, 
              fontWeight: 800, 
              letterSpacing: "-0.03em", 
              fontFamily: "'DM Sans', sans-serif",
              lineHeight: 1
            }}>
              <span onClick={() => navigate("/")} style={{ color: "#6A6A6A" }}>EDGE</span>
              <span onClick={() => navigate("/")} style={{ color: "#E5484D" }}>CAST</span>
            </h1>
            <p 
            onClick={() => navigate("/")}
            style={{
                 
              margin: "4px 0 0", 
              fontSize: 9, 
              color: "#E5484D", 
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.1em",
              textTransform: "uppercase"
            }}>FORECAST ENGINE</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <button 
            onClick={() => navigate("/about")}
            style={{ 
              fontSize: 13, 
              color: "#E5484D", 
              fontFamily: "'DM Sans', sans-serif", 
              border: "1px solid #E5484D", 
              padding: "8px 20px",
              background: "#E5484D10", 
              cursor: "pointer",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase"
            }}>
            ABOUT US
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 40px" }}>
        <div style={{ 
          background: "#000000", 
          border: "1px solid #1F1F1F", 
          padding: "40px" 
        }}>
          <h2 style={{ 
            color: "#E5484D", 
            fontFamily: "'DM Mono', monospace", 
            fontSize: 16, 
            marginBottom: 20, 
            textTransform: "uppercase",
            letterSpacing: "0.08em"
          }}>
            \\ Definition of 'Maintenance Page'
          </h2>

          <p style={{ color: "#CFCFCF", fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
            An inconvenient webpage designed to alert users that something has gone amiss with the page they're trying to access. Usually, these messages are accompanied by a sincere apology from the development team for having dropped the ball.
          </p>

          <h2 style={{ 
            color: "#E5484D", 
            fontFamily: "'DM Mono', monospace", 
            fontSize: 16, 
            marginBottom: 20, 
            textTransform: "uppercase",
            letterSpacing: "0.08em"
          }}>
            \\ Investopedia explains 'Maintenance Page'
          </h2>

          <p style={{ color: "#CFCFCF", fontSize: 14, lineHeight: 1.7 }}>
            Our site is down for periodic maintenance and we are working diligently to fix the page you requested as soon as we can. We understand the inconvenience this may cause, but rest assured, we are doing everything we can to bring the site back online. We're sincerely sorry! Please try us again shortly and we'll do our best to be prepared this time. Thank you.
          </p>

          <div style={{ marginTop: 32, textAlign: "center" }}>
          </div>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #030303; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #050505; }
        ::-webkit-scrollbar-thumb { background: #E5484D; }
        button:hover { opacity: 0.85; }
      `}</style>
    </div>
  );
}