/* PS AI MUSIC — independent 3D scene, animated backdrops and lyric compositor. */
window.PSPro = (() => {
  const $=id=>document.getElementById(id);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const defaults=()=>({gifEnabled:false,gifOpacity:.9,gifBlur:0,gifZoom:1.08,
    threeD:'torus',threeDColor:'#8cd5ff',threeDSecond:'#ba69ff',threeDSpeed:.6,
    threeDSize:1,threeDReaction:1.25,threeDTilt:0,
    lyrics:'',lyricMode:'karaoke',lyricColor:'#ffffff',lyricHighlight:'#76eedb',
    lyricSize:7,lyricY:77,lyricOffset:0,lyricDuration:4});
  const normalize=value=>({...defaults(),...(value||{})});
  let backdrop=null,objectUrl=null,lyricsCache=null,lastLyrics='';
  const BACKDROPS=[['cyan','Türkiser Nebel'],['violet','Violette Wolken'],['amber','Warme Glut'],['blue','Blaue Tiefe']];

  function imgReady(file){if(objectUrl)URL.revokeObjectURL(objectUrl);
    objectUrl=URL.createObjectURL(file);const image=new Image();image.src=objectUrl;backdrop=image;
  }
  const DB='ps-visualizer-pro-media';
  const openDb=()=>new Promise((res,rej)=>{const req=indexedDB.open(DB,1);
    req.onupgradeneeded=()=>req.result.createObjectStore('media');req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)});
  async function storage(mode,blob){const db=await openDb();try{return await new Promise((res,rej)=>{
    const tx=db.transaction('media',mode==='get'?'readonly':'readwrite');
    const store=tx.objectStore('media');const req=mode==='get'?store.get('background'):mode==='put'?store.put(blob,'background'):store.delete('background');
    req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)
  })}finally{db.close()}}
  async function restoreMedia(){try{const blob=await storage('get');if(blob)imgReady(blob)}catch(err){console.warn('Background media storage unavailable',err)}}

  const rgba=(hex,a)=>{const str=/^#[0-9a-f]{6}$/i.test(hex||'')?hex:'#8cd5ff';const n=parseInt(str.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`};
  function background(ctx,w,h,t,p){if(!p.gifEnabled||!backdrop?.complete||!backdrop.naturalWidth)return;
    const iw=backdrop.naturalWidth,ih=backdrop.naturalHeight,cover=Math.max(w/iw,h/ih);
    const zoom=p.gifZoom*(1+.013*Math.sin(t*.31));const dw=iw*cover*zoom,dh=ih*cover*zoom;
    ctx.save();ctx.globalAlpha=p.gifOpacity;ctx.filter=p.gifBlur?`blur(${p.gifBlur*w/400}px)`:'none';
    ctx.drawImage(backdrop,(w-dw)/2,(h-dh)/2,dw,dh);
    ctx.filter='none';ctx.restore();
    const shade=ctx.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#02041368');shade.addColorStop(.5,'#02041310');shade.addColorStop(1,'#02041377');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
  }
  const rot=(pt,ax,ay)=>{const [x,y,z]=pt,ca=Math.cos(ax),sa=Math.sin(ax),cb=Math.cos(ay),sb=Math.sin(ay);
    const yy=y*ca-z*sa,zz=y*sa+z*ca;return [x*cb+zz*sb,yy,-x*sb+zz*cb]};
  const project3D=(p,w,h,zoom)=>{const depth=4.2+p[2],f=2.2/Math.max(.65,depth),size=Math.min(w,h)*zoom;
    return [w/2+p[0]*size*f,h*.46+p[1]*size*f,depth]};
  function line3D(ctx,a,b,w,h,zoom,c,opacity){const A=project3D(a,w,h,zoom),B=project3D(b,w,h,zoom);
    ctx.strokeStyle=rgba(c,opacity);ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);ctx.stroke()}
  function scene3D(ctx,w,h,t,p,data){if(p.threeD==='off')return;
    const bass=data?.length?data.slice(1,25).reduce((a,b)=>a+b,0)/24/255:0;
    const pulse=1+bass*p.threeDReaction*.22,zoom=p.threeDSize*.61*pulse;
    const ax=t*p.threeDSpeed*.31+p.threeDTilt*Math.PI/180,ay=t*p.threeDSpeed*.47;
    const primary=p.threeDColor,secondary=p.threeDSecond;
    ctx.save();ctx.lineWidth=Math.max(.8,w*.002);ctx.shadowColor=primary;ctx.shadowBlur=w*.015;
    if(p.threeD==='cube'){
      const v=[];for(const z of [-1,1])for(const y of [-1,1])for(const x of [-1,1])v.push(rot([x,y,z],ax,ay));
      const edges=[[0,1],[0,2],[0,4],[1,3],[1,5],[2,3],[2,6],[3,7],[4,5],[4,6],[5,7],[6,7]];
      for(const [a,b]of edges)line3D(ctx,v[a],v[b],w,h,zoom,primary,.9);
      for(const e of edges){const mid=rot([Math.sin(t*.7+e[0])*.2,Math.cos(t*.5+e[1])*.2,0],ax,ay);line3D(ctx,mid,v[e[0]],w,h,zoom,secondary,.15)}
    }else if(p.threeD==='torus'){
      const m=48,n=18;for(let j=0;j<n;j++){
        const points=[];for(let i=0;i<=m;i++){
          const a=i/m*Math.PI*2,b=j/n*Math.PI*2,r=1+.33*Math.cos(b);
          points.push(rot([r*Math.cos(a),.33*Math.sin(b),r*Math.sin(a)],ax,ay));
        }
        for(let i=1;i<points.length;i++)line3D(ctx,points[i-1],points[i],w,h,zoom,j%3?primary:secondary,.3+.32*Math.sin(j/n*Math.PI));
      }
    }else if(p.threeD==='tunnel'){
      const rings=13,seg=18;for(let k=0;k<rings;k++){
        const z=((k*.53+t*p.threeDSpeed*.8)%7)-3.5;
        let prev=null;for(let j=0;j<=seg;j++){
          const a=j/seg*Math.PI*2,point=rot([Math.cos(a)*1.5,Math.sin(a)*1.5,z],ax*.13,ay*.07);
          if(prev)line3D(ctx,prev,point,w,h,zoom, k%2?primary:secondary,.16+(k/rings)*.55);
          if(k%3===0&&j<seg){const next=rot([Math.cos(a)*1.5,Math.sin(a)*1.5,z+.53],ax*.13,ay*.07);line3D(ctx,point,next,w,h,zoom,primary,.14)}prev=point;
        }
      }
    }else if(p.threeD==='sphere'){
      for(let lat=1;lat<11;lat++){const theta=lat/11*Math.PI,points=[];for(let i=0;i<=65;i++){
        const a=i/65*Math.PI*2;points.push(rot([Math.sin(theta)*Math.cos(a),Math.cos(theta),Math.sin(theta)*Math.sin(a)],ax,ay));
      }for(let j=1;j<points.length;j++)line3D(ctx,points[j-1],points[j],w,h,zoom,lat%2?primary:secondary,.48)}
      for(let mer=0;mer<12;mer++){let prev=null;for(let j=0;j<=24;j++){
        const a=mer/12*Math.PI*2,th=j/24*Math.PI,pt=rot([Math.sin(th)*Math.cos(a),Math.cos(th),Math.sin(th)*Math.sin(a)],ax,ay);
        if(prev)line3D(ctx,prev,pt,w,h,zoom,primary,.25);prev=pt;
      }}
    }
    ctx.restore();
  }
  function parseLyrics(raw,duration,fallbackDuration){const rows=raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),parsed=[];
    for(const row of rows){const matches=[...row.matchAll(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g)];const text=row.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g,'').trim();
      if(!text)continue;if(matches.length)for(const m of matches)parsed.push({at:Number(m[1])*60+Number(m[2])+Number('0.'+(m[3]||0)),text});
      else parsed.push({at:null,text});
    }
    const timed=parsed.some(x=>x.at!==null);
    if(!timed){const interval=Number.isFinite(duration)&&duration>0?duration/Math.max(1,parsed.length):fallbackDuration;
      parsed.forEach((r,i)=>r.at=i*interval)
    }else{let last=0;for(const line of parsed){if(line.at===null)line.at=last+fallbackDuration;last=line.at}}
    return parsed.sort((a,b)=>a.at-b.at);
  }
  function lyrics(ctx,w,h,p,current,duration){if(!p.lyrics.trim())return;
    const cacheKey=p.lyrics+'|'+duration+'|'+p.lyricDuration;
    if(lastLyrics!==cacheKey){lyricsCache=parseLyrics(p.lyrics,duration,p.lyricDuration);lastLyrics=cacheKey}
    const entries=lyricsCache||[];if(!entries.length)return;
    const now=Math.max(0,current+p.lyricOffset);
    let index=-1;for(let i=0;i<entries.length;i++)if(entries[i].at<=now)index=i;
    if(index<0)return;
    const entry=entries[index],next=entries[index+1]?.at??entry.at+p.lyricDuration;
    const progress=clamp((now-entry.at)/Math.max(.2,next-entry.at),0,1);
    const size=Math.max(14,w*p.lyricSize/100),mode=p.lyricMode;
    let value=entry.text;if(mode==='typewriter')value=value.slice(0,Math.max(1,Math.ceil(value.length*progress*1.3)));
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`800 ${size}px system-ui, sans-serif`;
    ctx.lineJoin='round';ctx.lineWidth=size*.14;ctx.strokeStyle='#050615de';ctx.shadowColor=p.lyricHighlight;ctx.shadowBlur=mode==='pulse'?size*.55:mode==='karaoke'?size*.25:size*.08;
    const lines=[];let line='';for(const word of value.split(/\s+/)){const tryLine=line?line+' '+word:word;
      if(line&&ctx.measureText(tryLine).width>w*.83){lines.push(line);line=word}else line=tryLine}
    if(line)lines.push(line);const base=h*p.lyricY/100;
    if(mode==='slide')ctx.translate(0,(1-Math.min(1,progress*5))*size*.8);
    if(mode==='pulse')ctx.scale(1+Math.sin(now*6)*.015,1+Math.sin(now*6)*.015);
    for(let i=0;i<lines.length;i++){
      const y=base+(i-(lines.length-1)/2)*size*1.22;
      ctx.strokeText(lines[i],w/2,y);ctx.fillStyle=p.lyricColor;ctx.fillText(lines[i],w/2,y);
      if(mode==='karaoke'){
        const width=ctx.measureText(lines[i]).width,offset=lines.slice(0,i).join(' ').length;
        const fraction=clamp((entry.text.length*progress-offset)/Math.max(1,lines[i].length),0,1);
        ctx.save();ctx.beginPath();ctx.rect((w-width)/2-3,y-size*.65,width*fraction+3,size*1.3);ctx.clip();ctx.fillStyle=p.lyricHighlight;ctx.fillText(lines[i],w/2,y);ctx.restore();
      }
    }
    ctx.restore();
  }
  function init(getProject,persist){
    const tabs=document.querySelector('.tabs'),right=document.querySelector('.right');
    const tab=document.createElement('button');tab.dataset.tab='pro';tab.textContent='3D & Lyrics';tabs.append(tab);
    const panel=document.createElement('div');panel.id='proPanel';panel.className='tab-page';
    panel.innerHTML=`<div class="card"><small>BEWEGTER HINTERGRUND</small><h2>GIF & Bilder</h2>
      <p class="hint-text">Animierte GIFs und Bilder als vollflächiger Hintergrund. Der Effekt wird hinter allen anderen Ebenen angezeigt.</p>
      <label class="btn primary">↑ GIF oder Bild wählen<input id="proGifInput" type="file" accept="image/gif,image/png,image/jpeg,image/webp,.gif" hidden></label>
      <h3>Bewegte Hintergründe · Offline-Bibliothek</h3><p class="hint-text">Vier enthaltene Endlos-GIFs. Tippe auf ein Motiv, um es sofort einzusetzen.</p>
      <div id="proGifGallery" class="gif-gallery"></div>
      <p id="proGifStatus" class="hint-text">Noch kein Hintergrund gewählt.</p>
      <label class="check"><input id="proGifEnabled" type="checkbox"> Hintergrund anzeigen</label>
      <div class="grid2"><label>Deckkraft<input id="proGifOpacity" type="range" min="0" max="1" step=".05"></label>
      <label>Zoom<input id="proGifZoom" type="range" min="1" max="2.5" step=".05"></label></div>
      <label>Weichzeichnung<input id="proGifBlur" type="range" min="0" max="12" step="1"></label>
      <p class="hint-text">Hintergrund wird lokal auf dem Gerät gespeichert; GIF nicht im JSON-Backup enthalten.</p></div>
    <div class="card"><small>3D-GEOMETRIE</small><h2>Bewegte 3D-Szenen</h2>
      <p class="hint-text">Räumliche Objekte mit Perspektive, Rotation und Bass-Reaktion. Alle Bewegungen werden in Echtzeit berechnet.</p>
      <label>Objekt<select id="pro3D"><option value="off">Aus</option><option value="torus">Drehender Ring / Torus</option>
      <option value="sphere">Drahtgitter-Kugel</option><option value="cube">Rotierender Würfel</option><option value="tunnel">3D-Tunnel</option></select></label>
      <div class="grid2"><label>Hauptfarbe<input id="pro3DColor" type="color"></label>
      <label>Zweitfarbe<input id="pro3DSecond" type="color"></label>
      <label>Rotation<input id="pro3DSpeed" type="range" min="0" max="3" step=".05"></label>
      <label>Größe<input id="pro3DSize" type="range" min=".2" max="2.8" step=".05"></label>
      <label>Bass-Reaktion<input id="pro3DReaction" type="range" min="0" max="3" step=".1"></label>
      <label>Neigung<input id="pro3DTilt" type="range" min="-180" max="180" step="1"></label></div></div>
    <div class="card"><small>SONGTEXT-SYNCHRONISATION</small><h2>Lyrics-Animator</h2>
      <p class="hint-text">Füge Songtext mit Zeitmarken ein, etwa [00:12.50] Deine Zeile. Ohne Zeitmarken werden die Zeilen gleichmäßig verteilt.</p>
      <textarea id="proLyrics" rows="8" placeholder="[00:00.00] Erste Zeile&#10;[00:04.00] Zweite Zeile"></textarea>
      <div class="lyric-tools"><label class="btn secondary">↑ LRC / TXT auswählen<input id="proLyricFile" type="file" accept=".lrc,.txt,text/plain" hidden></label><button type="button" id="proReadSongLyrics" class="btn secondary">♫ Songtext aus MP3-Tags lesen</button></div>
      <p id="proLyricStatus" class="hint-text">MP3s mit eingebettetem Songtext lassen sich auslesen. Für reine Gesangsaufnahmen ohne Textdaten ist eine separate Spracherkennung nötig.</p>
      <div class="grid2"><label>Textmodus<select id="proLyricMode"><option value="karaoke">Karaoke-Fortschritt</option>
      <option value="typewriter">Schreibmaschine</option><option value="slide">Sanftes Einblenden</option>
      <option value="pulse">Leuchtender Puls</option></select></label>
      <label>Schriftgröße<input id="proLyricSize" type="range" min="3" max="15" step=".5"></label>
      <label>Textfarbe<input id="proLyricColor" type="color"></label>
      <label>Highlight<input id="proLyricHighlight" type="color"></label>
      <label>Vertikale Position<input id="proLyricY" type="range" min="15" max="95" step="1"></label>
      <label>Zeitversatz (Sekunden)<input id="proLyricOffset" type="number" min="-30" max="30" step=".1"></label>
      <label>Zeilendauer ohne Zeitmarken<input id="proLyricDuration" type="number" min="1" max="30" step=".5"></label></div>
      <p class="hint-text">Karaoke markiert den Fortschritt näherungsweise innerhalb der Zeitspanne bis zur nächsten Zeile.</p></div>`;
    right.append(panel);
    const mapping={proGifEnabled:['gifEnabled','checked'],proGifOpacity:['gifOpacity','value'],proGifZoom:['gifZoom','value'],
      proGifBlur:['gifBlur','value'],pro3D:['threeD','value'],pro3DColor:['threeDColor','value'],pro3DSecond:['threeDSecond','value'],
      pro3DSpeed:['threeDSpeed','value'],pro3DSize:['threeDSize','value'],pro3DReaction:['threeDReaction','value'],
      pro3DTilt:['threeDTilt','value'],proLyrics:['lyrics','value'],proLyricMode:['lyricMode','value'],
      proLyricSize:['lyricSize','value'],proLyricColor:['lyricColor','value'],proLyricHighlight:['lyricHighlight','value'],
      proLyricY:['lyricY','value'],proLyricOffset:['lyricOffset','value'],proLyricDuration:['lyricDuration','value']};
    const sync=()=>{const p=getProject().pro=normalize(getProject().pro);for(const [id,[key,prop]]of Object.entries(mapping))$(id)[prop]=p[key]};
    for(const [id,[key,prop]]of Object.entries(mapping)){
      $(id).addEventListener(id==='proLyrics'?'input':'change',()=>{const p=getProject().pro;
        p[key]=prop==='checked'?$(id).checked:$(id).type==='range'||$(id).type==='number'?Number($(id).value):$(id).value;
        persist();
      });
    }
    $('proGifInput').addEventListener('change',async event=>{
      const file=event.target.files?.[0];if(!file)return;
      if(file.size>30_000_000){$('proGifStatus').textContent='Datei zu groß (maximal 30 MB)';return}
      if(!/\.(gif|png|jpg|jpeg|webp)$/i.test(file.name)&&!file.type.startsWith('image/')){
        $('proGifStatus').textContent='Bitte GIF oder Bild wählen';return}
      imgReady(file);getProject().pro.gifEnabled=true;$('proGifEnabled').checked=true;
      $('proGifStatus').textContent=`${file.name} geladen (${(file.size/1_000_000).toFixed(1)} MB)`;
      try{await storage('put',file)}catch(err){$('proGifStatus').textContent+=' · konnte nicht dauerhaft gespeichert werden'}
      persist();event.target.value='';
    });
    const gallery=$('proGifGallery');for(const [key,name]of BACKDROPS){const btn=document.createElement('button');btn.className='gif-card';btn.type='button';btn.innerHTML=`<img src="assets/gifs/${key}.gif" alt=""><span>${name}</span>`;btn.onclick=async()=>{const status=$('proGifStatus');status.textContent='GIF wird geladen …';try{const response=await fetch(`assets/gifs/${key}.gif`);if(!response.ok)throw Error('Datei nicht verfügbar');const blob=await response.blob();imgReady(blob);const p=getProject().pro;p.gifEnabled=true;$('proGifEnabled').checked=true;status.textContent=name+' gewählt · als Hintergrund gespeichert';await storage('put',blob);persist()}catch(e){status.textContent='Hintergrund konnte nicht geladen werden: '+e.message}};gallery.append(btn)}
    $('proLyricFile').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;try{const value=await file.text();getProject().pro.lyrics=value;$('proLyrics').value=value;$('proLyricStatus').textContent=file.name+' eingelesen. Zeitmarken werden übernommen.';persist()}catch(e){$('proLyricStatus').textContent='Songtext konnte nicht geöffnet werden'}event.target.value=''});
    $('proReadSongLyrics').addEventListener('click',async()=>{const input=document.createElement('input');input.type='file';input.accept='.mp3,audio/mpeg';input.onchange=async()=>{const file=input.files?.[0];if(!file)return;const status=$('proLyricStatus');status.textContent='Prüfe eingebettete MP3-Lyrics …';try{const words=await extractMp3Lyrics(file);if(!words){status.textContent='Diese MP3 enthält keine eingebetteten Lyrics. Eine automatische Transkription des Gesangs ist noch nicht enthalten.';return}getProject().pro.lyrics=words;$('proLyrics').value=words;persist();status.textContent='Songtext aus MP3-Metadaten übernommen.'}catch(e){status.textContent='MP3-Tags konnten nicht gelesen werden.'}};input.click()});
    sync();restoreMedia();
    return {sync};
  }
  async function extractMp3Lyrics(file){const bytes=new Uint8Array(await file.slice(0,Math.min(file.size,4_000_000)).arrayBuffer());if(bytes.length<10||String.fromCharCode(...bytes.slice(0,3))!=='ID3')return '';
    const ver=bytes[3],size=(bytes[6]<<21)|(bytes[7]<<14)|(bytes[8]<<7)|bytes[9];let offset=10;const max=Math.min(bytes.length,size+10);
    const decode=(data,enc)=>{if(enc===0)return new TextDecoder('iso-8859-1').decode(data);if(enc===3)return new TextDecoder('utf-8').decode(data);let view=data;if(enc===1&&data.length>1){const be=data[0]===254&&data[1]===255;const le=data[0]===255&&data[1]===254;if(be||le)view=data.slice(2);if(be){const swapped=new Uint8Array(view.length);for(let i=0;i+1<view.length;i+=2){swapped[i]=view[i+1];swapped[i+1]=view[i]}view=swapped}}return new TextDecoder('utf-16le').decode(view)};
    while(offset+10<=max){const frame=String.fromCharCode(...bytes.slice(offset,offset+4));if(!/^[A-Z0-9]{4}$/.test(frame))break;let len=ver===4?((bytes[offset+4]<<21)|(bytes[offset+5]<<14)|(bytes[offset+6]<<7)|bytes[offset+7]):((bytes[offset+4]<<24)|(bytes[offset+5]<<16)|(bytes[offset+6]<<8)|bytes[offset+7]);if(!len||len<0||offset+10+len>max)break;const payload=bytes.slice(offset+10,offset+10+len);if(frame==='USLT'&&payload.length>4){const enc=payload[0],start=4;let end=start;const twoByte=enc===1||enc===2;while(end<payload.length-(twoByte?1:0)){if(payload[end]===0&&(!twoByte||payload[end+1]===0))break;end+=twoByte?2:1}const value=decode(payload.slice(Math.min(payload.length,end+(twoByte?2:1))),enc).replace(/\0/g,'').trim();if(value)return value}offset+=10+len}return ''}
  return {defaults,normalize,init,background,scene3D,lyrics};
})();
