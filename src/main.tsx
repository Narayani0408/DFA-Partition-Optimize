import {Component,ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './style.css';

class Boundary extends Component<{children:ReactNode},{err:string}>
{
  state={err:''};
  static getDerivedStateFromError(e:unknown){return {err:String((e as Error)?.stack||e)};}
  render(){return this.state.err?<pre style={{padding:16,color:'#ef4444',whiteSpace:'pre-wrap',background:'#0f172a'}}>App crashed:{'\n'}{this.state.err}{'\n\n'}Send me this text.</pre>:this.props.children;}
}

createRoot(document.getElementById('root')!).render(<Boundary><App/></Boundary>);
