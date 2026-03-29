import { useState } from "react";

export default function GenPro() {
  const [subject, setSubject] = useState("");

  return (
    <div style={{background:"#03080f",height:"100vh",color:"white",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"20px"}}>
      <h1 style={{color:"#f59e0b"}}>GenPro ⚡</h1>
      <input
        value={subject}
        onChange={e => setSubject(e.target.value)}
        placeholder="Entre ton sujet..."
        style={{padding:"12px",borderRadius:"8px",width:"280px",background:"#1a1a2e",color:"white",border:"1px solid #f59e0b"}}
      />
      <button style={{padding:"12px 24px",background:"#f59e0b",border:"none",borderRadius:"8px",fontWeight:"bold",cursor:"pointer"}}>
        Générer ⚡
      </button>
    </div>
  );
}
