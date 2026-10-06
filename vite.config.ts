import {defineConfig,loadEnv} from 'vite';import react from '@vitejs/plugin-react';
// Production build is served from https://narayani0408.github.io/DFA-Partition-Optimize/
// Dev server stays at '/'. For Vercel/Netlify (root domain) build with: VITE_BASE=/ npm run build
export default defineConfig(({command,isPreview,mode})=>{
  const env=loadEnv(mode,'.','VITE_');
  return {
    base:env.VITE_BASE??(command==='build'||isPreview?'/DFA-Partition-Optimize/':'/'),
    plugins:[react()],server:{host:true}};
});
