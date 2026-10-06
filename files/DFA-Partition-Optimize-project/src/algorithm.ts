export type DFA={states:string[];alphabet:string[];startState:string;finalStates:string[];transitions:Record<string,Record<string,string>>};
export type Block=string[];
export type Step={n:number;action:'INIT'|'PROCESS'|'DONE';splitter?:Block;symbol?:string;X?:Block;
  splits:{before:Block;after:Block[]}[];partition:Block[];worklist:Block[];text:string};
export type Result={reachable:string[];unreachable:string[];steps:Step[];partition:Block[];
  mapping:Record<string,string>;names:Record<string,Block>;min:DFA};

export function validateDFA(d:any):string[]{
  const e:string[]=[];
  if(!d||typeof d!=='object'||!Array.isArray(d.states)||!Array.isArray(d.alphabet)||!Array.isArray(d.finalStates)||typeof d.transitions!=='object'||!d.transitions)
    return ['Invalid DFA structure: need states[], alphabet[], startState, finalStates[], transitions{}.'];
  const S=new Set<string>();
  if(!d.states.length)e.push('At least one state is required.');
  for(const s of d.states){if(typeof s!=='string'||!s.trim())e.push('State name cannot be empty.');else if(S.has(s))e.push(`Duplicate state name: ${s}`);S.add(s);}
  const A=new Set<string>();
  if(!d.alphabet.length)e.push('Alphabet cannot be empty.');
  for(const a of d.alphabet){if(typeof a!=='string'||!a.trim())e.push('Alphabet symbol cannot be empty.');else if(A.has(a))e.push(`Duplicate alphabet symbol: ${a}`);A.add(a);}
  if(!S.has(d.startState))e.push(`Start state ${d.startState} does not exist.`);
  for(const f of d.finalStates)if(!S.has(f))e.push(`Final state ${f} does not exist.`);
  for(const s of S)for(const a of A){const t=d.transitions[s]?.[a];
    if(t===undefined)e.push(`Transition missing: δ(${s}, ${a})`);
    else if(!S.has(t))e.push(`Invalid destination state: ${t} in δ(${s}, ${a})`);}
  return e;
}
export function findReachable(d:DFA):string[]{
  const seen=new Set([d.startState]),q=[d.startState];
  while(q.length){const s=q.shift()!;for(const a of d.alphabet){const t=d.transitions[s][a];if(!seen.has(t)){seen.add(t);q.push(t);}}}
  return d.states.filter(s=>seen.has(s));
}
const key=(b:Block)=>b.join('\u0001');
const fmt=(b:Block)=>'{'+b.join(', ')+'}';
const fmtP=(p:Block[])=>'{ '+p.map(fmt).join(', ')+' }';

/** Hopcroft partition refinement with a full trace. */
export function minimize(dfa:DFA):Result{
  const reachable=findReachable(dfa);
  const unreachable=dfa.states.filter(s=>!reachable.includes(s));
  const order=new Map(reachable.map((s,i)=>[s,i]));
  const sorted=(x:Iterable<string>)=>[...x].sort((a,b)=>order.get(a)!-order.get(b)!);
  const fin=new Set(dfa.finalStates);
  const F=reachable.filter(s=>fin.has(s)),N=reachable.filter(s=>!fin.has(s));
  // Initial partition P = {F, Q−F}, dropping empty sets
  let P:Block[]=[F,N].filter(b=>b.length);
  // Worklist W: the smaller of F / Q−F (one block suffices; if only one block exists nothing can split anyway)
  let W:Block[]=P.length===2?[F.length<=N.length?F:N]:[];
  const steps:Step[]=[];
  steps.push({n:0,action:'INIT',splits:[],partition:P.map(b=>[...b]),worklist:W.map(b=>[...b]),
    text:(unreachable.length?`Removed unreachable states ${fmt(unreachable)}. `:'All states are reachable. ')+
      `Initial partition P = ${fmtP(P)} (final / non-final). Worklist W = ${fmtP(W)} — the smaller block.`});
  // predecessor lookup per symbol
  const pre:Record<string,Record<string,string[]>>={};
  for(const a of dfa.alphabet){pre[a]={};for(const s of reachable){(pre[a][dfa.transitions[s][a]]??=[]).push(s);}}
  while(W.length){
    const A=W.shift()!;                                   // pick a splitter
    for(const c of dfa.alphabet){
      const X=new Set<string>();
      for(const q of A)for(const p of pre[c][q]??[])X.add(p);  // X = {q | δ(q,c) ∈ A}
      const splits:Step['splits']=[];const msgs:string[]=[];
      const next:Block[]=[];
      for(const Y of P){
        const inter=Y.filter(s=>X.has(s)),diff=Y.filter(s=>!X.has(s));
        if(inter.length&&diff.length){                    // Y is split by X
          next.push(inter,diff);splits.push({before:Y,after:[inter,diff]});
          const i=W.findIndex(w=>key(w)===key(Y));
          if(i>=0){W.splice(i,1,inter,diff);msgs.push(`${fmt(Y)} was already in W, so it is replaced by both ${fmt(inter)} and ${fmt(diff)}.`);}
          else{const sm=inter.length<=diff.length?inter:diff;W.push(sm);
            msgs.push(`${fmt(Y)} splits into ${fmt(inter)} (states that move into the splitter on ${c}) and ${fmt(diff)} (states that do not). The smaller part ${fmt(sm)} is added to W, keeping Hopcroft's O(n log n) strategy.`);}
        }else next.push(Y);
      }
      P=next;
      steps.push({n:steps.length,action:'PROCESS',splitter:A,symbol:c,X:sorted(X),splits,
        partition:P.map(b=>[...b]),worklist:W.map(b=>[...b]),
        text:`Splitter A = ${fmt(A)}, symbol ${c}. Predecessors X = ${fmt(sorted(X))}. `+(msgs.length?msgs.join(' '):'No partition is cut by X, so nothing changes.')});
    }
  }
  const final=P.map(b=>sorted(b)).sort((a,b)=>order.get(a[0])!-order.get(b[0])!);
  steps.push({n:steps.length,action:'DONE',splits:[],partition:final,worklist:[],
    text:`Worklist is empty — no partition can be split further. Final classes: ${fmtP(final)}.`});
  const names:Record<string,Block>={},mapping:Record<string,string>={};
  final.forEach((b,i)=>{const nm=i<26?String.fromCharCode(65+i):'C'+i;names[nm]=b;b.forEach(s=>mapping[s]=nm);});
  const min:DFA={states:Object.keys(names),alphabet:dfa.alphabet,startState:mapping[dfa.startState],
    finalStates:Object.keys(names).filter(n=>names[n].some(s=>fin.has(s))),
    transitions:Object.fromEntries(Object.entries(names).map(([n,b])=>[n,Object.fromEntries(dfa.alphabet.map(a=>[a,mapping[dfa.transitions[b[0]][a]]]))]))};
  return {reachable,unreachable,steps,partition:final,mapping,names,min};
}
export function verify(orig:DFA,r:Result):string[]{
  const e:string[]=[],m=r.min,S=new Set(m.states);
  for(const s of m.states)for(const a of m.alphabet){const t=m.transitions[s]?.[a];if(!t||!S.has(t))e.push(`δ(${s}, ${a}) is missing or invalid.`);}
  if(!S.has(m.startState))e.push('Start state invalid.');
  for(const f of m.finalStates)if(!S.has(f))e.push(`Final state ${f} invalid.`);
  for(const s of r.reachable)if(!r.mapping[s])e.push(`${s} belongs to no class.`);
  if(r.partition.flat().length!==r.reachable.length)e.push('Classes do not partition the reachable states exactly once.');
  // each class must be uniform in finality and in successor classes
  const fin=new Set(orig.finalStates);
  for(const b of r.partition)for(const s of b){
    if(fin.has(s)!==fin.has(b[0]))e.push(`Class mixes final and non-final states (${s}).`);
    for(const a of orig.alphabet)if(r.mapping[orig.transitions[s][a]]!==r.mapping[orig.transitions[b[0]][a]])e.push(`${s} and ${b[0]} differ on ${a}.`);}
  return e;
}
export const EXAMPLES:Record<string,DFA>={
 'Equivalent states':{states:['q0','q1','q2','q3'],alphabet:['0','1'],startState:'q0',finalStates:['q3'],
  transitions:{q0:{'0':'q1','1':'q2'},q1:{'0':'q3','1':'q3'},q2:{'0':'q3','1':'q3'},q3:{'0':'q3','1':'q3'}}},
 'Multi-step refinement':{states:['A','B','C','D','E','F'],alphabet:['0','1'],startState:'A',finalStates:['C','D','E'],
  transitions:{A:{'0':'B','1':'C'},B:{'0':'A','1':'D'},C:{'0':'E','1':'F'},D:{'0':'E','1':'F'},E:{'0':'E','1':'F'},F:{'0':'F','1':'F'}}},
 'With unreachable states':{states:['q0','q1','q2','q3','q4'],alphabet:['a','b'],startState:'q0',finalStates:['q1','q4'],
  transitions:{q0:{a:'q1',b:'q2'},q1:{a:'q1',b:'q2'},q2:{a:'q1',b:'q2'},q3:{a:'q4',b:'q0'},q4:{a:'q3',b:'q3'}}}};
