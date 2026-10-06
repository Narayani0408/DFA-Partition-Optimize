import {useRef,useState,PointerEvent as PE} from 'react';
import {DFA} from './algorithm';
export type Hi={splitter?:string[];X?:string[];symbol?:string};
export const PAL=['#6366f1','#22c55e','#f59e0b','#ec4899','#06b6d4','#a855f7','#ef4444','#84cc16'];
const W=560,H=420,R=24;
export default function DFAGraph({dfa,hi,colors,id}:{dfa:DFA;hi?:Hi;colors?:Record<string,number>;id:string}){
  const [vw,setVw]=useState({z:1,x:0,y:0});const pts=useRef(new Map<number,[number,number]>());const pd=useRef(0);
  const zoomBy=(f:number)=>setVw(v=>{const z=Math.min(4,Math.max(.5,v.z*f));return {z,x:v.x+W/v.z/2-W/z/2,y:v.y+H/v.z/2-H/z/2};});
  const down=(e:PE)=>{pts.current.set(e.pointerId,[e.clientX,e.clientY]);(e.currentTarget as Element).setPointerCapture?.(e.pointerId);};
  const move=(e:PE)=>{const m=pts.current,p=m.get(e.pointerId);if(!p)return;const r=(e.currentTarget as Element).getBoundingClientRect();
    if(m.size===1)setVw(v=>({...v,x:v.x-(e.clientX-p[0])*(W/v.z)/r.width,y:v.y-(e.clientY-p[1])*(H/v.z)/r.height}));
    else if(m.size===2){const o=[...m.entries()].find(([k])=>k!==e.pointerId)![1],d=Math.hypot(e.clientX-o[0],e.clientY-o[1]);if(pd.current)zoomBy(d/pd.current);pd.current=d;}
    m.set(e.pointerId,[e.clientX,e.clientY]);};
  const end=(e:PE)=>{pts.current.delete(e.pointerId);pd.current=0;};
  const n=dfa.states.length,cx=W/2,cy=H/2,rad=n===1?0:Math.min(165,60+n*22);
  const pos:Record<string,[number,number]>={};
  dfa.states.forEach((s,i)=>{const a=-Math.PI/2+2*Math.PI*i/n;pos[s]=[cx+rad*Math.cos(a),cy+rad*Math.sin(a)];});
  const edges=new Map<string,{f:string;t:string;syms:string[]}>();
  for(const s of dfa.states)for(const a of dfa.alphabet){const t=dfa.transitions[s][a];const k=s+'\u0001'+t;
    if(!edges.has(k))edges.set(k,{f:s,t,syms:[]});edges.get(k)!.syms.push(a);}
  const active=(f:string,t:string,syms:string[])=>!!hi?.symbol&&syms.includes(hi.symbol)&&!!hi.X?.includes(f)&&!!hi.splitter?.includes(t);
  const dim=(s:string)=>hi&&hi.splitter&&!hi.splitter.includes(s)&&!hi.X?.includes(s);
  return <div className="gw"><svg viewBox={`${vw.x} ${vw.y} ${W/vw.z} ${H/vw.z}`} className="graph" role="img" aria-label="DFA state diagram" onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
    <defs><marker id={id+'a'} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="currentColor"/></marker></defs>
    {[...edges.values()].map((e,k)=>{const [x1,y1]=pos[e.f],[x2,y2]=pos[e.t];let d:string,lx:number,ly:number;
      if(e.f===e.t){const a=Math.atan2(y1-cy,x1-cx),o=n===1?-Math.PI/2:a,
        sx=x1+R*Math.cos(o-.5),sy=y1+R*Math.sin(o-.5),ex=x1+R*Math.cos(o+.5),ey=y1+R*Math.sin(o+.5);
        d=`M${sx},${sy} C${x1+75*Math.cos(o-.5)},${y1+75*Math.sin(o-.5)} ${x1+75*Math.cos(o+.5)},${y1+75*Math.sin(o+.5)} ${ex},${ey}`;
        lx=x1+68*Math.cos(o);ly=y1+68*Math.sin(o);}
      else{const mx=(x1+x2)/2,my=(y1+y2)/2,dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1,c=Math.min(45,L/4),
        qx=mx-dy/L*c,qy=my+dx/L*c;
        const u1=Math.hypot(qx-x1,qy-y1),u2=Math.hypot(qx-x2,qy-y2);
        const sx=x1+(qx-x1)/u1*R,sy=y1+(qy-y1)/u1*R,ex=x2+(qx-x2)/u2*(R+4),ey=y2+(qy-y2)/u2*(R+4);
        d=`M${sx},${sy} Q${qx},${qy} ${ex},${ey}`;lx=(mx+qx)/2-dy/L*10;ly=(my+qy)/2+dx/L*10;}
      const on=active(e.f,e.t,e.syms),pid=`${id}e${k}`;
      return <g key={k} className={'edge'+(on?' on':'')} opacity={hi?.splitter&&!on&&(dim(e.f)||dim(e.t))?.25:1}>
        <path id={pid} d={d} fill="none" stroke="currentColor" strokeWidth={on?3:1.6} markerEnd={`url(#${id}a)`} pathLength={1} className="draw"/>
        <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="elabel">{e.syms.join(',')}</text>
        {on&&<circle r="5" className="particle"><animateMotion dur="1.1s" repeatCount="indefinite"><mpath href={'#'+pid}/></animateMotion></circle>}</g>;})}
    {dfa.states.map((s,i)=>{const [x,y]=pos[s];const isS=hi?.splitter?.includes(s),isX=hi?.X?.includes(s);
      const col=PAL[(colors?.[s]??0)%PAL.length];
      return <g key={s} className={'node'+(isS?' spl':'')+(isX?' pre':'')} style={{animationDelay:i*90+'ms'}} opacity={dim(s)?.35:1}>
        {isS&&<circle cx={x} cy={y} r={R+10} className="pulse" stroke="#f59e0b"/>}
        {isX&&<circle cx={x} cy={y} r={R+8} className="pulse" stroke="#22c55e"/>}
        <circle cx={x} cy={y} r={R} fill={col+'33'} stroke={col} strokeWidth="2.5"/>
        {dfa.finalStates.includes(s)&&<circle cx={x} cy={y} r={R-5} fill="none" stroke={col} strokeWidth="2"/>}
        <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="nlabel">{s}</text>
        {s===dfa.startState&&<g><path d={`M${x-R-34},${y} L${x-R-3},${y}`} stroke="currentColor" strokeWidth="2" markerEnd={`url(#${id}a)`}/><text x={x-R-36} y={y-8} textAnchor="end" className="elabel">START</text></g>}</g>;})}
  </svg><div className="zc"><button aria-label="Zoom in" onClick={()=>zoomBy(1.25)}>+</button><button aria-label="Zoom out" onClick={()=>zoomBy(.8)}>−</button><button aria-label="Fit and reset view" onClick={()=>setVw({z:1,x:0,y:0})}>Fit</button></div></div>;}
