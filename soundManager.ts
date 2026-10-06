// Generated Web Audio sounds only: no external files, no autoplay before a user gesture.
export type SoundSettings={on:boolean;vol:number;algo:boolean;ui:boolean};
type N={f:number;d:number;at?:number;type?:OscillatorType;g?:number;to?:number};
const KEY='dfa-sound';
const EV:Record<string,{k:'ui'|'algo';n:N[]}>={
 start:{k:'ui',n:[{f:330,d:.25},{f:495,d:.25,at:.1},{f:660,d:.4,at:.2}]},
 click:{k:'ui',n:[{f:700,d:.04,type:'square',g:.3}]},
 hover:{k:'ui',n:[{f:1200,d:.02,g:.12}]},
 error:{k:'ui',n:[{f:220,d:.2,type:'sawtooth',g:.4,to:160}]},
 init:{k:'algo',n:[{f:110,d:.35,g:.8}]},
 splitter:{k:'algo',n:[{f:520,d:.14,type:'triangle'}]},
 tick:{k:'algo',n:[{f:900,d:.03,type:'square',g:.25}]},
 scan:{k:'algo',n:[{f:400,d:.22,to:900,g:.4}]},
 split:{k:'algo',n:[{f:700,d:.2,to:350,type:'sawtooth',g:.35},{f:350,d:.2,to:700,at:.02,g:.35}]},
 worklist:{k:'algo',n:[{f:600,d:.05,type:'square',g:.25},{f:800,d:.05,at:.06,type:'square',g:.25}]},
 merge:{k:'algo',n:[{f:300,d:.3,to:600},{f:450,d:.3,to:600,at:.05}]},
 done:{k:'algo',n:[261.6,329.6,392,523.3].map((f,i)=>({f,d:.35,at:i*.12,type:'triangle' as OscillatorType}))}};
class SoundManager{
  private ctx:AudioContext|null=null;private last=0;
  private s:SoundSettings=(()=>{try{return {on:true,vol:.5,algo:true,ui:true,...JSON.parse(localStorage.getItem(KEY)||'{}')};}catch{return {on:true,vol:.5,algo:true,ui:true};}})();
  get():SoundSettings{return {...this.s};}
  set(p:Partial<SoundSettings>):SoundSettings{this.s={...this.s,...p};try{localStorage.setItem(KEY,JSON.stringify(this.s));}catch{/* ignore */}return this.get();}
  /** Call from a user gesture. Returns false if audio is unavailable. */
  init():boolean{if(this.ctx){this.ctx.resume?.();return true;}
    try{const C=window.AudioContext||(window as any).webkitAudioContext;if(!C)return false;this.ctx=new C();this.ctx.resume?.();return true;}catch{return false;}}
  play(name:string,kind?:'ui'|'algo'){const e=EV[name],c=this.ctx;if(!e||!c||!this.s.on||this.s.vol<=0||!this.s[kind??e.k])return;
    try{if(c.state==='suspended')c.resume();const t0=c.currentTime;
      for(const n of e.n){const o=c.createOscillator(),g=c.createGain(),t=t0+(n.at??0),pk=Math.max(.0002,(n.g??.5)*this.s.vol*.3);
        o.type=n.type??'sine';o.frequency.setValueAtTime(n.f,t);if(n.to)o.frequency.exponentialRampToValueAtTime(n.to,t+n.d);
        g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(pk,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+n.d);
        o.connect(g).connect(c.destination);o.start(t);o.stop(t+n.d+.02);}}catch{/* never crash the app */}}
  hover(){const t=performance.now();if(t-this.last<90)return;this.last=t;this.play('hover');}
  dispose(){try{this.ctx?.close();}catch{/* ignore */}this.ctx=null;}
}
export const sound=new SoundManager();
