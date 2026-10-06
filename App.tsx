import {useEffect,useMemo,useRef,useState} from 'react';
import {sound,SoundSettings} from './soundManager';
import ResultPanel from './ResultPanel';
import {DFA,EXAMPLES,minimize,validateDFA,verify,Block} from './algorithm';
import DFAGraph from './DFAGraph';
import {PAL} from './DFAGraph';
const fmt=(b:string[])=>'{'+b.join(', ')+'}';
const dl=(n:string,t:string,m:string)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:m}));a.download=n;a.click();};
const useCount=(to:number,on:boolean)=>{const [v,setV]=useState(0);useEffect(()=>{if(!on){setV(0);return;}let f=0;const t=setInterval(()=>{f++;setV(to*Math.min(1,f/30));if(f>=30)clearInterval(t);},30);return()=>clearInterval(t);},[to,on]);return v;};
function Table({d,label}:{d:DFA;label?:(s:string)=>string}){const L=label??((s:string)=>s);
  return <div className="scroll"><table><thead><tr><th>State</th>{d.alphabet.map(a=><th key={a}>{a}</th>)}</tr></thead><tbody>
  {d.states.map(s=><tr key={s}><td>{s===d.startState?'→ ':''}{d.finalStates.includes(s)?'* ':''}{L(s)}</td>{d.alphabet.map(a=><td key={a}>{L(d.transitions[s][a])}</td>)}</tr>)}</tbody></table></div>;}
export default function App(){
  const [dark,setDark]=useState(()=>localStorage.getItem('dfa-theme')!=='light');
  const [view,setView]=useState<'home'|'lab'|'how'|'about'>('home');
  const [text,setText]=useState(JSON.stringify(EXAMPLES['Multi-step refinement'],null,2));
  const [errors,setErrors]=useState<string[]>([]);
  const [dfa,setDfa]=useState<DFA|null>(null);
  const [i,setI]=useState(0);const [play,setPlay]=useState(false);const [speed,setSpeed]=useState(1);
  const [naming,setNaming]=useState<'AB'|'P'>('AB');const [why,setWhy]=useState(false);const [done,setDone]=useState(false);
  const [tab,setTab]=useState<'input'|'viz'|'algo'|'result'>('input');const [sel,setSel]=useState<string|null>(null);
  const [menu,setMenu]=useState(false);const [snd,setSnd]=useState(sound.get());const [audioMsg,setAudioMsg]=useState('');
  const upSnd=(p:Partial<SoundSettings>)=>setSnd(sound.set(p));
  useEffect(()=>{const f=()=>{if(sound.init())sound.play('start');else setAudioMsg('Audio is unavailable in this browser. The app works normally without sound.');};
    window.addEventListener('pointerdown',f,{once:true});window.addEventListener('keydown',f,{once:true});
    return()=>{window.removeEventListener('pointerdown',f);window.removeEventListener('keydown',f);sound.dispose();};},[]);
  useEffect(()=>{if(errors.length)sound.play('error');},[errors]);
  useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';localStorage.setItem('dfa-theme',dark?'dark':'light');},[dark]);
  const res=useMemo(()=>{if(!dfa)return null;try{return minimize(dfa);}catch{return null;}},[dfa]);
  const last=res?res.steps.length-1:0;
  useEffect(()=>{if(!play||!res)return;const t=setTimeout(()=>{if(i>=last){setPlay(false);setDone(true);}else setI(i+1);},1500/speed);return()=>clearTimeout(t);},[play,i,speed,res,last]);
  const run=(src=text,auto=false)=>{setPlay(false);setI(0);setDone(false);setWhy(false);setDfa(null);let d:any;
    try{d=JSON.parse(src);}catch{setErrors(['Invalid JSON format. Please check your DFA definition.']);return;}
    const e=validateDFA(d);setErrors(e);if(!e.length){setDfa(d);setView('lab');setTab('viz');setSel(null);if(auto)setPlay(true);}};
  const demo=()=>{const s=JSON.stringify(EXAMPLES['Multi-step refinement'],null,2);setText(s);run(s,true);};
  const reset=()=>{setDfa(null);setErrors([]);setI(0);setPlay(false);setDone(false);};
  useEffect(()=>{const k=(e:KeyboardEvent)=>{if((e.target as HTMLElement).tagName==='TEXTAREA'||(e.target as HTMLElement).tagName==='SELECT'||!res||view!=='lab')return;
    if(e.code==='Space'){e.preventDefault();setPlay(p=>!p);}else if(e.key==='ArrowRight')setI(x=>Math.min(last,x+1));else if(e.key==='ArrowLeft')setI(x=>Math.max(0,x-1));else if(e.key==='r'||e.key==='R'){setI(0);setPlay(false);setDone(false);}};
    window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);},[res,last,view]);
  const step=res?.steps[i];const v=res&&dfa?verify(dfa,res):[];
  const colors=useMemo(()=>{const m:Record<string,number>={};step?.partition.forEach((b,k)=>b.forEach(s=>m[s]=k));return m;},[step]);
  const nm=(k:number)=>naming==='AB'?String.fromCharCode(65+k):'P'+k;
  const isNew=(b:Block)=>!!step?.splits.some(s=>s.after.some(a=>a.join()===b.join()));
  const pct=dfa&&res?100*(dfa.states.length-res.min.states.length)/dfa.states.length:0;
  const cStates=useCount(res?.min.states.length??0,done),cPct=useCount(pct,done);
  const whyText=step&&step.splits.length?step.splits.map(s=>`${fmt(s.after[0])} reach the splitter on "${step.symbol}" while ${fmt(s.after[1])} do not, so they behave differently on some input string and can no longer share a class.`).join(' '):'Two states stay together only while they behave identically on every symbol. Here X cut no block, so no new distinction was found.';
  const csv=()=>res&&dl('minimized_dfa.csv',['State,'+res.min.alphabet.join(','),...res.min.states.map(s=>[s,...res.min.alphabet.map(a=>res.min.transitions[s][a])].join(','))].join('\n'),'text/csv');
  const exportAll=()=>res&&dfa&&dl('dfa_report.json',JSON.stringify({original:dfa,reachable:res.reachable,unreachable:res.unreachable,partitions:res.partition,mapping:res.mapping,minimized:res.min,trace:res.steps},null,2),'application/json');
  const first=useRef(true);
  useEffect(()=>{if(first.current){first.current=false;return;}if(!step)return;const ts:number[]=[];const at=(ms:number,n:string)=>ts.push(window.setTimeout(()=>sound.play(n),ms));
    if(step.action==='INIT')sound.play('init');else if(step.action==='DONE')sound.play('merge');
    else{sound.play('splitter');at(120,'scan');if(step.splits.length){at(320,'split');at(520,'worklist');}else at(320,'tick');}
    return()=>ts.forEach(clearTimeout);},[i,res]);
  useEffect(()=>{if(done)sound.play('done');},[done]);
  const hero=EXAMPLES['Multi-step refinement'];
  return <div className="app" onClickCapture={e=>{if((e.target as HTMLElement).closest('button'))sound.play('click');}} onPointerOver={e=>{if(e.pointerType==='mouse'&&(e.target as HTMLElement).closest('button'))sound.hover();}}><div className="bg"/>
  <header className="top"><b className="logo" onClick={()=>setView('home')}>◈ DFA LAB</b>
    <nav>{(['lab','how','about'] as const).map(t=><button key={t} className={view===t?'on':''} onClick={()=>setView(t)}>{t==='lab'?'Simulator':t==='how'?'How It Works':'About'}</button>)}</nav>
    <div className="row sndwrap"><button aria-label="Sound settings" aria-expanded={menu} onClick={()=>setMenu(!menu)}>{snd.on&&snd.vol>0?'🔊':'🔇'}<span className="hide-s"> Sound</span></button>
      {menu&&<div className="menu glass pad" role="dialog" aria-label="Sound settings"><b>Sound</b><label>Master volume<input type="range" min="0" max="1" step="0.05" value={snd.vol} onChange={e=>upSnd({vol:+e.target.value})}/></label>
        <label><input type="checkbox" checked={snd.on} onChange={e=>upSnd({on:e.target.checked})}/> Sound on</label><label><input type="checkbox" checked={snd.algo} onChange={e=>upSnd({algo:e.target.checked})}/> Algorithm sounds</label><label><input type="checkbox" checked={snd.ui} onChange={e=>upSnd({ui:e.target.checked})}/> UI sounds</label></div>}
      <button title="Toggle theme" onClick={()=>setDark(!dark)}>{dark?'☀':'🌙'}</button><button onClick={reset}>Reset</button></div></header>
  {audioMsg&&<div className="hl" role="status">{audioMsg}</div>}
  {view==='home'&&<section className="hero"><div><h1>MINIMIZE<br/>THE DFA.</h1><p className="muted big">Watch Hopcroft's Partition Algorithm transform a complex automaton into its minimal form.</p>
    <div className="row"><button className="primary" onClick={()=>setView('lab')}>▶ START SIMULATION</button><button onClick={demo}>TRY DEMO DFA</button><button onClick={()=>setView('how')}>HOW IT WORKS</button></div></div>
    <div className="glass"><DFAGraph dfa={hero} id="h" hi={{splitter:['F'],X:['C','D','E'],symbol:'1'}}/></div></section>}
  {view==='how'&&<section className="glass pad"><h2>How Hopcroft Works</h2><ol className="how">{['Remove states unreachable from the start state.','Initial partition P = {F, Q−F}; worklist W = the smaller block.','Pick a splitter A from W.','For each symbol c, find X = states whose c-transition enters A.','Split every block Y with Y∩X and Y−X both non-empty.','If Y was in W replace it by both parts, else add the smaller part.','Repeat until W is empty; each block becomes one minimized state.'].map((t,k)=><li key={k}>{t}</li>)}</ol><p className="muted">Complexity: O(|Σ|·n log n) with the standard data structures.</p></section>}
  {view==='about'&&<section className="glass pad"><h2>DFA Partition Optimizer</h2><p>An interactive visualizer for DFA minimization using Hopcroft's Partition Refinement Algorithm.</p><p className="muted">Domain: Theory of Automata · Purpose: education, visualization, academic project.</p></section>}
  {view==='lab'&&<><nav className="tabs" aria-label="Sections">{([['input','Input'],['viz','Visualize'],['algo','Algorithm'],['result','Result']] as const).map(([k,l])=><button key={k} className={tab===k?'on':''} onClick={()=>setTab(k)}>{l}</button>)}</nav><main className="lab" data-tab={tab}>
    <aside className="glass pad p-input"><h3>Build your DFA</h3>
      <div className="row">{Object.keys(EXAMPLES).map(k=><button key={k} onClick={()=>{const s=JSON.stringify(EXAMPLES[k],null,2);setText(s);run(s);}}>{k}</button>)}</div>
      <textarea aria-label="DFA JSON" value={text} onChange={e=>setText(e.target.value)} spellCheck={false}/>
      {errors.length>0&&<ul className="err" role="alert">{errors.map((e,k)=><li key={k}>✕ {e}</li>)}</ul>}
      <div className="row"><button className="primary" onClick={()=>run()}>Validate &amp; Load</button><button onClick={demo}>Demo mode</button><button onClick={()=>dl('dfa.json',text,'application/json')}>Export JSON</button></div></aside>
    <section className="glass pad center p-viz">{res&&dfa&&step?<>
      <div className="row ctl"><button onClick={()=>setI(Math.max(0,i-1))} title="← Previous">◀</button><button className="primary" onClick={()=>{if(i>=last){setI(0);setDone(false);}setPlay(!play);}}>{play?'❚❚ Pause':'▶ Play'}</button><button onClick={()=>setI(Math.min(last,i+1))} title="→ Next">▶</button>
        <button onClick={()=>{setI(0);setPlay(false);setDone(false);}}>Restart</button><button onClick={()=>setI(last)}>Final</button>
        <label>Speed <select value={speed} onChange={e=>setSpeed(+e.target.value)}>{[.5,1,1.5,2].map(s=><option key={s} value={s}>{s}x</option>)}</select></label>
        <button onClick={()=>setNaming(naming==='AB'?'P':'AB')}>{naming==='AB'?'A,B,C':'P0,P1'}</button></div>
      <DFAGraph dfa={dfa} id="m" colors={colors} hi={sel?{splitter:res.names[sel]}:step.action==='PROCESS'?{splitter:step.splitter,X:step.X,symbol:step.symbol}:undefined}/>
      <p className="legend">◉ amber pulse = splitter · green pulse = predecessors X · dashed ring = final · node colour = partition class · Space/←/→/R</p>
      <h4>Partition (step {i+1} of {res.steps.length})</h4><div className="row">{step.partition.map((b,k)=><div key={b.join()} className={'bub'+(isNew(b)?' new':'')} style={{borderColor:PAL[k%PAL.length]}}><small>{nm(k)}{isNew(b)?' ✂ NEW':''}</small><div className="mono">{b.map(s=><span key={s} className="chip" style={{background:PAL[k%PAL.length]+'44'}}>{s}</span>)}</div></div>)}</div>
    </>:<p className="muted">Load a DFA to begin — or click Demo mode.</p>}</section>
    <aside className="glass pad p-algo">{res&&step?<>
      <h3>Hopcroft engine</h3><div className="mono kv"><div>Step <b>{String(i+1).padStart(2,'0')}/{res.steps.length}</b></div>
      <div>Splitter <b>{step.splitter?fmt(step.splitter):'—'}</b></div><div>Symbol <b>{step.symbol??'—'}</b></div><div>X <b>{step.X?fmt(step.X):'—'}</b></div>
      <div>Result <b>{step.splits.length?step.splits.map(s=>s.after.map(fmt).join(' + ')).join('; '):'no split'}</b></div></div>
      <h4>Worklist (queue)</h4><div className="queue">{step.worklist.length?step.worklist.map((b,k)=><div key={b.join()+k} className={'q'+(k===0?' cur':'')}>{fmt(b)}{k===0&&<small> ← next</small>}</div>):<i className="muted">empty</i>}</div>
      <h4>What is happening?</h4><div className="hl">{step.text}</div>
      <button onClick={()=>setWhy(!why)}>{why?'Hide':'WHY?'}</button>{why&&<div className="hl why">{whyText}</div>}
      {res.unreachable.length>0&&<p className="warnt">Unreachable removed: {fmt(res.unreachable)}</p>}</>:null}</aside>
    {res&&<footer className="glass pad tl p-algo"><div className="row">{res.steps.map((s,k)=><button key={k} className={'tick'+(k===i?' on':'')+(k<i?' past':'')} onClick={()=>{setI(k);setPlay(false);}}>{s.action==='INIT'?'Init':s.action==='DONE'?'Final':`${s.splitter?fmt(s.splitter):''}·${s.symbol}`}</button>)}</div></footer>}
    {res&&dfa&&<ResultPanel dfa={dfa} res={res} sel={sel} setSel={setSel} v={v} csv={csv} exportAll={exportAll}/>}
  </main></>}
  {done&&res&&dfa&&<div className="overlay" role="dialog"><div className="glass pad result"><div className="ok">✓ MINIMIZATION COMPLETE</div>
    <div className="big2">{dfa.states.length} → {Math.round(cStates)}</div><div className="big2 ok">{cPct.toFixed(2)}% STATE REDUCTION</div>
    <p className="muted">Original {dfa.states.length} · reachable {res.reachable.length} · merged {res.reachable.length-res.min.states.length} · steps {res.steps.length-2}</p>
    <h4>Equivalence classes</h4>{Object.entries(res.names).map(([n,b])=><div key={n} className="mono">{n} = {fmt(b)}</div>)}
    <h4>Minimized DFA</h4><DFAGraph dfa={res.min} id="r"/><Table d={res.min}/>
    <div className="row"><span className="muted">Mapping:</span>{Object.entries(res.mapping).map(([s,c])=><span key={s} className="chip">{s}→{c}</span>)}</div>
    <div className={v.length?'err':'ok'}>{v.length?'✕ Verification failed: '+v.join(' '):'✓ Minimized DFA is valid'}</div>
    <div className="row"><button className="primary" onClick={()=>{setDone(false);setI(0);setPlay(true);}}>↻ Replay</button><button onClick={csv}>CSV</button><button onClick={()=>dl('minimized_dfa.json',JSON.stringify(res.min,null,2),'application/json')}>JSON</button>
      <button onClick={()=>navigator.clipboard?.writeText(res.min.states.map(s=>[s,...res.min.alphabet.map(a=>res.min.transitions[s][a])].join('\t')).join('\n'))}>Copy</button><button onClick={()=>window.print()}>Print</button><button onClick={()=>setDone(false)}>Close</button></div></div></div>}
  <footer className="foot">Built for Theory of Automata · Hopcroft's DFA Minimization · Educational use.</footer></div>;}
