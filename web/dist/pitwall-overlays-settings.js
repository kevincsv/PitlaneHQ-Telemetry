/* Pitlane HQ: an overlay's settings window from the Overlays tab (docs/spec/overlays.md, "The settings window"). The
   overlay live on the left, every setting it has on the right in tabs: for the Relative and the Standings their columns,
   header, footer, rows and what they show; for the rest their options; and for every one its look. The same settings
   (and keys in CFG.ui) as openWidgetCfg in index.html, which the Telemetry tab still uses. */
const OVS={w:null,tab:null,q:""};
const ovsT=(en,es,pt)=>T3(en,es,pt);
// the settings each overlay has beyond OV_OPTS: [kind, field, [en,es,pt], extra]; kinds b (on unless false), t (on when
// true), c (one of), m (several of), n (a number), tb (several switches shown as one group: [[field,en,es,pt]…])
const OVS_OWN={
  rel:{rows:[["n","ahead",["Cars ahead","Coches delante","Carros à frente"],[0,8]],["n","behind",["Cars behind","Coches detrás","Carros atrás"],[0,8]]],show:[["t","flags",["Country flags","Banderas de los países","Bandeiras dos países"]]]},
  std:{rows:[["n","top",["Top positions","Primeras posiciones","Primeiras posições"],[0,30]],["n","around",["Around me","Alrededor mío","Ao meu redor"],[0,10]],["t","myClass",["Only my class","Solo mi clase","Só minha classe"]]],show:[["t","flags",["Country flags","Banderas de los países","Bandeiras dos países"]]]},
  radar:{opt:[["n","range",["Range","Alcance","Alcance"],[10,60,"m"]],["t","autohide",["Hide when no car is near","Ocultar si no hay coches cerca","Ocultar sem carros por perto"]]]},
  boost:{opt:[["t","autohide",["Hide when the car has none","Ocultar si el coche no tiene","Ocultar se o carro não tiver"]]]},
  delta:{opt:[["c","src",["Compare against","Comparar con","Comparar com"],()=>Object.entries(DELTA_SRC).map(([k,v])=>[k,Tx(v[1],v[2])])],["c","range",["Bar range","Rango de la barra","Faixa da barra"],[[.5,"± 0.5 s"],[1,"± 1 s"],[2,"± 2 s"],[5,"± 5 s"]]],
    ["b","predict",["Show the lap this pace gives (your best plus the delta)","Mostrar la vuelta que da este ritmo (tu mejor más el delta)","Mostrar a volta que este ritmo dá (sua melhor mais o delta)"]]]},
  inp:{opt:[["tb","",["Show","Mostrar","Mostrar"],[["gear","Gear","Marcha","Marcha"],["speed","Speed","Velocidad","Velocidade"],["wheel","Steering wheel","Volante","Volante"],["wheelDeg","Steering angle (°)","Ángulo de volante (°)","Ângulo do volante (°)"],["values","Pedal values","Valores de pedales","Valores dos pedais"],["abs","ABS light","Aviso de ABS","Aviso de ABS"],["trace","Trace","Gráfica","Gráfico"]]],
    ["m","bars",["Pedal bars","Barras de pedales","Barras dos pedais"],[["clu","Clutch","Embrague","Embreagem"],["brk","Brake","Freno","Freio"],["thr","Throttle","Acelerador","Acelerador"]]],
    ["c","barDir",["Bars","Barras","Barras"],[["v","Vertical","Verticales","Verticais"],["h","Horizontal","Horizontales","Horizontais"]]],
    ["m","traceCh",["Trace lines","Líneas de la gráfica","Linhas do gráfico"],[["thr","Throttle","Acelerador","Acelerador"],["brk","Brake","Freno","Freio"],["clu","Clutch","Embrague","Embreagem"],["steer","Steering","Volante","Volante"],["abs","ABS zones","Zonas de ABS","Zonas de ABS"]]],
    ["n","traceSecs",["Trace length","Duración de la gráfica","Duração do gráfico"],[3,60,"s"]],["n","traceH",["Trace height","Altura de la gráfica","Altura do gráfico"],[50,400,"px"]]]},
  pit:{opt:[["n","loss",["Time lost in the pits","Tiempo perdido en boxes","Tempo perdido nos boxes"],[5,180,"s"]]]},
  gaps:{opt:[["n","mins",["Minutes shown","Minutos que se ven","Minutos mostrados"],[1,30,"min"]],["n","cars",["Cars each side","Coches a cada lado","Carros de cada lado"],[1,5]]]},
  coach:{opt:[["c","ref",["Reference","Referencia","Referência"],[["level","▲ Next level","▲ Siguiente nivel","▲ Próximo nível"],["best","My best lap","Mi mejor vuelta","Minha melhor volta"]]],
    ["c","mode",["What it shows","Qué muestra","O que mostra"],[["next","Card","Tarjeta","Cartão"],["column","Column","Columna","Coluna"],["curve","Corner drawn","Curva dibujada","Curva desenhada"],["big","Big, for VR","Grande, para VR","Grande, para VR"],["text","Tip only","Solo el consejo","Só a dica"]]],
    ["c","turnName",["How it names the corner","Cómo nombra la curva","Como nomeia a curva"],[["both","Next turn (T7)","Próxima curva (T7)","Próxima curva (T7)"],["words","Next turn","Próxima curva","Próxima curva"],["num","T7","T7","T7"]]],
    ["turns","turns",["Corners","Curvas","Curvas"]],["b","hint",["The fast drivers' braking and apex speed","La frenada y el vértice de los rápidos","A frenagem e o ápice dos rápidos"]],
    ["c","verdict",["Verdict after each corner","Veredicto tras cada curva","Veredito após cada curva"],[[0,"Off","Apagado","Desligado"],[4,"4 s"],[8,"8 s"]]],["c","lead",["Speaks from","Avisa desde","Avisa a partir de"],[[200,"200 m"],[300,"300 m"],[500,"500 m"]]]]}};
const ovsChoices=ch=>(typeof ch==="function"?ch():ch).map(x=>[x[0],x.length>2?T3(x[1],x[2],x[3]):x[1]]);
const ovsK=w=>CONFIGURABLE[w]||null;
const ovsTabs=w=>{const k=ovsK(w),own=OVS_OWN[k]||{},t=[];
  if(k==="rel"||k==="std")t.push(["cols",ovsT("Columns","Columnas","Colunas")],["hf",ovsT("Header and footer","Cabecera y pie","Cabeçalho e rodapé")],["rows",ovsT("Rows","Filas","Linhas")]);
  if(k==="tel")t.push(["vars",ovsT("Values","Valores","Valores")]);
  if(OV_OPTS[w]||own.opt||own.show)t.push(["show",k==="rel"||k==="std"?ovsT("Show","Mostrar","Mostrar"):ovsT("Options","Opciones","Opções")]);
  t.push(["look",ovsT("Look","Aspecto","Aparência")]);return t};
/* the controls: one setting each, on the store key it belongs to */
function ovsCtl(key,o){const[kind,f,lb,x]=o,c=ui(key),lab=esc(T3(lb[0],lb[1],lb[2])),a=`data-k="${key}" data-f="${f}"`;
  if(kind==="b"||kind==="t"){const on=kind==="b"?c[f]!==false:c[f]===true;return `<button type="button" class="ovs-sw" data-s="${kind}" ${a} aria-pressed="${on}"><span>${lab}</span><span class="ovs-tg${on?" on":""}"><i></i></span></button>`}
  if(kind==="n"){const[mn,mx,u]=x,v=+c[f]||0;return `<div class="ovs-num"><span>${lab}</span><span class="ovs-stp"><button type="button" data-s="n" ${a} data-d="-1" data-min="${mn}" data-max="${mx}" aria-label="−"${v<=mn?" disabled":""}>−</button><b>${v}${u?` <small>${u}</small>`:""}</b><button type="button" data-s="n" ${a} data-d="1" data-min="${mn}" data-max="${mx}" aria-label="+"${v>=mx?" disabled":""}>+</button></span></div>`}
  if(kind==="tb")return `<div class="ovs-grp"><span class="ovt-lab">${lab}</span><div class="ovs-opts">${x.map(([g,...n])=>`<button type="button" class="ovt-chip${c[g]?" on":""}" data-s="tb" data-k="${key}" data-f="${g}" aria-pressed="${!!c[g]}">${esc(T3(...n))}</button>`).join("")}</div></div>`;
  if(kind==="turns"){const tid=(S.WeekendInfo||{}).TrackID,turns=tid&&typeof turnsFor==="function"?turnsFor(tid):null,tn=turns&&turns.length?turns.length:0,ct=coachTurnsHere(c);
    return `<div class="ovs-grp"><span class="ovt-lab">${lab}</span><div class="ovs-opts"><button type="button" class="ovt-chip${ct.length?"":" on"}" data-s="turn" data-k="${key}" data-v="" aria-pressed="${!ct.length}">${esc(ovsT("The 3 that cost the most","Las 3 que más cuestan","As 3 que mais custam"))}</button>${Array.from({length:tn},(_,i)=>`<button type="button" class="ovt-chip${ct.includes("T"+(i+1))?" on":""}" data-s="turn" data-k="${key}" data-v="T${i+1}" aria-pressed="${ct.includes("T"+(i+1))}">T${i+1}</button>`).join("")}</div></div>`}
  const opts=ovsChoices(x),on=v=>kind==="m"?(c[f]||[]).includes(v):String(c[f]??(f==="spare"?.3:opts[0][0]))===String(v);
  return `<div class="ovs-grp"><span class="ovt-lab">${lab}</span><div class="ovs-opts">${opts.map(([v,l],j)=>`<button type="button" class="ovt-chip${on(v)?" on":""}" data-s="${kind}" ${a} data-j="${j}" aria-pressed="${on(v)}">${esc(l)}</button>`).join("")}</div></div>`}
// the OV_OPTS of an overlay as controls (their switches are on unless false)
const ovsOpts=w=>{const sp=OV_OPTS[w];return sp?sp.o.map(([f,t,lb,ch])=>ovsCtl(sp.k,[t,f,lb,ch])).join(""):""};
// an ordered list from a catalogue (columns, header and footer items): drag or ↑ ↓ to order, ✕ to take out, + to add
function ovsList(key,field,cat,prefix,title){const c=ui(key),sel=c[field]||[],kind=cat===COLS?"columns":"items",g=aGame(),rest=Object.keys(cat).filter(x=>!sel.includes(x)&&gameHas(g,kind,x)),
    gb=x=>gamesOf(kind,x).length<VIEW_GAMES.length?gameBadges(kind,x):"",nm=x=>L(prefix+x,true);
  return `<div class="ovs-led" data-k="${key}" data-f="${field}"><div class="ovs-ledh"><span class="ovt-lab">${esc(title)} <em>${sel.length}</em></span>${sel.length?`<button type="button" class="ovs-lnk" data-s="clear" data-k="${key}" data-f="${field}">${esc(ovsT("Remove all","Quitar todas","Remover todas"))}</button>`:""}</div>
    <ol class="ovs-ll">${sel.map((x,i)=>`<li draggable="true" data-i="${i}"${gameHas(g,kind,x)?"":` class="nd" title="${esc(gameLacks(g,kind,x))}"`}><span class="ovs-grip" aria-hidden="true">⋮⋮</span><span class="ovs-ln">${nm(x)}${gb(x)}</span>
      <button type="button" data-s="mv" data-k="${key}" data-f="${field}" data-i="${i}" data-d="-1" aria-label="${esc(ovsT("Move up","Subir","Subir"))}"${i?"":" disabled"}>↑</button><button type="button" data-s="mv" data-k="${key}" data-f="${field}" data-i="${i}" data-d="1" aria-label="${esc(ovsT("Move down","Bajar","Descer"))}"${i<sel.length-1?"":" disabled"}>↓</button><button type="button" class="x" data-s="rm" data-k="${key}" data-f="${field}" data-i="${i}" aria-label="${esc(ovsT("Remove","Quitar","Remover"))}">✕</button></li>`).join("")||`<li class="none">${esc(ovsT("None","Ninguna","Nenhuma"))}</li>`}</ol>
    ${rest.length?`<span class="ovt-lab">${esc(ovsT("Add","Añadir","Adicionar"))}</span><div class="ovs-opts">${rest.map(x=>`<button type="button" class="ovt-chip add" data-s="add" data-k="${key}" data-f="${field}" data-v="${x}">+ ${nm(x)}${gb(x)}</button>`).join("")}</div>`:""}</div>`}
function ovsPane(w){const k=ovsK(w),own=OVS_OWN[k]||{},tab=OVS.tab;
  if(tab==="cols")return ovsList(k,"cols",COLS,"col.",ovsT("Columns, in order","Columnas, en orden","Colunas, em ordem"));
  if(tab==="hf")return `<div class="ovs-two">${ovsList(k,"head",ITEMS,"it.",L("header",true))}${ovsList(k,"foot",ITEMS,"it.",L("footer",true))}</div>`;
  if(tab==="rows")return own.rows.map(o=>ovsCtl(k,o)).join("");
  if(tab==="show")return (own.opt||[]).map(o=>ovsCtl(k,o)).join("")+ovsOpts(w)+(own.show||[]).map(o=>ovsCtl(k,o)).join("");
  if(tab==="vars"){const sel=ui("tel").vars,q=OVS.q.toLowerCase(),rest=SCHEMA.map(s=>s.name).filter(n=>!sel.includes(n)&&(!q||n.toLowerCase().includes(q)||telName(n).toLowerCase().includes(q)));
    return `<div class="ovs-led" data-k="tel" data-f="vars"><div class="ovs-ledh"><span class="ovt-lab">${esc(ovsT("Values shown","Valores que se ven","Valores mostrados"))} <em>${sel.length}</em></span></div><ol class="ovs-ll">${sel.map((n,i)=>`<li draggable="true" data-i="${i}"><span class="ovs-grip" aria-hidden="true">⋮⋮</span><span class="ovs-ln">${esc(telName(n))} <small class="mono">${esc(n)}</small></span><button type="button" data-s="mv" data-k="tel" data-f="vars" data-i="${i}" data-d="-1"${i?"":" disabled"} aria-label="↑">↑</button><button type="button" data-s="mv" data-k="tel" data-f="vars" data-i="${i}" data-d="1"${i<sel.length-1?"":" disabled"} aria-label="↓">↓</button><button type="button" class="x" data-s="rm" data-k="tel" data-f="vars" data-i="${i}" aria-label="✕">✕</button></li>`).join("")}</ol>
      <input type="search" id="ovsQ" placeholder="${esc(ovsT("Search variables","Buscar variables","Buscar variáveis"))}" value="${esc(OVS.q)}"><div class="ovs-opts">${rest.length?rest.slice(0,60).map(n=>`<button type="button" class="ovt-chip add" data-s="add" data-k="tel" data-f="vars" data-v="${esc(n)}" title="${esc(n)}">+ ${esc(telName(n))}</button>`).join(""):`<span class="muted">${esc(SCHEMA.length?ovsT("Nothing matches.","No hay coincidencias.","Nada corresponde."):ovsT("The values appear when the game is open.","Los valores aparecen con el juego abierto.","Os valores aparecem com o jogo aberto."))}</span>`}</div></div>`}
  const g=ui(w),own2=(CFG.ui||{})[w]||{},a=ovAlphaOf(w),ts=g.textScale||1,hd=g.hide||"",seg=(s,list,cur)=>`<div class="seg3 ovt-seg3">${list.map(([v,...n])=>`<button type="button" data-s="${s}" data-v="${v}" aria-pressed="${String(cur)===String(v)}">${esc(T3(...n))}</button>`).join("")}</div>`;
  return `<label class="ovs-grp"><span class="ovt-lab">${esc(ovsT("Design","Diseño","Design"))}</span><select id="ovsStyle"><option value="">${esc(ovsT("Same as all","Igual que todos","Igual a todos"))} · ${esc(ovStyleLabel(ovtStyleAll()))}</option>${OV_STYLES.map(([s])=>`<option value="${s}"${own2.style===s?" selected":""}>${esc(ovStyleLabel(s))}${s==="classic"?"":" · Beta"}</option>`).join("")}</select></label>
    <label class="ovs-grp"><span class="ovt-lab">${esc(ovsT("Opacity","Opacidad","Opacidade"))} <b id="ovsAV">${Math.round(a/255*100)}%</b></span><input type="range" id="ovsAlpha" min="60" max="255" step="5" value="${a}"></label>
    <div class="ovs-grp"><span class="ovt-lab">${esc(ovsT("Text size","Tamaño del texto","Tamanho do texto"))}</span>${seg("ts",[[.85,"Small","Pequeño","Pequeno"],[1,"Normal","Normal","Normal"],[1.2,"Large","Grande","Grande"]],ts)}</div>
    <div class="ovs-grp"><span class="ovt-lab">${esc(ovsT("Hide by itself","Ocultarse solo","Ocultar sozinho"))}</span>${seg("hide",[["","Never","Nunca","Nunca"],["car","Out of the car","Fuera del coche","Fora do carro"],["pits","And in the pits","Y en boxes","E nos boxes"]],hd)}</div>
    <div class="ovs-grp"><span class="ovt-lab">${esc(ovsT("Frame rate","Fotogramas por segundo","Quadros por segundo"))}</span><div class="ovs-opts">${[10,15,20,30,45,60].map(n=>`<button type="button" class="ovt-chip${ovsFps(w)===n?" on":""}" data-s="fps" data-v="${n}" aria-pressed="${ovsFps(w)===n}">${n}</button>`).join("")}</div></div>
    ${OV_TITLED.includes(w)?`<button type="button" class="ovs-sw" data-s="title" aria-pressed="${g.title!==false}"><span>${esc(ovsT("Title","Título","Título"))}</span><span class="ovs-tg${g.title!==false?" on":""}"><i></i></span></button>`:""}`}
// an overlay's frame rate (ovFPS in ovpace.go): its own, else the old one for all of them, else its default (the
// radar 60, the standings 10, the rest 30)
const ovsFpsDef=w=>w==="radar"?60:w==="standings"?10:30;
function ovsFps(w){const o=((CFG.ui||{})[w]||{}).fps;if(o>=10&&o<=60)return +o;const g=(CFG.ui||{}).ovfps;return g>=10&&g<30&&w!=="radar"?(w==="standings"?Math.min(10,+g):+g):ovsFpsDef(w)}
/* the overlay itself, live: the overlay page, playing the game's data or a real sample of it (previewSampleTick) */
let OVS_TIMER=0;
function ovsPreview(w){const box=$("#ovsPv");if(!box)return;clearInterval(OVS_TIMER);
  if(MODE==="bridge")ovtPic(box,w); // the overlay drawn by its own code, as on the screen
  else{const sz=OVSZ[w]||[460,260];if(!box.querySelector("iframe"))box.innerHTML=`<div class="ovt-pf"><iframe title="${esc(ovtName(w))}" src="?overlay=${w}&preview=1" style="width:${sz[0]}px;height:${sz[1]}px" tabindex="-1"></iframe></div>`;
    const f=box.querySelector("iframe"),k=Math.min(1,(box.clientWidth||480)/sz[0]);f.style.transform=`scale(${k})`;f.parentElement.style.height=Math.round(sz[1]*k)+"px"}
  box.style.opacity=String(ovAlphaOf(w)/255)}
function ovsDraw(keepScroll){const w=OVS.w,d=$("#ovsDlg");if(!d||!w)return;const tabs=ovsTabs(w);if(!tabs.some(t=>t[0]===OVS.tab))OVS.tab=tabs[0][0];const k=ovsK(w);
  const sc=keepScroll&&$("#ovsPane")?$("#ovsPane").scrollTop:0,first=!d.querySelector("#ovsPv")||d.dataset.w!==w;d.dataset.w=w;
  const copy=[k==="rel"?["std",ovsT("Columns of the Standings","Columnas de la Clasificación","Colunas da Classificação")]:k==="std"?["rel",ovsT("Columns of the Relative","Columnas del Relative","Colunas do Relative")]:null,["__look",ovsT("This look to every overlay","Este aspecto a todos los overlays","Esta aparência a todos os overlays")]].filter(Boolean);
  if(first)d.innerHTML=`<div class="ovs-pn" role="dialog" aria-modal="true" aria-labelledby="ovsT"><div class="ovs-h" data-ovw="${w}"><h2 id="ovsT">${esc(ovtName(w))}</h2>${ovtExpPill(w)}<span class="ovs-auto"><span class="ovs-al">Auto</span><span id="ovsAuto"></span></span><span class="ovt-state">${ovtDot(w)}<span class="on-t">${esc(T3("Open","Abierto","Aberto"))}</span><span class="off-t">${esc(T3("Closed","Cerrado","Fechado"))}</span></span><button type="button" class="ovs-x" data-s="close" aria-label="${esc(ovsT("Close","Cerrar","Fechar"))}">✕</button></div>
    <div class="ovs-grid"><div class="ovs-left"><div class="ovs-pv" id="ovsPv"></div><div class="ovs-pva"><button type="button" class="btn small" data-s="reset">${esc(ovsT("Reset to default","Restablecer","Restaurar padrão"))}</button><select id="ovsCopy" aria-label="${esc(ovsT("Copy from","Copiar de","Copiar de"))}"><option value="">${esc(ovsT("Copy…","Copiar…","Copiar…"))}</option>${copy.map(([v,t])=>`<option value="${v}">${esc(t)}</option>`).join("")}</select></div></div>
    <div class="ovs-right"><div class="ovs-tabs" role="tablist" id="ovsTabs"></div><div class="ovs-pane" id="ovsPane"></div></div></div>
    <div class="ovs-end"><button type="button" class="btn primary" data-s="close">${esc(ovsT("Done","Listo","Pronto"))}</button></div></div>`;
  $("#ovsTabs").innerHTML=tabs.map(([t,n])=>`<button type="button" role="tab" data-tab="${t}" aria-selected="${OVS.tab===t}">${esc(n)}</button>`).join("");
  $("#ovsAuto").innerHTML=ovtAutoPills(w);
  $("#ovsPane").innerHTML=ovsPane(w);$("#ovsPane").scrollTop=sc;
  if(first)ovsPreview(w);else{const p=$("#ovsPv");if(p)p.style.opacity=String(ovAlphaOf(w)/255)}
  if(typeof markOvOpen==="function")d.querySelectorAll("[data-ovw]").forEach(el=>el.classList.toggle("is-open",OV_OPEN.has(el.dataset.ovw)))}
function ovtSettings(w){if(!WIDGETS.includes(w))return;OVS.w=w;OVS.q="";if(!OVS.tab||OVS.lastW!==w)OVS.tab=null;OVS.lastW=w;
  let d=$("#ovsDlg");if(!d){d=document.createElement("div");d.id="ovsDlg";d.className="ovs-bg";document.body.appendChild(d);
    d.addEventListener("click",ovsClick);d.addEventListener("change",ovsChange);d.addEventListener("input",ovsInput);
    d.addEventListener("dragstart",e=>{const li=e.target.closest&&e.target.closest(".ovs-ll li[draggable]");if(!li)return;OVS.drag=+li.dataset.i;li.classList.add("drag");e.dataTransfer.effectAllowed="move";try{e.dataTransfer.setData("text/plain",String(OVS.drag))}catch(x){}});
    d.addEventListener("dragover",e=>{const li=e.target.closest&&e.target.closest(".ovs-ll li[draggable]");if(!li)return;e.preventDefault();d.querySelectorAll(".ovs-ll li.over").forEach(x=>x!==li&&x.classList.remove("over"));li.classList.add("over")});
    d.addEventListener("drop",e=>{const li=e.target.closest&&e.target.closest(".ovs-ll li[draggable]");if(!li)return;e.preventDefault();const led=li.closest(".ovs-led"),key=led.dataset.k,f=led.dataset.f,to=+li.dataset.i,from=OVS.drag;OVS.drag=null;
      if(from==null||from===to)return ovsDraw(true);const a=ui(key)[f].slice(),[x]=a.splice(from,1);a.splice(to,0,x);setUI(key,{[f]:a});if(key==="tel"&&MODE==="bridge")connectBridge();ovsDraw(true)});
    d.addEventListener("dragend",()=>d.querySelectorAll(".ovs-ll li").forEach(x=>x.classList.remove("drag","over")))}
  d.innerHTML="";d.hidden=false;ovsDraw();document.addEventListener("keydown",ovsKey);const b=d.querySelector('.ovs-tabs [aria-selected="true"]');if(b)b.focus()}
function ovsClose(){const d=$("#ovsDlg");if(!d)return;d.hidden=true;d.innerHTML="";clearInterval(OVS_TIMER);document.removeEventListener("keydown",ovsKey);OVS.w=null;if(typeof CUR_VIEW!=="undefined"&&CUR_VIEW==="overlays")renderOverlaysTab()}
const ovsKey=e=>{if(e.key==="Escape"&&OVS.w){e.preventDefault();ovsClose()}};
function ovsClick(e){const d=e.currentTarget;if(e.target===d)return ovsClose();const tb=e.target.closest("[data-tab]");if(tb){OVS.tab=tb.dataset.tab;OVS.q="";return ovsDraw()}
  const au=e.target.closest('#ovsAuto [data-a="auto"]');if(au){if(au.disabled)return;const w=OVS.w,g=au.dataset.g,on=autoIn(w,g);
    if(!on&&!(CFG.autoWidgets||[]).includes(w)&&ovtProNeed(w))return;setAutoIn(w,g,!on);saveCfg();return ovsDraw(true)}
  const b=e.target.closest("[data-s]");if(!b||b.disabled)return;const s=b.dataset.s,key=b.dataset.k,f=b.dataset.f,w=OVS.w;
  if(s==="close")return ovsClose();
  const c=key?ui(key):null,done=()=>{if(key==="tel"&&MODE==="bridge")connectBridge();ovsDraw(true)};
  if(s==="b"){setUI(key,{[f]:c[f]===false});return done()}
  if(s==="t"||s==="tb"){setUI(key,{[f]:!c[f]});return done()}
  if(s==="n"){const v=Math.max(+b.dataset.min,Math.min(+b.dataset.max,(+c[f]||0)+ +b.dataset.d));setUI(key,{[f]:v});return done()}
  if(s==="c"||s==="m"){const spec=ovsSpec(w,key,f),opts=ovsChoices(spec[3]).map(x=>x[0]),v=opts[+b.dataset.j];
    if(s==="c")setUI(key,{[f]:v});else{const cur=c[f]||[];setUI(key,{[f]:opts.filter(x=>x===v?!cur.includes(v):cur.includes(x))})}return done()}
  if(s==="turn"){const t=b.dataset.v,cur=coachTurnsHere(c),nx=t?(cur.includes(t)?cur.filter(x=>x!==t):[...cur,t]):[],tid=+((S.WeekendInfo||{}).TrackID)||0;setUI(key,{turns:nx,turnsTrack:nx.length?tid:0});return done()}
  if(s==="add"){if(key==="tel"){toggleTelVar(b.dataset.v);return ovsDraw(true)}setUI(key,{[f]:[...(c[f]||[]),b.dataset.v]});return done()}
  if(s==="rm"){if(key==="tel"){toggleTelVar(c[f][+b.dataset.i]);return ovsDraw(true)}const a=c[f].slice();a.splice(+b.dataset.i,1);setUI(key,{[f]:a});return done()}
  if(s==="clear"){setUI(key,{[f]:[]});return done()}
  if(s==="mv"){const a=c[f].slice(),i=+b.dataset.i,j=i+ +b.dataset.d;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];setUI(key,{[f]:a});return done()}
  if(s==="ts"){setUI(w,{textScale:+b.dataset.v});return ovsDraw(true)}
  if(s==="hide"){setUI(w,{hide:b.dataset.v});return ovsDraw(true)}
  if(s==="title"){setUI(w,{title:ui(w).title===false});return ovsDraw(true)}
  if(s==="fps"){const n=+b.dataset.v;CFG.ui=CFG.ui||{};const m=Object.assign({},CFG.ui[w]||{});if(n===ovsFpsDef(w))delete m.fps;else m.fps=n;CFG.ui[w]=m;saveCfg();return ovsDraw(true)}
  if(s==="reset")return ovsReset(w)}
// the spec of a choice, from OVS_OWN or OV_OPTS
function ovsSpec(w,key,f){const own=OVS_OWN[key]||{};for(const o of [...(own.opt||[]),...(own.rows||[]),...(own.show||[])])if(o[1]===f)return o;const sp=OV_OPTS[w];if(sp&&sp.k===key){const o=sp.o.find(x=>x[0]===f);if(o)return[o[1],o[0],o[2],o[3]]}return["c",f,["","",""],[]]}
async function ovsReset(w){if(!await uiConfirm(ovsT(`Put ${ovtName(w)} back as it comes?`,`¿Dejar ${ovtName(w)} como viene?`,`Deixar ${ovtName(w)} como vem?`)))return;
  CFG.ui=CFG.ui||{};const k=ovsK(w),sp=OV_OPTS[w];if(k&&k!=="tel")delete CFG.ui[k];if(sp&&sp.k!==k)delete CFG.ui[sp.k];
  const m=Object.assign({},CFG.ui[w]||{});["style","alpha","textScale","hide","title","fps"].forEach(x=>delete m[x]);CFG.ui[w]=m;saveCfg();
  const d=$("#ovsDlg");if(d)d.innerHTML="";ovsDraw();toast(ovsT("Settings back to how they come.","Ajustes como vienen.","Ajustes como vêm."))}
function ovsChange(e){const t=e.target,w=OVS.w;if(!w)return;
  if(t.id==="ovsStyle"){CFG.ui=CFG.ui||{};const m=Object.assign({},CFG.ui[w]||{});if(t.value)m.style=t.value;else delete m.style;CFG.ui[w]=m;saveCfg();return ovsDraw(true)}
  if(t.id==="ovsAlpha"){setUI(w,{alpha:Math.max(60,Math.min(255,+t.value||255))});return}
  if(t.id==="ovsCopy"){const v=t.value;t.value="";if(!v)return;
    if(v==="__look"){CFG.ui=CFG.ui||{};const me=(CFG.ui[w]||{});WIDGETS.forEach(x=>{if(x===w)return;const m=Object.assign({},CFG.ui[x]||{});["style","alpha","textScale","hide","fps"].forEach(k=>{if(k in me)m[k]=me[k];else delete m[k]});CFG.ui[x]=m});saveCfg();toast(ovsT("Look copied to every overlay.","Aspecto copiado a todos los overlays.","Aparência copiada para todos os overlays."));return}
    const o=ui(v);setUI(ovsK(w),{cols:o.cols.slice(),head:o.head.slice(),foot:o.foot.slice()});toast(ovsT("Columns, header and footer copied.","Columnas, cabecera y pie copiados.","Colunas, cabeçalho e rodapé copiados."));ovsDraw(true)}}
function ovsInput(e){const t=e.target;
  if(t.id==="ovsAlpha"){const p=$("#ovsPv"),v=$("#ovsAV");if(p)p.style.opacity=String(+t.value/255);if(v)v.textContent=Math.round(+t.value/255*100)+"%"}
  if(t.id==="ovsQ"){OVS.q=t.value;const pos=t.selectionStart;ovsDraw(true);const n=$("#ovsQ");if(n){n.focus();n.setSelectionRange(pos,pos)}}}
addEventListener("resize",()=>{if(OVS.w&&MODE!=="bridge")ovsPreview(OVS.w)});

(function ovsCss(){if(document.getElementById("ovsCss"))return;const s=document.createElement("style");s.id="ovsCss";s.textContent=`
.ovs-bg{position:fixed;inset:0;z-index:60;display:flex;justify-content:center;align-items:flex-start;overflow:auto;background:rgba(3,6,10,.66);padding:4vh 16px}.ovs-bg[hidden]{display:none!important}
.ovs-pn{width:min(1100px,100%);margin:auto 0;display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--line2,var(--line));border-radius:var(--radius,12px);overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.5)}
.ovs-h{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--line)}.ovs-h h2{flex:1;margin:0;font:700 22px var(--f-display,inherit);letter-spacing:.06em;text-transform:uppercase}
.ovs-auto{display:inline-flex;align-items:center;gap:8px}.ovs-al{font:600 10px var(--f-data);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}@media(max-width:640px){.ovs-h{flex-wrap:wrap}.ovs-auto{order:5;flex:1 1 100%}}
.ovs-h .ovt-state .on-t{display:none}.ovs-h.is-open .ovt-state .on-t{display:inline}.ovs-h.is-open .ovt-state .off-t{display:none}.ovs-h .ovt-state{display:inline-flex;align-items:center;gap:6px;font:600 10px var(--f-data);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.ovs-x{width:36px;height:36px;border-radius:8px;border:1px solid var(--line);background:var(--surface2);color:var(--muted);cursor:pointer}
.ovs-grid{display:grid;grid-template-columns:minmax(0,1fr)}.ovs-grid>*{min-width:0}
.ovs-left{padding:22px 18px 16px;border-bottom:1px solid var(--line);background:radial-gradient(120% 90% at 50% 0%,color-mix(in srgb,var(--surface2) 80%,#1a2230),var(--bg));display:flex;flex-direction:column;align-items:center;gap:12px}
.ovs-pv{min-height:120px;width:100%;transition:opacity .15s}.ovs-pv .ovt-pic{margin:0 auto}.ovs-pv .ovt-pf{position:relative;overflow:hidden}.ovs-pv iframe{border:0;transform-origin:0 0;background:transparent;pointer-events:none}
.ovs-pva{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}.ovs-pva select{min-height:30px;font-size:12px}
.ovs-right{display:flex;flex-direction:column}
.ovs-tabs{display:flex;gap:2px;padding:10px 14px 0;border-bottom:1px solid var(--line);overflow-x:auto}
.ovs-tabs button{border:0;background:none;color:var(--muted);font:600 12px var(--f-body,inherit);letter-spacing:.04em;text-transform:uppercase;padding:9px 11px;border-bottom:2px solid transparent;white-space:nowrap;cursor:pointer}
.ovs-tabs button[aria-selected=true]{color:var(--fg);border-bottom-color:var(--accent)}
.ovs-pane{padding:16px 18px;display:flex;flex-direction:column;gap:14px}
.ovs-grp{display:flex;flex-direction:column;gap:8px}.ovs-grp .ovt-lab b{float:right;color:var(--fg)}.ovt-lab em{font-style:normal;color:var(--accent);margin-left:4px}
.ovs-opts{display:flex;flex-wrap:wrap;gap:8px}
.ovs-sw{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:44px;padding:0 12px;border-radius:8px;border:1px solid var(--line);background:var(--surface2);color:var(--fg);text-align:left;font:500 13px var(--f-body,inherit);cursor:pointer}
.ovs-tg{position:relative;flex:none;width:40px;height:22px;border-radius:11px;background:var(--line2,var(--line))}.ovs-tg i{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--muted);transition:.15s}.ovs-tg.on{background:var(--accent)}.ovs-tg.on i{left:21px;background:var(--bg)}
.ovs-num{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px;padding:0 6px 0 12px;border-radius:8px;border:1px solid var(--line);background:var(--surface2);font-size:13px}
.ovs-stp{display:flex;align-items:center;gap:4px}.ovs-stp button{width:34px;height:34px;border-radius:7px;border:1px solid var(--line);background:var(--bg);color:var(--fg);font-size:16px;cursor:pointer}.ovs-stp button:disabled{opacity:.35;cursor:default}.ovs-stp b{min-width:56px;text-align:center;font:600 15px var(--f-data)}.ovs-stp small{color:var(--muted);font-size:11px}
.ovs-led{display:flex;flex-direction:column;gap:8px}.ovs-ledh{display:flex;justify-content:space-between;align-items:center}.ovs-lnk{border:0;background:none;color:var(--muted);font-size:12px;text-decoration:underline;cursor:pointer}
.ovs-ll{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.ovs-ll li{display:flex;align-items:center;gap:6px;min-height:38px;padding:0 6px 0 8px;border-radius:7px;border:1px solid var(--line);background:var(--surface2);font-size:13px}
.ovs-ll li.none{color:var(--muted);justify-content:center;border-style:dashed;background:none}.ovs-ll li.drag{opacity:.4}.ovs-ll li.over{border-color:var(--accent)}.ovs-ll li.nd .ovs-ln{opacity:.5}
.ovs-ll li button{width:30px;height:30px;border-radius:6px;border:1px solid transparent;background:none;color:var(--muted);cursor:pointer}.ovs-ll li button:hover{border-color:var(--line);color:var(--fg)}.ovs-ll li button:disabled{opacity:.25;cursor:default}.ovs-ll li .x:hover{color:var(--bad)}
.ovs-grip{cursor:grab;color:var(--muted);letter-spacing:-2px;font-size:12px}.ovs-ln{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ovs-ln small{color:var(--muted)}
.ovs-two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
#ovsQ{min-height:36px;width:100%}
.ovs-end{display:flex;justify-content:flex-end;padding:12px 18px;border-top:1px solid var(--line)}
@media (max-width:820px){.ovs-grid{grid-template-columns:minmax(0,1fr)}.ovs-two{grid-template-columns:minmax(0,1fr)}}
`;document.head.appendChild(s)})();
