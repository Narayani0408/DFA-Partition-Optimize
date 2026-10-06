import {DFA,Result} from './algorithm';
const fmt=(b:string[])=>'{'+b.join(', ')+'}';

export default function ResultPanel({dfa,res,sel,setSel,v,csv,exportAll}:{dfa:DFA;res:Result;sel:string|null;setSel:(s:string|null)=>void;v:string[];csv:()=>void;exportAll:()=>void}){
  const m=res.min,okFin=res.reachable.every(s=>m.finalStates.includes(res.mapping[s])===dfa.finalStates.includes(s));
  const okTr=m.states.every(s=>m.alphabet.every(a=>m.states.includes(m.transitions[s]?.[a])));
  const last=res.steps[res.steps.length-1];
  const checks:[boolean,string][]=[[res.unreachable.length===0,res.unreachable.length?`${res.unreachable.length} unreachable state(s) removed first`:'All states reachable'],
    [okFin,'Final states preserved'],[okTr,'Transition function valid'],[last.action==='DONE'&&last.worklist.length===0,'Partition refinement completed'],[v.length===0,'Minimized DFA verified']];
  const pct=100*(dfa.states.length-m.states.length)/dfa.states.length;
  return <section className="glass pad p-result" aria-label="Result">
    <h3>Result</h3><div className="stats"><div><b>{dfa.states.length}</b>original</div><div><b>{res.reachable.length}</b>reachable</div><div><b>{m.states.length}</b>minimized</div><div><b>{res.reachable.length-m.states.length}</b>merged</div><div><b>{pct.toFixed(2)}%</b>reduction</div></div>
    <h4>State mapping <small className="muted">(tap a class to highlight its original states in the graph)</small></h4>
    <div className="row">{Object.entries(res.names).map(([n,b])=><button key={n} className={sel===n?'on':''} aria-pressed={sel===n} onClick={()=>setSel(sel===n?null:n)}>{n} = {fmt(b)}</button>)}</div>
    <div className="row mono">{Object.entries(res.mapping).map(([s,c])=><span key={s} className="chip">{s} → {c}</span>)}</div>
    <h4>Verification</h4><ul className="checks">{checks.map(([ok,t])=><li key={t} className={ok?'ok':'err'}>{ok?'✓':'✕'} {t}</li>)}</ul>
    {v.length>0&&<p className="err">{v.join(' ')}</p>}
    <div className="row"><button onClick={csv}>Export CSV</button><button onClick={exportAll}>Export full JSON</button></div></section>;
}
