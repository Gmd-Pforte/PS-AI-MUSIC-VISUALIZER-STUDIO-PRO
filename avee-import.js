/* Limited, offline Avee .viz importer. No external libraries or uploads. */
window.PSAvee = (() => {
  const u16 = (v,p) => v.getUint16(p,true);
  const u32 = (v,p) => v.getUint32(p,true);
  const limit = (n,min,max) => Math.max(min,Math.min(max,n));
  const field = (e,k,fallback=null) => e?.[k]?.v ?? fallback;
  const number = (value,fallback=0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const vec = (value, fallback=[.5,.5]) => {
    const vals=String(value||'').trim().split(/\s+/).map(Number);
    return vals.length>=2 && vals.slice(0,2).every(Number.isFinite)?vals:fallback;
  };
  function hsvColor(v, fallback='#77dafa') {
    const nums=String(v||'').trim().split(/\s+/).map(Number);
    if(nums.length<3||nums.slice(0,3).some(n=>!Number.isFinite(n)))return fallback;
    const h=((nums[0]%1)+1)%1,s=limit(nums[1],0,1),val=limit(nums[2],0,1);
    const f=n=>{const k=(n+h*6)%6;return Math.round(255*(val-val*s*Math.max(0,Math.min(k,4-k,1))))};
    return '#'+[f(5),f(3),f(1)].map(n=>n.toString(16).padStart(2,'0')).join('');
  }
  async function zipEntries(file) {
    if(file.size>40_000_000)throw Error('Die .viz-Datei ist größer als 40 MB');
    const buffer=await file.arrayBuffer(),data=new DataView(buffer),bytes=new Uint8Array(buffer);
    let tail=-1;
    for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(u32(data,i)===0x06054b50){tail=i;break}}
    if(tail<0)throw Error('Keine gültige ZIP-basierte Avee-Datei');
    const entries=Math.min(1000,u16(data,tail+10)),start=u32(data,tail+16),items=new Map();
    let cursor=start;
    for(let i=0;i<entries;i++){
      if(cursor+46>bytes.length||u32(data,cursor)!==0x02014b50)break;
      const method=u16(data,cursor+10),compressed=u32(data,cursor+20),uncompressed=u32(data,cursor+24);
      const nameLen=u16(data,cursor+28),extra=u16(data,cursor+30),comment=u16(data,cursor+32);
      const name=new TextDecoder().decode(bytes.subarray(cursor+46,cursor+46+nameLen));
      const local=u32(data,cursor+42);
      if(local+30<=bytes.length&&u32(data,local)===0x04034b50&&uncompressed<=15_000_000){
        const offset=local+30+u16(data,local+26)+u16(data,local+28);
        if(offset+compressed<=bytes.length)items.set(name,{method,packed:bytes.slice(offset,offset+compressed),size:uncompressed});
      }
      cursor+=46+nameLen+extra+comment;
    }
    async function read(name){const e=items.get(name);if(!e)return null;if(e.method===0)return e.packed;
      if(e.method!==8||!window.DecompressionStream)throw Error('ZIP-Komprimierung auf diesem Gerät nicht unterstützt');
      const stream=new Blob([e.packed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      const out=new Uint8Array(await new Response(stream).arrayBuffer());
      if(out.byteLength>15_000_000)throw Error('ZIP-Eintrag zu groß');return out;
    }
    return {read,names:[...items.keys()]};
  }
  const mime = buf => buf[0]===0x89?'image/png':buf[0]===0xff?'image/jpeg':String.fromCharCode(...buf.slice(0,3))==='GIF'?'image/gif':'image/webp';
  async function dataUrl(bytes){return new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.readAsDataURL(new Blob([bytes],{type:mime(bytes)}))})}
  async function importViz(file) {
    const zip=await zipEntries(file),sceneBytes=await zip.read('scene.json');
    if(!sceneBytes)throw Error('scene.json fehlt in der Avee-Datei');
    let scene;try{scene=JSON.parse(new TextDecoder().decode(sceneBytes))}catch{throw Error('scene.json ist beschädigt')}
    const compositions=scene.compositions;
    if(!Array.isArray(compositions)||!compositions.length)throw Error('Keine Avee-Komposition enthalten');
    const layers=[];let skipped=0,embedded=0;
    const make=(type,e,extras={})=>{
      const pos=vec(field(e,'position')),scale=vec(field(e,'scale'),[1,1]);
      return Object.assign({id:'avee-'+Math.random().toString(36).slice(2),type,
        name:String(e._name||e.objType||type).slice(0,60),visible:field(e,'visible',1)!==0,
        x:limit(pos[0]*100,0,100),y:limit(pos[1]*100,0,100),scale:limit(scale[0],.1,5),
        rotation:0,opacity:1,color:'#7dcaff',color2:'#db8cff',sensitivity:1.2,smoothing:.7,
        count:64,radius:24,thickness:3,speed:.5,size:3,text:'PS AI MUSIC',fontSize:8,src:''},extras);
    };
    const imageCache=new Map();
    for(const e of (compositions[0].elements||[]).slice(0,60)){
      const kind=e.objType||'';let layer;
      if(kind==='Image'){
        const ref=String(field(e,'customImage',''));
        if(!ref.startsWith('local:')){skipped++;continue}
        const name=ref.slice(6);let src=imageCache.get(name);
        if(!src){const data=await zip.read(name);if(!data){skipped++;continue}src=await dataUrl(data);imageCache.set(name,src);embedded++}
        layer=make('image',e,{src,scale:limit(vec(field(e,'scale'),[1,1])[0]*2,.1,5)});
      }else if(kind==='Bars'){
        const circular=String(field(e,'ShapePath','')).toLowerCase().includes('circle');
        layer=make(circular?'ring':'bars',e,{count:96,radius:22,scale:limit(vec(field(e,'scale'),[1,1])[0]*2,.1,4),
          color:hsvColor(field(e,'color1',field(e,'Color','#7dcaff'))),color2:hsvColor(field(e,'color2'),'#bb68ff')});
      }else if(kind==='Particles'){
        layer=make('particles',e,{count:limit(number(field(e,'CountLimit'),170),20,500),
          speed:limit(number(field(e,'Speed'),100)/100,.05,3),size:3,
          color:hsvColor(field(e,'ColorFrom')),
          color2:hsvColor(field(e,'ColorTo'),'#d2aaff')});
      }else if(kind==='Text'){
        layer=make('text',e,{text:String(field(e,'text','PS AI MUSIC')).slice(0,150)});
      }else skipped++;
      if(layer)layers.push(layer);
    }
    if(!layers.length)throw Error('Keine unterstützten Avee-Ebenen gefunden');
    return {project:{name:file.name.replace(/\.viz$/i,''),ratio:'9:16',background:'#090b24',guides:false,layers},
      info:`${layers.length} Ebenen importiert, ${embedded} eingebettete Bilder, ${skipped} nicht unterstützte Effekte übersprungen. Avee-Kompositionen werden angenähert.`};
  }
  return {importViz};
})();
