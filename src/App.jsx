import { useState, useRef, useEffect } from "react";

/* ─────────────────────────────────────────
   STYLES
───────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=JetBrains+Mono:wght@400;500;600&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  html, body, #root { height: 100%; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-thumb { background: #1e3a5f55; border-radius: 3px; }
  textarea, input { -webkit-appearance: none; }
  textarea:focus, input:focus { outline: none !important; }

  @keyframes fadeUp   { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
  @keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
  @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.3} }
  @keyframes spin     { to { transform: rotate(360deg) } }
  @keyframes gridScroll { to { background-position: 0 40px } }
  @keyframes scanline { 0%{top:-10%} 100%{top:110%} }
  @keyframes glowPulse { 0%,100%{box-shadow:0 0 24px #f59e0b30} 50%{box-shadow:0 0 48px #f59e0b55} }
  @keyframes typewriter { from{width:0} to{width:100%} }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes slideInRight { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
  @keyframes countUp { from{opacity:0;transform:scale(.8)} to{opacity:1;transform:scale(1)} }

  .btn-primary { transition: all .2s cubic-bezier(.4,0,.2,1); }
  .btn-primary:active { transform: scale(.96); }
  .step-card { animation: fadeUp .35s ease both; }
  .result-line { animation: fadeUp .25s ease both; }
  .chip-anim { transition: all .15s; }
  .chip-anim:active { transform: scale(.94); }
`;

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const STEPS = [
  { id: "input",    label: "Sujet",    icon: "✦" },
  { id: "analyze",  label: "Analyse",  icon: "◎" },
  { id: "script",   label: "Script",   icon: "◈" },
];

const ACCENT = "#f59e0b";
const ACCENT_GLOW = "#f59e0b33";

/* ─────────────────────────────────────────
   API CALLS
───────────────────────────────────────── */
async function analyzeSubject(subject) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Tu es un expert en création de contenu viral pour les vidéos courtes (YouTube Shorts, TikTok, Reels).

Pour une vidéo courte sur le sujet : "${subject}"

Donne-moi les meilleurs éléments pour remplir ces 4 détails. Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, sans explication :

{
  "niche": "la niche précise de cette vidéo (ex: Personal Finance for Gen Z, AI Productivity, etc.)",
  "videoFormat": "le format optimal pour ce sujet (ex: Tutorial, Storytime, Listicle, Commentary, etc.)",
  "styleOfWriting": "le style d'écriture le plus efficace pour ce sujet et ce format (ex: Conversational & Direct, Educational but Entertaining, etc.)",
  "briefDescription": "une description précise de ce que la vidéo va couvrir, l'angle choisi, le message clé, et pourquoi ce sera viral"
}`
      }]
    })
  });
  const data = await res.json();
  const text = data.content.map(b => b.text || "").join("");
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

async function generateScript(subject, analysis) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are now a professional YouTube Shorts scriptwriter.

Here are the 4 details about this script:

1. My Niche: ${analysis.niche}
2. Video Format: ${analysis.videoFormat}
3. Style of Writing: ${analysis.styleOfWriting}
4. Brief Description: ${analysis.briefDescription}

Topic: ${subject}

CRITICAL INSTRUCTIONS — follow every single one:

FORMULA: Hook > Intro > Introduce a Problem/Challenge > Exploration/Development > Climax/Key Moment > Conclusion

HOOK RULES — use one of these three types:
- The Direct Hook: target a specific person/problem. Example: "Are you a business owner struggling to sign clients?"
- The Controversy Hook: say something emotionally stirring that you back up. Example: "Here's what nobody tells you about AI."
- The Negative Hook: humans are drawn to negativity. Example: "Stop making this mistake in your videos."

Never start with "Hi guys", "Welcome back", or anything boring like that.
Never use words like: 'folks', 'fellow', 'embarking', 'enchanting', 'welcome back', 'delve', 'dive in'.
Never use complex words. Write for someone under 18 or a non-native English speaker.
Write like you're talking to someone on the street — casual, real, human.
Do NOT include stage directions or action cues.
The script MUST be over 100 words. Be descriptive enough to hit that count.
Just give me the script I can copy and paste. No titles, no labels, no sections headers — just the raw script text.`
      }]
    })
  });
  const data = await res.json();
  return data.content.map(b => b.text || "").join("").trim();
}

/* ─────────────────────────────────────────
   WORD COUNT
───────────────────────────────────────── */
const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length;

/* ─────────────────────────────────────────
   MAIN APP
───────────────────────────────────────── */
export default function GenPro() {
  const [step, setStep] = useState("input");
  const [subject, setSubject] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [script, setScript] = useState("");
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState("script");
  const hiddenRef = useRef(null);
  const inputRef = useRef(null);

  const LOADING_MSGS = [
    "Analyse du sujet en cours…",
    "Détermination de la niche…",
    "Choix du format optimal…",
    "Définition du style d'écriture…",
    "Construction du brief…",
    "Rédaction du hook viral…",
    "Développement du script…",
    "Optimisation pour la rétention…",
    "Vérification du nombre de mots…",
    "Finalisation…",
  ];

  useEffect(() => {
    let i = 0;
    if (step === "loading") {
      setLoadingMsg(LOADING_MSGS[0]);
      const interval = setInterval(() => {
        i = (i + 1) % LOADING_MSGS.length;
        setLoadingMsg(LOADING_MSGS[i]);
      }, 1800);
      return () => clearInterval(interval);
    }
  }, [step]);

  const handleGenerate = async () => {
    if (!subject.trim()) return;
    setError("");
    setStep("loading");
    try {
      const analyzed = await analyzeSubject(subject);
      setAnalysis(analyzed);
      const generatedScript = await generateScript(subject, analyzed);
      setScript(generatedScript);
      setStep("result");
    } catch (e) {
      setError("Une erreur est survenue. Vérifie ta connexion et réessaie.");
      setStep("input");
    }
  };

  const handleCopy = () => {
    const text = activeView === "script" ? script :
      `NICHE: ${analysis?.niche}\nFORMAT: ${analysis?.videoFormat}\nSTYLE: ${analysis?.styleOfWriting}\nDESCRIPTION: ${analysis?.briefDescription}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); })
        .catch(() => legacyCopy(text));
    } else legacyCopy(text);
  };

  const legacyCopy = (text) => {
    const el = hiddenRef.current;
    if (!el) return;
    el.value = text; el.style.display = "block"; el.focus(); el.select();
    el.setSelectionRange(0, text.length);
    document.execCommand("copy");
    el.style.display = "none";
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };

  const wc = script ? wordCount(script) : 0;

  return (
    <>
      <style>{css}</style>
      <div style={{
        height: "100vh", background: "#03080f",
        color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif",
        display: "flex", flexDirection: "column",
        maxWidth: "480px", margin: "0 auto",
        position: "relative", overflow: "hidden",
      }}>

        {/* ANIMATED BG */}
        <div style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          backgroundImage: `linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px)`,
          backgroundSize: "36px 36px",
          animation: "gridScroll 7s linear infinite",
        }} />
        <div style={{
          position: "fixed", top: "-180px", right: "-80px", zIndex: 0, pointerEvents: "none",
          width: "400px", height: "400px", borderRadius: "50%",
          background: "radial-gradient(circle, #f59e0b0a 0%, transparent 70%)",
        }} />
        <div style={{
          position: "fixed", bottom: "-180px", left: "-80px", zIndex: 0, pointerEvents: "none",
          width: "350px", height: "350px", borderRadius: "50%",
          background: "radial-gradient(circle, #3b82f608 0%, transparent 70%)",
        }} />

        {/* HEADER */}
        <header style={{
          position: "relative", zIndex: 10, flexShrink: 0,
          padding: "14px 18px 12px",
          background: "rgba(3,8,15,0.88)", backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: "linear-gradient(135deg, #f59e0b, #f97316)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 16px #f59e0b44",
            }}>
              <span style={{ fontSize: "16px", fontWeight: "900", color: "#000", fontFamily: "'Syne', sans-serif" }}>G</span>
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: "900", color: "#f1f5f9", fontFamily: "'Syne', sans-serif", letterSpacing: "-0.01em", lineHeight: 1 }}>
                GenPro
              </div>
              <div style={{ fontSize: "9px", color: "#334155", letterSpacing: "0.12em", marginTop: "2px" }}>
                SCRIPT GENERATOR
              </div>
            </div>
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "6px 12px", borderRadius: "20px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: step === "loading" ? "#f59e0b" : "#10b981",
              animation: step === "loading" ? "pulse 1s ease infinite" : "none",
            }} />
            <span style={{ fontSize: "10px", color: "#475569", fontFamily: "'Syne', sans-serif", fontWeight: "700", letterSpacing: "0.06em" }}>
              {step === "loading" ? "GÉNÉRATION" : step === "result" ? "PRÊT" : "STANDBY"}
            </span>
          </div>
        </header>

        {/* STEP INDICATOR */}
        <div style={{
          position: "relative", zIndex: 10, flexShrink: 0,
          padding: "12px 18px",
          background: "rgba(3,8,15,0.7)", backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          display: "flex", alignItems: "center", gap: "0",
        }}>
          {STEPS.map((s, i) => {
            const current = step === "input" ? 0 : step === "loading" ? 1 : 2;
            const done = i < current;
            const active = i === current;
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "8px",
                    background: done ? "#10b981" : active ? ACCENT : "rgba(255,255,255,0.04)",
                    border: `1px solid ${done ? "#10b981" : active ? ACCENT : "rgba(255,255,255,0.06)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: done ? "12px" : "11px",
                    color: done || active ? "#000" : "#1e3a5f",
                    fontWeight: "900", fontFamily: "'Syne', sans-serif",
                    boxShadow: active ? `0 0 16px ${ACCENT_GLOW}` : "none",
                    transition: "all 0.3s",
                  }}>
                    {done ? "✓" : s.icon}
                  </div>
                  <span style={{
                    fontSize: "9px", fontWeight: "700", letterSpacing: "0.08em",
                    color: active ? ACCENT : done ? "#10b981" : "#1e3a5f",
                    transition: "color 0.3s",
                  }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    flex: 1, height: "1px", margin: "0 4px", marginBottom: "14px",
                    background: done ? "#10b981" : "rgba(255,255,255,0.06)",
                    transition: "background 0.3s",
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, overflowY: "auto", position: "relative", zIndex: 5 }}>

          {/* INPUT SCREEN */}
          {step === "input" && (
            <div style={{ padding: "28px 18px 100px", animation: "fadeUp .4s ease" }}>
              <div style={{ marginBottom: "32px", textAlign: "center" }}>
                <div style={{
                  display: "inline-block",
                  padding: "5px 14px", borderRadius: "20px",
                  background: `${ACCENT}14`,
                  border: `1px solid ${ACCENT}30`,
                  fontSize: "10px", fontWeight: "700", color: ACCENT,
                  letterSpacing: "0.12em", fontFamily: "'Syne', sans-serif",
                  marginBottom: "14px",
                }}>100% AUTOMATISÉ · POWERED BY AI</div>
                <h1 style={{
                  fontSize: "28px", fontWeight: "900", color: "#f1f5f9",
                  fontFamily: "'Syne', sans-serif", lineHeight: 1.15,
                  letterSpacing: "-0.02em", marginBottom: "10px",
                }}>
                  Génère ton script<br />
                  <span style={{
                    background: `linear-gradient(135deg, ${ACCENT}, #f97316)`,
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  }}>viral en 1 clic</span>
                </h1>
                <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.6 }}>
                  Entre ton sujet. L'IA s'occupe du reste —<br />
                  brief, niche, format, hook et script complet.
                </p>
              </div>

              <div style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "20px", padding: "20px",
                marginBottom: "16px",
                boxShadow: "0 4px 32px rgba(0,0,0,0.3)",
              }}>
                <div style={{ fontSize: "10px", fontWeight: "800", letterSpacing: "0.14em", color: "#334155", marginBottom: "10px" }}>
                  ✦ SUJET DE TA VIDÉO
                </div>
                <textarea
                  ref={inputRef}
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleGenerate())}
                  placeholder="Ex: Comment l'IA peut remplacer un community manager..."
                  style={{
                    width: "100%", minHeight: "90px", resize: "none",
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${subject ? ACCENT + "40" : "rgba(255,255,255,0.07)"}`,
                    borderRadius: "14px", color: "#e2e8f0",
                    padding: "13px 15px", fontSize: "14px",
                    fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6,
                    transition: "border-color .2s, box-shadow .2s",
                    boxShadow: subject ? `0 0 0 3px ${ACCENT}15` : "none",
                  }}
                />

                <div style={{ marginTop: "12px" }}>
                  <div style={{ fontSize: "9px", color: "#1e3a5f", letterSpacing: "0.1em", marginBottom: "8px" }}>EXEMPLES :</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {[
                      "Les 5 outils IA pour créer du contenu",
                      "Comment gagner de l'argent avec ChatGPT",
                      "Les erreurs des débutants sur TikTok",
                      "Automatiser son business avec l'IA",
                    ].map(ex => (
                      <button key={ex} className="chip-anim" onClick={() => setSubject(ex)} style={{
                        padding: "6px 11px", borderRadius: "20px", cursor: "pointer",
                        border: "1px solid rgba(255,255,255,0.07)",
                        background: subject === ex ? `${ACCENT}18` : "rgba(255,255,255,0.03)",
                        color: subject === ex ? ACCENT : "#475569",
                        fontSize: "10px", fontWeight: "600",
                        fontFamily: "'DM Sans', sans-serif",
                      }}>{ex}</button>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div style={{
                  padding: "12px 16px", borderRadius: "12px",
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                  color: "#ef4444", fontSize: "12px", marginBottom: "16px",
                }}>{error}</div>
              )}

              <button className="btn-primary" onClick={handleGenerate} disabled={!subject.trim()} style={{
                width: "100%", padding: "18px",
                borderRadius: "16px", border: "none", cursor: subject.trim() ? "pointer" : "not-allowed",
                background: subject.trim()
                  ? `linear-gradient(135deg, ${ACCENT} 0%, #f97316 100%)`
                  : "rgba(255,255,255,0.04)",
                color: subject.trim() ? "#000" : "#1e3a5f",
                fontFamily: "'Syne', sans-serif", fontWeight: "900",
                fontSize: "15px", letterSpacing: "0.03em",
                boxShadow: subject.trim() ? `0 8px 32px ${ACCENT_GLOW}, 0 1px 0 rgba(255,255,255,0.2) inset` : "none",
                transition: "all .25s cubic-bezier(.4,0,.2,1)",
                animation: subject.trim() ? "glowPulse 3s ease infinite" : "none",
              }}>
                {subject.trim() ? "⚡ Générer le Script Viral" : "Entre un sujet pour commencer"}
              </button>

              <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  { icon: "◎", label: "Analyse auto", desc: "Niche + Format + Style" },
                  { icon: "✦", label: "Hook viral", desc: "3 types de hooks" },
     
