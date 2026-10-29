"use client";
export function AppLoadError({ retry, reference }: { retry:()=>void; reference?:string }) {
  return <main style={{minHeight:"100dvh",background:"#07110e",color:"#f8f4e8",display:"grid",placeItems:"center",padding:"24px",fontFamily:"Arial,sans-serif"}}>
    <section style={{maxWidth:420,width:"100%",padding:28,border:"1px solid #e5c55340",borderRadius:24,background:"#10201b"}}>
      <p style={{color:"#e5c553",fontWeight:800,letterSpacing:3,fontSize:12}}>ZENITH FITNESS</p>
      <h1 style={{fontSize:26,lineHeight:1.2,marginTop:16}}>Let’s get you back in</h1>
      <p style={{fontSize:15,lineHeight:1.6,color:"#b5c4b8"}}>The app couldn’t finish loading. Check your connection and try again. Your account and membership are saved.</p>
      <button type="button" onClick={retry} style={{minHeight:48,width:"100%",border:0,borderRadius:12,background:"#e5c553",color:"#07110e",fontWeight:800,fontSize:15,marginTop:12,cursor:"pointer"}}>Try again</button>
      <button type="button" onClick={()=>window.location.reload()} style={{minHeight:44,width:"100%",border:"1px solid #ffffff30",borderRadius:12,background:"transparent",color:"#f8f4e8",fontSize:14,marginTop:12,cursor:"pointer"}}>Reload app</button>
      {reference && <p style={{fontSize:11,color:"#8ca298",marginTop:18}}>Support reference: {reference}</p>}
    </section>
  </main>;
}
