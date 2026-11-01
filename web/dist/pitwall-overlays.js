/* The Overlays tab (docs/spec/overlays.md, "The Overlays tab"). One set of controls in three layouts the driver
   switches between (`pw.ovLayout`, kept on this PC): Screen (the overlay list, the screen with the overlays placed on
   it and the chosen overlay's main settings beside it), Gallery (a card with a picture for every overlay) and List (the
   overlays as grouped rows). Every layout reads and writes the same settings as the rest of the app: CFG.autoWidgets
   with ui.autoOff per game (autoIn/setAutoIn), the open windows (OV_OPEN, /api/overlay/*), the positions
   (CFG.positions), the design for all (ui.ovstyle) and each overlay's own window settings (ui.<overlay>: style, alpha,
   textScale, hide, title). Loaded after index.html's main script, whose globals it uses. */

/* the four groups every layout shows; an overlay missing here goes to the last one */
const OVT_GROUPS=[["around",["relative","standings","radar","map","trackbar","flag","gaps","incidents"]],
  ["pace",["timing","deltabar","coach","brakes","sectors","compare"]],
  ["car",["dash","inputs","fuel","tyres","engine","pit","boost"]],
  ["more",["weather","gg","stats","telemetry","system"]]];
const OVT_GROUP_NAMES={around:["Around you","A tu alrededor","Ao seu redor"],pace:["Pace","Ritmo","Ritmo"],car:["Car","Coche","Carro"],more:["More","Más","Mais"]};
const OVT_LAYOUTS=[["screen","Screen","Pantalla","Tela"],["gallery","Gallery","Galería","Galeria"],["list","List","Lista","Lista"]];
/* the built-in presets: the overlays they open when you get in the car */
const OVT_PRESETS={race:["radar","deltabar","relative","standings"],qualifying:["deltabar","compare","inputs","map"],endurance:["relative","fuel","tyres","deltabar","standings"],engineer:["map","relative","radar","inputs","fuel","tyres","telemetry"]};
const OVT_PRESET_NAMES={race:["Race","Carrera","Corrida"],qualifying:["Qualifying","Clasificación","Classificação"],endurance:["Endurance","Resistencia","Resistência"],engineer:["Engineer","Ingeniero","Engenheiro"]};
/* the look of each design in the Gallery's picker: panel, accent, text */
const OVT_SWATCH={classic:["#1a1f29","#c9cfda","#3a4456"],lane:["#11161d","#f5b82e","#e6e9ef"],wall:["#0d0f12","#5aa9ff","#e6e9ef"],board:["#151c25","#3ddc84","#e6e9ef"],frameless:["transparent","#e6e9ef","#8a93a3"],light:["#eef1f5","#1f63c6","#141a22"]};

const OVT={layout:"screen",sel:"",q:"",filter:"all",fold:new Set(),frame:"",prevW:"",openKey:""};
try{const l=store.get("pw.ovLayout","screen");if(OVT_LAYOUTS.some(x=>x[0]===l))OVT.layout=l;OVT.sel=store.get("pw.ovSel","")||"";OVT.fold=new Set(store.get("pw.ovFold",[])||[])}catch(e){}

const ovtGroups=()=>{const seen=new Set(),g=OVT_GROUPS.map(([k,l])=>{const ws=l.filter(w=>WIDGETS.includes(w));ws.forEach(w=>seen.add(w));return[k,ws]});
  const rest=WIDGETS.filter(w=>!seen.has(w));if(rest.length)g[g.length-1][1].push(...rest);return g};
const ovtGroupOf=w=>(ovtGroups().find(([,l])=>l.includes(w))||["more"])[0];
/* the overlay's name as plain text (the i18n table keeps it as HTML) */
const OVT_NAMES={};
const ovtName=w=>{const k=LANG+w;if(!(k in OVT_NAMES)){const d=document.createElement("textarea");d.innerHTML=L("w."+w,true);OVT_NAMES[k]=d.value}return OVT_NAMES[k]};
const ovtAutoGames=w=>VIEW_GAMES.filter(g=>gameHas(g,"widgets",w));
const ovtAutoAny=w=>VIEW_GAMES.some(g=>autoIn(w,g));
const ovtAutoAll=w=>{const gs=ovtAutoGames(w);return gs.length>0&&gs.every(g=>autoIn(w,g))};
const ovtRemote=()=>pcOverlays();
const ovtExp=w=>!OV_BASIC.includes(w);
const ovtMatch=w=>!OVT.q||ovtName(w).toLowerCase().includes(OVT.q.toLowerCase());
const ovtIcon={
  cfg:'<svg class="ovt-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  screen:'<svg class="ovt-ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  grid:'<svg class="ovt-ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/></svg>',
  list:'<svg class="ovt-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>',
  search:'<svg class="ovt-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  chev:'<svg class="ovt-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'};

/* ---------- presets (yours live in the overlay settings, CFG.ui.ovpresets, so they go with the account) ---------- */
function ovtMyPresets(){const u=(CFG.ui||{}).ovpresets,list=u&&u.list&&typeof u.list==="object"?{...u.list}:{};
  try{const old=JSON.parse(localStorage.getItem("pw.overlayPresets")||"null");if(old&&typeof old==="object"){let moved=false;Object.keys(old).forEach(k=>{if(!list[k]&&Array.isArray(old[k])){list[k]=old[k];moved=true}});localStorage.removeItem("pw.overlayPresets");if(moved)ovtSavePresets(list)}}catch(e){}
  return list}
function ovtSavePresets(list){CFG.ui=CFG.ui||{};CFG.ui.ovpresets={list};saveCfg()}
function ovtApplyPreset(ws){CFG.autoWidgets=ws.filter(w=>WIDGETS.includes(w));if(CFG.ui)delete CFG.ui.autoOff;CFG.autoStart=true;CFG.closeOnExit=true;saveCfg();renderOverlaysTab();toast(T3("Overlay preset applied.","Perfil de overlays aplicado.","Perfil de overlays aplicado."))}
const ovtSameSet=(a,b)=>{const x=[...new Set(a)].sort().join(),y=[...new Set(b)].sort().join();return x===y&&!!x};
const ovtPresetOn=ws=>ovtSameSet(ws.filter(w=>WIDGETS.includes(w)),CFG.autoWidgets||[])&&!Object.keys((CFG.ui||{}).autoOff||{}).length;

/* ---------- a small picture of each overlay (Gallery cards, the Screen layout away from the agent) ---------- */
function ovtThumb(w){
  const rows=n=>`<div class="ovt-th-rows">${Array.from({length:n},(_,i)=>`<i${i===Math.floor(n/2)?' class="me"':""}></i>`).join("")}</div>`;
  const tiles=v=>`<div class="ovt-th-tiles">${v.map(([t,c])=>`<b${c?` class="${c}"`:""}>${esc(t)}</b>`).join("")}</div>`;
  const chart=(a,b)=>`<svg class="ovt-th-chart" viewBox="0 0 150 70" aria-hidden="true"><path class="a" d="${a}"/>${b?`<path class="b" d="${b}"/>`:""}</svg>`;
  const k={
    relative:()=>rows(5),standings:()=>rows(6),incidents:()=>`<div class="ovt-th-rows inc"><i></i><i class="bad"></i><i></i><i></i></div>`,
    radar:()=>`<div class="ovt-th-radar"><i class="me"></i><i class="side"></i><i class="bar"></i><i class="back"></i></div>`,
    map:()=>`<svg class="ovt-th-map" viewBox="0 0 120 80" aria-hidden="true"><path d="M14 58C10 30 30 12 56 16c24 4 18 22 40 18 18-4 16 28-4 32-26 6-72 10-78-8Z"/><circle class="me" cx="56" cy="16" r="4.5"/><circle class="o1" cx="96" cy="34" r="3.5"/><circle class="o2" cx="30" cy="70" r="3.5"/></svg>`,
    deltabar:()=>`<div class="ovt-th-delta"><i></i><b>−0.24</b></div>`,
    trackbar:()=>`<div class="ovt-th-tbar"><i style="left:12%"></i><i style="left:30%"></i><i class="me" style="left:47%"></i><i style="left:55%"></i><i style="left:81%"></i></div>`,
    flag:()=>`<div class="ovt-th-flag">T7</div>`,
    dash:()=>`<div class="ovt-th-gear"><span class="leds"><i class="g"></i><i class="g"></i><i class="y"></i><i class="y"></i><i class="r"></i><i></i></span><b>4</b><small>184</small></div>`,
    boost:()=>`<div class="ovt-th-gear"><span class="pill">DRS</span><span class="ovt-th-meter"><i style="width:64%"></i></span></div>`,
    gg:()=>`<div class="ovt-th-gg"><i class="dot"></i></div>`,
    gaps:()=>chart("M0 40 L20 36 L40 42 L60 30 L80 32 L100 22 L120 26 L150 14","M0 52 L22 50 L44 56 L66 50 L88 54 L110 46 L130 50 L150 44"),
    compare:()=>chart("M0 50 L20 44 L38 52 L58 30 L78 36 L98 18 L118 26 L150 12","M0 58 L22 54 L42 58 L62 46 L84 50 L104 40 L126 44 L150 36"),
    telemetry:()=>chart("M0 30 L15 30 L25 60 L45 60 L55 20 L80 20 L90 50 L115 50 L125 25 L150 25"),
    inputs:()=>`<svg class="ovt-th-chart" viewBox="0 0 150 70" aria-hidden="true"><path class="thr" d="M0 14 L40 14 L48 62 L80 62 L92 14 L150 14"/><path class="brk" d="M0 66 L40 66 L44 18 L60 40 L78 66 L150 66"/></svg>`,
    brakes:()=>`<div class="ovt-th-brk"><i></i><i></i><i class="on"></i><b>100</b></div>`,
    system:()=>chart("M0 40 L10 36 L20 42 L30 34 L40 38 L50 30 L60 36 L70 33 L80 40 L90 31 L100 35 L110 30 L120 37 L130 32 L140 36 L150 31"),
    sectors:()=>`<div class="ovt-th-sec">${["p","g","g","y","g","p","y","g","g","y","g","g"].map(c=>`<i class="${c}"></i>`).join("")}</div>`,
    timing:()=>tiles([["1:32.418"],["−0.24","good"],["1:31.902","pb"],["1:32.660"]]),
    fuel:()=>tiles([["42.3"],["2.71"],["15.6"],["+3.1","good"]]),
    tyres:()=>tiles([["86°"],["88°"],["82°","good"],["91°","warn"]]),
    engine:()=>tiles([["92°"],["104°","warn"],["13.8V"],["4.2"]]),
    pit:()=>tiles([["24.1"],["+18.0"],["P7"],["2:41"]]),
    weather:()=>tiles([["31°"],["22°"],["↗ 9"],["0%"]]),
    stats:()=>tiles([["64%"],["18%"],["212"],["7.4°"]]),
    coach:()=>`<div class="ovt-th-coach"><b>T7</b><span class="ovt-th-meter"><i style="width:72%"></i></span><small>120 m</small></div>`};
  return `<div class="ovt-th" aria-hidden="true">${(k[w]||(()=>rows(4)))()}</div>`}

/* ---------- the parts every layout shares ---------- */
function ovtAutoPills(w){return `<span class="ovt-games">${VIEW_GAMES.map(g=>{const ok=gameHas(g,"widgets",w),on=ok&&autoIn(w,g);
  return `<button type="button" class="ovt-gp${on?" on":""}" data-a="auto" data-w="${w}" data-g="${g}" aria-pressed="${on}"${ok?"":` disabled title="${esc(gameLacks(g,"widgets",w))}"`} aria-label="${esc(ovtName(w)+" · "+GAME_NAMES[g]+" · "+T3("when I get in the car","al entrar al coche","ao entrar no carro"))}">${esc(GAME_SHORT[g])}</button>`}).join("")}</span>`}
function ovtSwitch(w){const all=ovtAutoAll(w),any=ovtAutoAny(w),ok=ovtAutoGames(w).length>0;
  return `<button type="button" class="ovt-sw${all?" on":any?" half":""}" data-a="autoall" data-w="${w}" role="switch" aria-checked="${all?"true":any?"mixed":"false"}"${ok?"":" disabled"} title="${esc(T3("When I get in the car","Al entrar al coche","Ao entrar no carro"))}"><i></i><span>Auto</span></button>`}
function ovtOpenBtn(w){const op=OV_OPEN.has(w);
  if(ovtRemote())return `<button type="button" class="btn small ovt-open${op?" on":""}" data-a="open" data-w="${w}">${esc(op?T3("Close","Cerrar","Fechar"):T3("Open","Abrir","Abrir"))}</button>`;
  if(MODE==="bridge")return `<button type="button" class="btn small ovt-open" data-a="here" data-w="${w}">${L("openHere",true)}</button>`;
  return ""}
const ovtCfgBtn=w=>`<button type="button" class="btn small ovt-cfg" data-a="cfg" data-w="${w}" aria-label="${esc(L("configure",true)+" · "+ovtName(w))}" title="${esc(L("configure",true))}">${ovtIcon.cfg}</button>`;
const ovtExpPill=w=>ovtExp(w)?`<span class="ovt-exp">${esc(T3("Experimental","Experimental","Experimental"))}</span>`:"";
const ovtDot=w=>`<span class="ovt-dot" aria-hidden="true"></span>`;
const ovtStyleAll=()=>ovStyleOk((CFG.ui||{}).ovstyle)?CFG.ui.ovstyle:OV_DEFAULT_STYLE;

function ovtPresetsHTML(){const mine=ovtMyPresets();
  return `<span class="ovt-lab">${esc(T3("Presets","Perfiles","Perfis"))}</span>`+
    Object.keys(OVT_PRESETS).map(k=>{const on=ovtPresetOn(OVT_PRESETS[k]);return `<button type="button" class="ovt-chip${on?" on":""}" data-a="preset" data-k="${k}" aria-pressed="${on}">${esc(T3(...OVT_PRESET_NAMES[k]))}</button>`}).join("")+
    Object.keys(mine).map(k=>{const on=ovtPresetOn(mine[k]||[]);return `<span class="ovt-chip mine${on?" on":""}"><button type="button" data-a="mypreset" data-k="${esc(k)}" aria-pressed="${on}">${esc(k)}</button><button type="button" class="x" data-a="delpreset" data-k="${esc(k)}" aria-label="${esc(T3("Delete","Eliminar","Excluir")+" "+k)}">×</button></span>`}).join("")+
    `<button type="button" class="ovt-chip add" data-a="savepreset">+ ${esc(T3("Save current","Guardar el actual","Salvar o atual"))}</button>`}
function ovtDesignHTML(){const cur=ovtStyleAll(),lab=`<span class="ovt-lab">${esc(T3("Design","Diseño","Design"))}</span>`;
  if(OVT.layout==="gallery")return lab+`<div class="ovt-designs">${OV_STYLES.map(([k])=>{const s=OVT_SWATCH[k]||OVT_SWATCH.classic;
    return `<button type="button" class="ovt-design${cur===k?" on":""}" data-a="style" data-k="${k}" aria-pressed="${cur===k}"><span class="sw${s[0]==="transparent"?" clear":""}" style="background:${s[0]}"><i style="background:${s[1]}"></i><i style="background:${s[2]}"></i></span><span class="nm">${esc(ovStyleLabel(k))}${k==="classic"?"":`<em>Beta</em>`}</span></button>`}).join("")}</div>`;
  return `<label class="ovt-designsel">${lab}<select data-c="style">${OV_STYLES.map(([k])=>`<option value="${k}"${cur===k?" selected":""}>${esc(ovStyleLabel(k))}${k==="classic"?"":" · Beta"}</option>`).join("")}</select></label>`}
function ovtFootHTML(){
  return `${chk("oAuto",CFG.autoStart,L("autoOpen",true))}${chk("oClose",CFG.closeOnExit,L("closeExit",true))}
    <details class="ovt-more"><summary>${esc(T3("More settings","Más ajustes","Mais ajustes"))}</summary><div class="ovt-morebody">
      <label class="ovt-f"><span class="ovt-lab">${L("engineSel",true)}</span><select data-c="engine"><option value="webview">${esc(T3("Frameless (recommended)","Sin bordes (recomendado)","Sem bordas (recomendado)"))}</option><option value="edge">${esc(T3("Edge window","Ventana de Edge","Janela do Edge"))}</option></select></label>
      <div class="ovt-f"><span class="ovt-lab">${esc(T3("Titles","Títulos","Títulos"))}</span><span class="seg3"><button type="button" data-a="ttl" data-k="1" aria-pressed="${OV_TITLED.every(w=>ui(w).title!==false)}">${esc(T3("Show all","Mostrar todos","Mostrar todos"))}</button><button type="button" data-a="ttl" data-k="0" aria-pressed="${OV_TITLED.every(w=>ui(w).title===false)}">${esc(T3("Hide all","Ocultar todos","Ocultar todos"))}</button></span></div>
      <label class="ovt-f"><span class="ovt-lab">${esc(T3("Frame rate","Fotogramas por segundo","Quadros por segundo"))}</span><select data-c="fps">${[30,20,15,10].map(n=>`<option value="${n}"${((CFG.ui||{}).ovfps||30)===n?" selected":""}>${esc(T3(n+" a second",n+" por segundo",n+" por segundo"))}</option>`).join("")}</select></label>
      ${chk("oLock",CFG.lock,L("clickThrough",true))}</div></details>`}
function ovtCounts(){const open=WIDGETS.filter(w=>OV_OPEN.has(w)).length,auto=WIDGETS.filter(ovtAutoAny).length,s=$("#ovSub");if(!s)return;
  s.textContent=(ovtRemote()?T3(`${open} open`,`${open} abiertos`,`${open} abertos`)+" · ":"")+T3(`${auto} on Auto`,`${auto} en Auto`,`${auto} no Auto`)}

/* ---------- the frame: built once per layout and language, so the search box keeps its focus and the preview its page ---------- */
function ovtFrame(){const root=$("#ovTab");if(!root)return null;const key=OVT.layout+"|"+LANG;if(OVT.frame===key&&root.firstChild)return root;OVT.frame=key;OVT.prevW="";
  const seg=OVT_LAYOUTS.map(([k,...n])=>`<button type="button" data-a="layout" data-k="${k}" aria-pressed="${OVT.layout===k}">${ovtIcon[k==="screen"?"screen":k==="gallery"?"grid":"list"]}<span>${esc(T3(...n))}</span></button>`).join("");
  const search=`<label class="ovt-search">${ovtIcon.search}<input type="search" data-c="q" placeholder="${esc(T3("Find an overlay","Buscar un overlay","Procurar um overlay"))}" aria-label="${esc(T3("Find an overlay","Buscar un overlay","Procurar um overlay"))}" value="${esc(OVT.q)}"></label>`;
  const body=OVT.layout==="screen"?`<div class="ovt-b"><nav class="ovt-nav" id="ovtNav" aria-label="${esc(L("tab.overlays",true))}"></nav>
      <div class="ovt-stage"><div class="ovt-stagebar" id="ovtStageBar"></div><div class="screen ovt-screen" id="ovScreen"></div></div>
      <aside class="ovt-insp" id="ovtInspBox"><div id="ovtInspHead"></div><div class="ovt-prev" id="ovtPrev"></div><div id="ovtInsp"></div></aside></div>`
    :`<div id="ovtPlace"></div>${OVT.layout==="gallery"?`<div class="ovt-filters"><div class="ovt-seg sm" id="ovtFilters"></div>${search}</div>`:`<div class="ovt-filters"><span></span>${search}</div>`}<div id="ovtBody"></div>`;
  root.className="ovt ovt-l-"+OVT.layout;
  root.innerHTML=`<div class="ovt-bar"><div class="ovt-seg" role="group" aria-label="${esc(T3("Layout","Vista","Layout"))}">${seg}</div><div class="ovt-acts" id="ovtActs"></div></div>
    <div class="ovt-tools"><div class="ovt-presets" id="ovtPresets"></div><div class="ovt-design-box" id="ovtDesign"></div></div>
    ${body}<div class="ovt-foot" id="ovtFoot"></div>`;
  root.onclick=ovtClick;root.onchange=ovtChange;root.oninput=ovtInput;return root}

function renderOverlaysTab(){const root=ovtFrame();if(!root)return;const remote=ovtRemote(),dis=remote?"":" disabled";
  if(!PRO.tried)loadPro().then(()=>{if(PRO.loaded&&typeof CUR_VIEW!=="undefined"&&CUR_VIEW==="overlays")renderOverlaysTab()});
  // without Pro on this PC once the beta is over the experimental ones close; the Auto list is left as it is (it goes
  // with the account, so the PC with Pro keeps it): the agent opens only the first basic ones (proAutoList in pcid.go)
  if(proGated())WIDGETS.filter(w=>!OV_BASIC.includes(w)&&OV_OPEN.has(w)).forEach(w=>{OV_OPEN.delete(w);fetch(`/api/overlay/close?w=${w}`,{method:"POST"}).catch(()=>{})});
  const c=$("#ovCallout");if(c){const t=MODE!=="bridge"?Lp("Overlay windows open when the app runs in Pitlane HQ Agent on your Windows PC. You can set them up here already.","Las ventanas overlay se abren cuando la app funciona en Pitlane HQ Agent en tu PC con Windows. Ya puedes configurarlas aquí.",false,null,"As janelas overlay abrem quando o app roda no Pitlane HQ Agent no seu PC com Windows. Você já pode configurá-las aqui."):!remote?Lp("Overlay windows need Pitlane HQ Agent running on Windows.","Las ventanas overlay necesitan Pitlane HQ Agent en Windows.",false,null,"As janelas overlay precisam do Pitlane HQ Agent no Windows."):"";c.innerHTML=t;c.hidden=!t}
  $("#ovtActs").innerHTML=`<button type="button" class="btn${CFG.edit?" primary":""}" data-a="edit" aria-pressed="${!!CFG.edit}"${remote||MODE==="local"?"":dis}>${esc(CFG.edit?T3("Done placing","Terminar de colocar","Terminar de posicionar"):T3("Place on the screen","Colocar en la pantalla","Posicionar na tela"))}</button>
    <button type="button" class="btn" data-a="closeall"${dis}>${L("closeAll",true)}</button><button type="button" class="btn primary" data-a="opennow"${dis}>${esc(T3("Open now","Abrir ahora","Abrir agora"))}</button>`;
  $("#ovtPresets").innerHTML=ovtPresetsHTML();$("#ovtDesign").innerHTML=ovtDesignHTML();
  const foot=$("#ovtFoot");foot.innerHTML=ovtFootHTML();const eng=foot.querySelector('[data-c="engine"]');if(eng)eng.value=CFG.engine||"webview";
  if(OVT.layout==="screen")ovtRenderScreen();else ovtRenderBody();
  ovtCounts();markOvOpen();markGameGaps();renderScreenEditor();refreshScreenRects()}

/* Screen layout: the list, the screen and the chosen overlay */
function ovtPick(){if(WIDGETS.includes(OVT.sel))return OVT.sel;return WIDGETS.find(w=>OV_OPEN.has(w))||WIDGETS.find(ovtAutoAny)||"relative"}
function ovtRenderScreen(){const sel=ovtPick();OVT.sel=sel;
  $("#ovtNav").innerHTML=ovtGroups().map(([g,ws])=>`<div class="ovt-ng"><span class="ovt-gh">${esc(T3(...OVT_GROUP_NAMES[g]))}</span>${ws.map(w=>`<button type="button" class="ovt-ni${w===sel?" sel":""}" data-a="sel" data-w="${w}" data-ovw="${w}" aria-current="${w===sel}">${ovtDot(w)}<span class="nm">${esc(ovtName(w))}</span>${ovtAutoAny(w)?`<span class="ovt-auto">Auto</span>`:""}${ovtExp(w)?`<span class="ovt-x" title="${esc(T3("Experimental","Experimental","Experimental"))}">β</span>`:""}</button>`).join("")}</div>`).join("");
  $("#ovtStageBar").innerHTML=`<span class="ovt-lab">${esc(T3("Your screen","Tu pantalla","Sua tela"))}</span><span class="ovt-legend"><i class="open"></i>${esc(T3("Open","Abierto","Aberto"))}<i class="closed"></i>${esc(T3("Closed","Cerrado","Fechado"))}</span><button type="button" class="btn small" data-a="reset"${ovtRemote()?"":" disabled"}>${L("resetPos",true)}</button>`;
  ovtRenderInsp()}
function ovtRenderInsp(){const w=OVT.sel,g=ui(w),own=(CFG.ui||{})[w]||{},alpha=ovAlphaOf(w),ts=g.textScale||1,hd=g.hide||"";
  $("#ovtInspHead").innerHTML=`<div class="ovt-ih" data-ovw="${w}"><h2>${esc(ovtName(w))}</h2>${ovtExpPill(w)}<span class="ovt-state">${ovtDot(w)}<span class="on-t">${esc(T3("Open","Abierto","Aberto"))}</span><span class="off-t">${esc(T3("Closed","Cerrado","Fechado"))}</span></span></div>`;
  ovtPreview(w);
  const seg=(a,list,cur)=>`<div class="seg3 ovt-seg3">${list.map(([v,...n])=>`<button type="button" data-a="${a}" data-k="${v}" aria-pressed="${String(cur)===String(v)}">${esc(T3(...n))}</button>`).join("")}</div>`;
  $("#ovtInsp").innerHTML=`<div class="ovt-row2" data-ovw="${w}">${ovtOpenBtn(w)}${ovtCfgBtn(w).replace('class="btn small ovt-cfg"','class="btn small ovt-cfg wide"').replace(ovtIcon.cfg,ovtIcon.cfg+`<span>${esc(T3("All settings","Todos los ajustes","Todos os ajustes"))}</span>`)}</div>
    <div class="ovt-f"><span class="ovt-lab">${esc(T3("When I get in the car","Al entrar al coche","Ao entrar no carro"))}</span>${ovtAutoPills(w)}</div>
    <label class="ovt-f"><span class="ovt-lab">${esc(T3("Design","Diseño","Design"))}</span><select data-c="ovstyle" data-w="${w}"><option value="">${esc(T3("Same as all","Igual que todos","Igual a todos"))} · ${esc(ovStyleLabel(ovtStyleAll()))}</option>${OV_STYLES.map(([k])=>`<option value="${k}"${own.style===k?" selected":""}>${esc(ovStyleLabel(k))}${k==="classic"?"":" · Beta"}</option>`).join("")}</select></label>
    <label class="ovt-f"><span class="ovt-lab">${esc(T3("Opacity","Opacidad","Opacidade"))} <b id="ovtAlphaV">${Math.round(alpha/255*100)}%</b></span><input type="range" min="60" max="255" step="5" value="${alpha}" data-c="alpha" data-w="${w}"></label>
    <div class="ovt-f"><span class="ovt-lab">${esc(T3("Text size","Tamaño del texto","Tamanho do texto"))}</span>${seg("ts",[[.85,"Small","Pequeño","Pequeno"],[1,"Normal","Normal","Normal"],[1.2,"Large","Grande","Grande"]],ts)}</div>
    <div class="ovt-f"><span class="ovt-lab">${esc(T3("Hide by itself","Ocultarse solo","Ocultar sozinho"))}</span>${seg("hide",[["","Never","Nunca","Nunca"],["car","Out of the car","Fuera del coche","Fora do carro"],["pits","And in the pits","Y en boxes","E nos boxes"]],hd)}</div>
    ${OV_TITLED.includes(w)?`<div class="ovt-f"><button type="button" class="ovt-chip${g.title!==false?" on":""}" data-a="title" aria-pressed="${g.title!==false}">${esc(T3("Show the title","Mostrar el título","Mostrar o título"))}</button></div>`:""}`}
/* the chosen overlay's live preview: the overlay page itself on the PC (scaled to the column), its picture elsewhere */
function ovtPreview(w){const box=$("#ovtPrev");if(!box)return;const live=MODE==="bridge"&&!REMOTE,sz=OVSZ[w]||[460,260];
  if(OVT.prevW!==w||!box.firstChild){OVT.prevW=w;box.innerHTML=live?`<div class="ovt-pf"><iframe title="${esc(ovtName(w))}" src="/?overlay=${w}&preview=1" style="width:${sz[0]}px;height:${sz[1]}px" tabindex="-1"></iframe></div>`:ovtThumb(w)}
  const f=box.querySelector("iframe");if(f){const k=Math.min(1,(box.clientWidth||280)/sz[0]);f.style.transform=`scale(${k})`;f.parentElement.style.height=Math.round(sz[1]*k)+"px"}
  box.style.opacity=String(ovAlphaOf(w)/255)}

/* Gallery and List */
function ovtRenderBody(){const place=$("#ovtPlace");
  place.innerHTML=CFG.edit?`<div class="panel ovt-place"><div class="ovt-stagebar"><span class="ovt-lab">${esc(T3("Your screen","Tu pantalla","Sua tela"))}</span><span class="ovt-legend"><i class="open"></i>${esc(T3("Open","Abierto","Aberto"))}<i class="closed"></i>${esc(T3("Closed","Cerrado","Fechado"))}</span><button type="button" class="btn small" data-a="reset"${ovtRemote()?"":" disabled"}>${L("resetPos",true)}</button></div><div class="screen ovt-screen" id="ovScreen"></div></div>`:"";
  const groups=ovtGroups(),fl=$("#ovtFilters");
  if(fl){const n=f=>WIDGETS.filter(w=>f==="all"||f==="open"&&OV_OPEN.has(w)||f==="auto"&&ovtAutoAny(w)||ovtGroupOf(w)===f).length;
    const fs=[["all",T3("All","Todos","Todos")],...groups.map(([g])=>[g,T3(...OVT_GROUP_NAMES[g])]),...(ovtRemote()?[["open",T3("Open","Abiertos","Abertos")]]:[]),["auto","Auto"]];
    if(!fs.some(x=>x[0]===OVT.filter))OVT.filter="all";
    fl.innerHTML=fs.map(([k,t])=>`<button type="button" data-a="filter" data-k="${k}" aria-pressed="${OVT.filter===k}">${esc(t)} <small>${n(k)}</small></button>`).join("")}
  const keep=w=>ovtMatch(w)&&(OVT.layout!=="gallery"||OVT.filter==="all"||OVT.filter==="open"&&OV_OPEN.has(w)||OVT.filter==="auto"&&ovtAutoAny(w)||ovtGroupOf(w)===OVT.filter);
  const html=groups.map(([g,all])=>{const ws=all.filter(keep);if(!ws.length)return"";const name=esc(T3(...OVT_GROUP_NAMES[g]));
    if(OVT.layout==="gallery")return `<section class="ovt-gs"><h2 class="ovt-gt">${name}</h2><div class="ovt-cards">${ws.map(w=>`<article class="ovt-card" data-ovw="${w}">
        <button type="button" class="ovt-pic" data-a="cfg" data-w="${w}" aria-label="${esc(L("configure",true)+" · "+ovtName(w))}">${ovtThumb(w)}<span class="ovt-badge">${esc(T3("Open","Abierto","Aberto"))}</span></button>
        <div class="ovt-cn"><b>${esc(ovtName(w))}</b>${ovtExpPill(w)}</div>
        <div class="ovt-ca">${ovtSwitch(w)}<span class="ovt-cb">${ovtOpenBtn(w)}${ovtCfgBtn(w)}</span></div>
        <div class="ovt-cg">${ovtAutoPills(w)}</div></article>`).join("")}</div></section>`;
    const fold=OVT.fold.has(g)&&!OVT.q,nOpen=ws.filter(w=>OV_OPEN.has(w)).length,nAuto=ws.filter(ovtAutoAny).length;
    return `<section class="ovt-ls${fold?" fold":""}"><button type="button" class="ovt-lh" data-a="fold" data-k="${g}" aria-expanded="${!fold}">${ovtIcon.chev}<span class="ovt-gt">${name}</span><small>${ws.length}</small><span class="ovt-sum">${ovtRemote()?esc(T3(`${nOpen} open`,`${nOpen} abiertos`,`${nOpen} abertos`))+" · ":""}${esc(T3(`${nAuto} on Auto`,`${nAuto} en Auto`,`${nAuto} no Auto`))}</span></button>
      ${fold?"":`<div class="ovt-lr ovt-lhd"><span>${esc(T3("Overlay","Overlay","Overlay"))}</span><span>${esc(T3("When I get in the car","Al entrar al coche","Ao entrar no carro"))}</span><span></span></div>${ws.map(w=>`<div class="ovt-lr" data-ovw="${w}"><span class="ovt-ln">${ovtDot(w)}<b>${esc(ovtName(w))}</b>${ovtExpPill(w)}</span>${ovtAutoPills(w)}<span class="ovt-cb">${ovtOpenBtn(w)}${ovtCfgBtn(w)}</span></div>`).join("")}`}</section>`}).join("");
  $("#ovtBody").innerHTML=html||`<p class="empty">${esc(T3("No overlay matches.","Ningún overlay coincide.","Nenhum overlay corresponde."))}</p>`}

/* ---------- what the controls do ---------- */
const ovtProNeed=w=>{if(!proGated()||OV_BASIC.includes(w))return false;proDialog(T3("The experimental overlays need Pro.","Los overlays experimentales necesitan Pro.","Os overlays experimentais precisam do Pro."));return true};
const ovtBackToLive=w=>{if(HIDDEN.has(w)){HIDDEN.delete(w);store.set("pw.hiddenW",[...HIDDEN]);applyLayout()}}; // a closed overlay comes back to Telemetry
async function ovtToggleOpen(w){if(!OV_OPEN.has(w)){if(ovtProNeed(w))return;await popOut(w);OV_OPEN.add(w);markOvOpen();setTimeout(refreshScreenRects,600);return}
  OV_OPEN.delete(w);ovtBackToLive(w);markOvOpen();fetch(`/api/overlay/close?w=${w}`,{method:"POST"}).catch(()=>{}).finally(()=>setTimeout(refreshScreenRects,400))}
function ovtSelect(w){if(!WIDGETS.includes(w))return;OVT.sel=w;store.set("pw.ovSel",w);if(OVT.layout==="screen"){ovtRenderScreen();markOvOpen();renderScreenEditor()}}
async function ovtClick(e){const b=e.target.closest("[data-a]");if(!b||b.disabled||!e.currentTarget.contains(b))return;const a=b.dataset.a,w=b.dataset.w,k=b.dataset.k;
  if(a==="layout"){if(OVT.layout===k)return;OVT.layout=k;store.set("pw.ovLayout",k);renderOverlaysTab();return}
  if(a==="sel")return ovtSelect(w);
  if(a==="auto"){const g=b.dataset.g;if(!gameHas(g,"widgets",w))return;const on=autoIn(w,g);if(!on&&!(CFG.autoWidgets||[]).includes(w)&&ovtProNeed(w))return;setAutoIn(w,g,!on);saveCfg();renderOverlaysTab();return}
  if(a==="autoall"){const gs=ovtAutoGames(w),all=ovtAutoAll(w);if(!all&&!(CFG.autoWidgets||[]).includes(w)&&ovtProNeed(w))return;gs.forEach(g=>{if(autoIn(w,g)===all)setAutoIn(w,g,!all)});saveCfg();renderOverlaysTab();return}
  if(a==="open")return ovtToggleOpen(w);
  if(a==="here"){window.open(`/?overlay=${w}`,"_blank");return}
  if(a==="cfg"){CFG_BACK=()=>{closeDrawer();renderOverlaysTab()};openWidgetCfg(w,true);return}
  if(a==="filter"){OVT.filter=k;ovtRenderBody();markOvOpen();markGameGaps();return}
  if(a==="fold"){OVT.fold.has(k)?OVT.fold.delete(k):OVT.fold.add(k);store.set("pw.ovFold",[...OVT.fold]);ovtRenderBody();markOvOpen();markGameGaps();return}
  if(a==="style"){CFG.ui=CFG.ui||{};if(k===OV_DEFAULT_STYLE)delete CFG.ui.ovstyle;else CFG.ui.ovstyle=k;saveCfg();renderOverlaysTab();return}
  if(a==="preset")return ovtApplyPreset(OVT_PRESETS[k]||[]);
  if(a==="mypreset"){const l=ovtMyPresets()[k];if(l)ovtApplyPreset(l);return}
  if(a==="delpreset"){if(!await uiConfirm(T3(`Delete the preset “${k}”?`,`¿Eliminar el perfil «${k}»?`,`Excluir o perfil “${k}”?`)))return;const l=ovtMyPresets();delete l[k];ovtSavePresets(l);renderOverlaysTab();toast(T3("Preset deleted.","Perfil eliminado.","Perfil excluído."));return}
  if(a==="savepreset"){const ws=(CFG.autoWidgets||[]).slice();if(!ws.length){toast(T3("Turn on Auto for the overlays you want first.","Activa primero Auto en los overlays que quieras.","Ative primeiro o Auto nos overlays que quiser."));return}
    let n=await uiPrompt(T3("Preset name","Nombre del perfil","Nome do perfil"),T3("My preset","Mi perfil","Meu perfil"));n=String(n||"").trim().slice(0,32);if(!n)return;
    const l=ovtMyPresets();if(l[n]&&!await uiConfirm(T3(`Replace the preset “${n}”?`,`¿Reemplazar el perfil «${n}»?`,`Substituir o perfil “${n}”?`)))return;l[n]=ws;ovtSavePresets(l);renderOverlaysTab();toast(T3("Preset saved.","Perfil guardado.","Perfil salvo."));return}
  if(a==="edit"){CFG.edit=!CFG.edit;saveCfg();renderOverlaysTab();return}
  if(a==="reset"){fetch("/api/overlay/reset",{method:"POST"}).then(()=>toast(T3("Positions reset. Reopen overlays to apply.","Posiciones restablecidas. Vuelve a abrir los overlays.","Posições redefinidas. Abra os overlays de novo para aplicar.")));return}
  if(a==="opennow"){const lg=liveNow(),ws=(CFG.autoWidgets||[]).filter(x=>!lg||autoIn(x,lg));if(!ws.length){toast(T3("Mark some overlays with Auto first.","Marca primero algunos overlays con Auto.","Marque primeiro alguns overlays com Auto."));return}
    for(const x of ws){if(proGated()&&!OV_BASIC.includes(x))continue;if(await openOverlayOnPC(x))OV_OPEN.add(x)}markOvOpen();setTimeout(refreshScreenRects,600);toast(T3("Opened on your PC.","Abiertos en tu PC.","Abertos no seu PC."));return}
  if(a==="closeall"){[...OV_OPEN].forEach(ovtBackToLive);OV_OPEN.clear();markOvOpen();fetch("/api/overlay/close?w=*",{method:"POST"}).catch(()=>{}).finally(()=>setTimeout(refreshScreenRects,400));return}
  if(a==="ttl"){const on=k==="1";CFG.ui=CFG.ui||{};OV_TITLED.forEach(x=>{const m=Object.assign({},CFG.ui[x]||{});if(on)delete m.title;else m.title=false;CFG.ui[x]=m});saveCfg();renderOverlaysTab();return}
  if(a==="ts"){setUI(OVT.sel,{textScale:+k});return}
  if(a==="hide"){setUI(OVT.sel,{hide:k});return}
  if(a==="title"){setUI(OVT.sel,{title:ui(OVT.sel).title===false});return}}
// the footer's switches keep their ids (chk): Open my overlays when I get in the car, Close them when the game closes, click-through
document.addEventListener("click",e=>{const b=e.target.closest("#ovTab #oAuto,#ovTab #oClose,#ovTab #oLock");if(!b)return;const k={oAuto:"autoStart",oClose:"closeOnExit",oLock:"lock"}[b.id];CFG[k]=!CFG[k];saveCfg();renderOverlaysTab()});
function ovtChange(e){const t=e.target,c=t.dataset&&t.dataset.c;if(!c)return;
  if(c==="style"){CFG.ui=CFG.ui||{};if(t.value===OV_DEFAULT_STYLE)delete CFG.ui.ovstyle;else CFG.ui.ovstyle=t.value;saveCfg();renderOverlaysTab()}
  else if(c==="ovstyle"){const w=t.dataset.w;CFG.ui=CFG.ui||{};const m=Object.assign({},CFG.ui[w]||{});if(t.value)m.style=t.value;else delete m.style;CFG.ui[w]=m;saveCfg()}
  else if(c==="alpha")setUI(t.dataset.w,{alpha:Math.max(60,Math.min(255,+t.value||255))});
  else if(c==="engine"){CFG.engine=t.value;saveCfg()}
  else if(c==="fps"){CFG.ui=CFG.ui||{};const n=+t.value;if(n>=30)delete CFG.ui.ovfps;else CFG.ui.ovfps=n;saveCfg()}}
function ovtInput(e){const t=e.target,c=t.dataset&&t.dataset.c;
  if(c==="q"){OVT.q=t.value.trim();ovtRenderBody();markOvOpen();markGameGaps()}
  else if(c==="alpha"){const p=$("#ovtPrev"),v=$("#ovtAlphaV");if(p)p.style.opacity=String(+t.value/255);if(v)v.textContent=Math.round(+t.value/255*100)+"%"}}
addEventListener("resize",()=>{if(typeof CUR_VIEW!=="undefined"&&CUR_VIEW==="overlays"&&OVT.layout==="screen")ovtPreview(OVT.sel)});

/* which overlays are open on the PC right now: the dots, the badges, the Open/Close buttons and the counts */
function markOvOpen(){const key=[...OV_OPEN].sort().join();
  document.querySelectorAll("#ovTab [data-ovw]").forEach(el=>el.classList.toggle("is-open",OV_OPEN.has(el.dataset.ovw)));
  document.querySelectorAll('#ovTab [data-a="open"]').forEach(b=>{const on=OV_OPEN.has(b.dataset.w);b.classList.toggle("on",on);b.textContent=on?T3("Close","Cerrar","Fechar"):T3("Open","Abrir","Abrir")});
  ovtCounts();if(OVT.openKey!==key){OVT.openKey=key;const fl=$("#ovtFilters");if(fl&&OVT.layout==="gallery"&&OVT.filter==="open")ovtRenderBody()}}

/* ---------- the screen: every open or Auto overlay where it sits on the PC (and the chosen one), dragged and resized
   from the app; the windows move as you drag (/api/overlay/move) ---------- */
async function renderScreenEditor(){const box=$("#ovScreen");if(!box||SCREEN_DRAG)return;const sc=await screenInfo(),[vx,vy,vw,vh]=sc.virtual;if(!box.isConnected)return;box.style.aspectRatio=vw+" / "+vh;
  const pos=CFG.positions||{},sel=OVT.layout==="screen"?OVT.sel:"",names=[...new Set([...(CFG.autoWidgets||[]),...OV_OPEN,...(sel?[sel]:[])])].filter(n=>OVSZ[n]&&WIDGETS.includes(n));
  const inside=([x,y,w,h])=>{w=Math.min(w,vw);h=Math.min(h,vh);return[Math.max(vx,Math.min(vx+vw-w,x)),Math.max(vy,Math.min(vy+vh-h,y)),w,h]};
  const rect=(n,i)=>inside(pos[n]||[vx+60+i*40,vy+60+i*40,OVSZ[n][0],OVSZ[n][1]]);
  box.innerHTML=`<div class="mon" style="left:${(sc.primary[0]-vx)/vw*100}%;top:${(sc.primary[1]-vy)/vh*100}%;width:${sc.primary[2]/vw*100}%;height:${sc.primary[3]/vh*100}%"></div>`+
    (names.map((n,i)=>{const[x,y,w,h]=rect(n,i);return `<div class="ovrect${(CFG.autoWidgets||[]).includes(n)?" auto":""}${OV_OPEN.has(n)?"":" closed"}${n===sel?" sel":""}" data-n="${n}" style="left:${(x-vx)/vw*100}%;top:${(y-vy)/vh*100}%;width:${w/vw*100}%;height:${h/vh*100}%"><span>${esc(ovtName(n))}</span><i class="rz"></i></div>`}).join("")||
    `<p class="empty" style="position:absolute;inset:0;display:grid;place-items:center;margin:0">${Lp("Open an overlay or mark it with Auto to place it here.","Abre un overlay o márcalo con Auto para colocarlo aquí.",false,null,"Abra um overlay ou marque-o com Auto para posicioná-lo aqui.")}</p>`);
  box.querySelectorAll(".ovrect").forEach(el=>{el.onpointerdown=e=>{e.preventDefault();SCREEN_DRAG=true;el.setPointerCapture(e.pointerId);const n=el.dataset.n,resize=!!e.target.closest(".rz"),k=vw/box.clientWidth;
    let[x,y,w,h]=rect(n,names.indexOf(n));const sx=e.clientX,sy=e.clientY,x0=x,y0=y,w0=w,h0=h;let t=0,moved=false;
    const send=()=>{CFG.positions=Object.assign({},CFG.positions,{[n]:[x,y,w,h]});if(pcOverlays())fetch(`/api/overlay/move?w=${n}&x=${x}&y=${y}&width=${w}&height=${h}`,{method:"POST"}).catch(()=>{});else if(MODE==="local")store.set("pw.cfg",CFG)};
    el.onpointermove=ev=>{const dx=(ev.clientX-sx)*k,dy=(ev.clientY-sy)*k,snap=v=>Math.round(v/5)*5;if(!moved&&Math.abs(ev.clientX-sx)+Math.abs(ev.clientY-sy)<4)return;moved=true;
      if(resize){const mw=OV_MINW[n]||200,mh=OV_MINH[n]||40;w=Math.max(mw,Math.min(vx+vw-x,snap(w0+dx)));h=Math.max(mh,Math.min(vy+vh-y,snap(h0+dy)))}else{x=Math.max(vx,Math.min(vx+vw-w,snap(x0+dx)));y=Math.max(vy,Math.min(vy+vh-h,snap(y0+dy)))}
      el.style.left=(x-vx)/vw*100+"%";el.style.top=(y-vy)/vh*100+"%";el.style.width=w/vw*100+"%";el.style.height=h/vh*100+"%";const now=performance.now();if(now-t>120){t=now;send()}};
    el.onpointerup=()=>{el.onpointermove=null;el.onpointerup=null;SCREEN_DRAG=false;if(moved)send();else if(OVT.layout==="screen"&&n!==OVT.sel)ovtSelect(n)}}})}
// keep the screen in step with the overlay windows (they can be dragged on the screen itself)
async function refreshScreenRects(){if(SCREEN_DRAG||CUR_VIEW!=="overlays"||!pcOverlays())return;try{const j=await (await fetch("/api/overlay/list")).json();const r=j.rects||{};
  let ch=false;Object.keys(r).forEach(n=>{const v=r[n];if(!v||!OVSZ[n])return;const o=(CFG.positions||{})[n];if(!o||o.join()!==v.join()){CFG.positions=Object.assign({},CFG.positions,{[n]:v});ch=true}});
  const open=(j.open||[]).join();OV_OPEN=new Set(j.open||[]);markOvOpen();if(ch||open!==refreshScreenRects.open){refreshScreenRects.open=open;renderScreenEditor()}}catch(e){}}
setInterval(refreshScreenRects,1500);

/* ---------- the tab's look ---------- */
(function ovtCss(){if(document.getElementById("ovtCss"))return;const s=document.createElement("style");s.id="ovtCss";s.textContent=`
#v-overlays .vhead .sub{font:600 12px var(--f-data);letter-spacing:.04em}
.ovt{display:flex;flex-direction:column;gap:14px;min-width:0}
.ovt-ic{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}
.ovt-lab{font:600 10px/1.3 var(--f-data);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.ovt-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
.ovt-acts{display:flex;flex-wrap:wrap;gap:8px}
.ovt-seg{display:inline-flex;flex-wrap:wrap;gap:3px;padding:3px;border:1px solid var(--line);border-radius:10px;background:var(--surface)}
.ovt-seg button{display:inline-flex;align-items:center;gap:7px;min-height:34px;padding:0 12px;border:0;border-radius:7px;background:none;color:var(--muted);font:500 13px var(--f-body);cursor:pointer}
.ovt-seg button:hover{color:var(--fg)}.ovt-seg button[aria-pressed=true]{background:var(--surface2);color:var(--fg);box-shadow:inset 0 0 0 1px var(--line2,var(--line))}
.ovt-seg.sm button{min-height:30px;padding:0 10px;font-size:12px}.ovt-seg small{font:500 11px var(--f-data);color:var(--muted)}
.ovt-tools{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:stretch}
.ovt-l-gallery .ovt-tools{grid-template-columns:minmax(0,1fr) minmax(0,1.35fr)}
.ovt-presets,.ovt-design-box{display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius,12px);padding:12px 14px;min-width:0}
.ovt-presets>.ovt-lab,.ovt-design-box>.ovt-lab{margin-right:4px}
.ovt-chip{display:inline-flex;align-items:center;min-height:32px;padding:0 13px;border-radius:999px;border:1px solid var(--line);background:var(--surface2);color:var(--fg);font:600 12px/1 var(--f-body);letter-spacing:.05em;text-transform:uppercase;cursor:pointer}
.ovt-chip:hover{border-color:var(--line2,var(--muted))}.ovt-chip.on{border-color:var(--accent);color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,var(--surface2))}
.ovt-chip.add{border-style:dashed;background:none;color:var(--muted);text-transform:none;letter-spacing:0;font-weight:500}
.ovt-chip.mine{padding:0;gap:0}.ovt-chip.mine button{background:none;border:0;color:inherit;font:inherit;letter-spacing:inherit;text-transform:none;min-height:30px;padding:0 6px 0 13px;cursor:pointer}.ovt-chip.mine .x{padding:0 10px 0 4px;color:var(--muted)}
.ovt-designsel{display:flex;align-items:center;gap:10px}.ovt-designsel select{min-height:34px}
.ovt-designs{display:grid;grid-template-columns:repeat(auto-fill,minmax(86px,1fr));gap:8px;flex:1 1 100%;min-width:0}
.ovt-design{display:flex;flex-direction:column;gap:6px;padding:6px;border-radius:10px;border:2px solid var(--line);background:var(--surface2);color:var(--fg);cursor:pointer;text-align:left;min-width:0}
.ovt-design.on{border-color:var(--accent)}.ovt-design .sw{height:38px;border-radius:6px;padding:7px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;gap:5px}
.ovt-design .sw.clear{border:1px dashed var(--muted)}.ovt-design .sw i{display:block;height:5px;border-radius:3px;width:70%}.ovt-design .sw i+i{width:100%;opacity:.7}
.ovt-design .nm{font:500 12px var(--f-body);display:flex;gap:4px;align-items:center;white-space:nowrap;overflow:hidden}.ovt-design em{font:600 9px var(--f-data);font-style:normal;color:var(--accent);text-transform:uppercase}
.ovt-filters{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
.ovt-search{display:flex;align-items:center;gap:8px;min-height:36px;padding:0 12px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--muted);flex:0 1 260px;min-width:0}
.ovt-search input{flex:1;min-width:0;border:0;background:none;color:var(--fg);font:400 13px var(--f-body);outline:none;padding:0}
.ovt-search:focus-within{border-color:var(--accent)}
.ovt-exp{flex:none;font:600 9px/1 var(--f-data);letter-spacing:.06em;text-transform:uppercase;color:#b794f6;border:1px solid color-mix(in srgb,#b794f6 45%,transparent);border-radius:4px;padding:3px 5px}
.ovt-dot{flex:none;width:8px;height:8px;border-radius:50%;box-sizing:border-box;border:1.5px solid var(--line2,var(--muted))}
.is-open .ovt-dot,.is-open>.ovt-dot{background:var(--good);border-color:var(--good)}
.ovt-games{display:inline-flex;flex-wrap:wrap;gap:6px}
.ovt-gp{min-height:28px;padding:0 10px;border-radius:999px;border:1px solid var(--line);background:none;color:var(--muted);font:600 11px var(--f-data);cursor:pointer}
.ovt-gp:hover{color:var(--fg)}.ovt-gp.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent)}
.ovt-gp[disabled]{border-style:dashed;opacity:.4;cursor:default;color:var(--muted)}
.ovt-cb{display:inline-flex;gap:6px;justify-content:flex-end}
.ovt-open{min-width:74px}.ovt-open.on{color:var(--good);border-color:color-mix(in srgb,var(--good) 45%,var(--line))}
.ovt-cfg{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-width:36px;padding:0 9px}
.ovt-sw{display:inline-flex;align-items:center;gap:8px;background:none;border:0;padding:0;color:var(--muted);font:600 12px var(--f-body);cursor:pointer;min-height:32px}
.ovt-sw i{position:relative;width:36px;height:20px;border-radius:10px;background:var(--line2,var(--line));flex:none}
.ovt-sw i::after{content:"";position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:var(--fg);transition:left .12s}
.ovt-sw.on i{background:var(--accent)}.ovt-sw.on i::after{left:19px;background:var(--accent-ink,#10141c)}
.ovt-sw.half i{background:color-mix(in srgb,var(--accent) 45%,var(--line))}.ovt-sw.half i::after{left:11px}
.ovt-sw.on,.ovt-sw.half{color:var(--fg)}.ovt-sw[disabled]{opacity:.4;cursor:default}
.ovt-gt{margin:0;font:700 17px/1.1 var(--f-display);letter-spacing:.08em;text-transform:uppercase}
/* gallery */
.ovt-body,#ovtBody{display:flex;flex-direction:column;gap:18px}
.ovt-gs{display:flex;flex-direction:column;gap:10px}
.ovt-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,214px),1fr));gap:12px}
.ovt-card{display:flex;flex-direction:column;gap:10px;padding:10px;border-radius:var(--radius,12px);border:1px solid var(--line);background:var(--surface);min-width:0}
.ovt-card.is-open{border-color:color-mix(in srgb,var(--good) 45%,var(--line))}.ovt-card.nodata{opacity:.7}
.ovt-pic{position:relative;display:block;padding:0;border:0;background:none;cursor:pointer;border-radius:8px}
.ovt-badge{position:absolute;top:8px;left:8px;display:none;align-items:center;gap:5px;padding:3px 8px;border-radius:10px;background:color-mix(in srgb,var(--good) 18%,#07090d);color:var(--good);font:600 10px var(--f-data);letter-spacing:.06em;text-transform:uppercase}
.ovt-badge::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--good)}.is-open .ovt-badge{display:inline-flex}
.ovt-cn{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0}.ovt-cn b{font:600 15px var(--f-body);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ovt-ca{display:flex;align-items:center;justify-content:space-between;gap:8px}
.ovt-cg .ovt-gp{min-height:24px;padding:0 8px;font-size:10px}
/* the pictures */
.ovt-th{height:104px;border-radius:8px;background:#07090d;border:1px solid #1c222d;display:flex;align-items:center;justify-content:center;overflow:hidden;color:#e6e9ef;font:600 12px var(--f-data)}
.ovt-th-rows{width:78%;display:flex;flex-direction:column;gap:5px}.ovt-th-rows i{display:block;height:8px;border-radius:2px;background:#1e2530}.ovt-th-rows i.me{background:#6b5420}.ovt-th-rows i.bad{background:#5a2328}
.ovt-th-radar{position:relative;width:90px;height:86px}.ovt-th-radar i{position:absolute;border-radius:4px}
.ovt-th-radar .me{left:36px;top:26px;width:18px;height:34px;border:2px solid #e6e9ef;box-sizing:border-box}.ovt-th-radar .side{left:60px;top:30px;width:16px;height:32px;background:#f2c94c}
.ovt-th-radar .bar{left:82px;top:18px;width:4px;height:52px;background:#e5484d;border-radius:2px}.ovt-th-radar .back{left:37px;top:70px;width:16px;height:12px;background:#3a4456}
.ovt-th-map{width:120px;height:80px}.ovt-th-map path{fill:none;stroke:#3a4456;stroke-width:5;stroke-linejoin:round}.ovt-th-map .me{fill:#f5b82e}.ovt-th-map .o1{fill:#5aa9ff}.ovt-th-map .o2{fill:#c9cfda}
.ovt-th-delta{position:relative;width:80%;height:14px;border-radius:7px;background:#1e2530}.ovt-th-delta i{position:absolute;left:50%;top:0;bottom:0;width:26%;border-radius:7px;background:#3ddc84}
.ovt-th-delta b{position:absolute;left:50%;top:-9px;transform:translateX(-50%);padding:3px 8px;border-radius:10px;background:#10141c;border:1px solid #3ddc84;color:#3ddc84;font:600 11px var(--f-data)}
.ovt-th-tbar{position:relative;width:84%;height:4px;border-radius:2px;background:#3a4456}.ovt-th-tbar i{position:absolute;top:-5px;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:#c9cfda}.ovt-th-tbar i.me{background:#f5b82e}
.ovt-th-flag{width:70%;height:46px;border-radius:6px;background:#f2c94c;color:#10141c;display:flex;align-items:center;justify-content:center;font:700 18px var(--f-display);letter-spacing:.1em}
.ovt-th-gear{display:flex;flex-direction:column;align-items:center;gap:6px}.ovt-th-gear b{font:600 40px/1 var(--f-data)}.ovt-th-gear small{font:500 11px var(--f-data);color:#8a93a3}
.ovt-th-gear .leds{display:flex;gap:3px}.ovt-th-gear .leds i{width:10px;height:6px;background:#1e2530}.leds .g{background:#3ddc84!important}.leds .y{background:#f2c94c!important}.leds .r{background:#e5484d!important}
.ovt-th-gear .pill{padding:4px 12px;border-radius:6px;background:#3ddc84;color:#07090d;font:700 14px var(--f-display);letter-spacing:.1em}
.ovt-th-meter{display:block;width:110px;height:8px;border-radius:4px;background:#1e2530;overflow:hidden}.ovt-th-meter i{display:block;height:100%;background:#5aa9ff}
.ovt-th-gg{position:relative;width:76px;height:76px;border-radius:50%;border:2px solid #3a4456;box-sizing:border-box}.ovt-th-gg::before{content:"";position:absolute;inset:18px;border-radius:50%;border:1px solid #2a3240}
.ovt-th-gg .dot{position:absolute;left:46px;top:20px;width:10px;height:10px;border-radius:50%;background:#f5b82e}
.ovt-th-chart{width:150px;height:70px}.ovt-th-chart path{fill:none;stroke-width:2.5}.ovt-th-chart .a{stroke:#f5b82e}.ovt-th-chart .b{stroke:#5aa9ff;opacity:.85}.ovt-th-chart .thr{stroke:#3ddc84}.ovt-th-chart .brk{stroke:#e5484d}
.ovt-th-tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;width:80%}.ovt-th-tiles b{height:32px;border-radius:5px;background:#1e2530;display:flex;align-items:center;justify-content:center;font:600 12px var(--f-data);white-space:nowrap;overflow:hidden}
.ovt-th-tiles .good{color:#3ddc84}.ovt-th-tiles .pb{color:#c48cff}.ovt-th-tiles .warn{color:#f2c94c}
.ovt-th-brk{display:flex;align-items:flex-end;gap:10px}.ovt-th-brk i{width:16px;height:46px;border-radius:3px;background:#1e2530}.ovt-th-brk i.on{background:#e5484d}.ovt-th-brk b{font:600 20px var(--f-data)}
.ovt-th-sec{display:grid;grid-template-columns:repeat(12,1fr);gap:3px;width:84%}.ovt-th-sec i{height:22px;border-radius:3px}.ovt-th-sec .p{background:#a463f2}.ovt-th-sec .g{background:#2fb36b}.ovt-th-sec .y{background:#d9a62b}
.ovt-th-coach{display:flex;flex-direction:column;align-items:center;gap:8px}.ovt-th-coach b{font:700 26px/1 var(--f-display);letter-spacing:.06em}.ovt-th-coach small{font:500 11px var(--f-data);color:#8a93a3}
/* list */
.ovt-ls{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius,12px);overflow:hidden}
.ovt-lh{width:100%;display:flex;align-items:center;gap:10px;padding:12px 16px;border:0;background:color-mix(in srgb,var(--surface2) 60%,var(--surface));color:var(--fg);text-align:left;cursor:pointer}
.ovt-lh small{font:500 12px var(--f-data);color:var(--muted)}.ovt-lh .ovt-sum{margin-left:auto;font:500 12px var(--f-data);color:var(--muted)}
.ovt-ls.fold .ovt-lh .ovt-ic{transform:rotate(-90deg)}
.ovt-lr{display:grid;grid-template-columns:minmax(0,1fr) 200px 140px;gap:12px;align-items:center;min-height:48px;padding:4px 16px;border-top:1px solid var(--row,var(--line))}
.ovt-lr.nodata .ovt-ln b{opacity:.6}
.ovt-lhd{min-height:0;padding:8px 16px 6px;font:600 10px var(--f-data);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.ovt-ln{display:flex;align-items:center;gap:10px;min-width:0}.ovt-ln b{font:500 14px var(--f-body);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* screen */
.ovt-b{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start}
.ovt-nav{flex:0 1 240px;min-width:210px;display:flex;flex-direction:column;gap:2px;padding:8px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius,12px);max-height:calc(100vh - 230px);overflow:auto;scrollbar-width:thin}
.ovt-ng{display:flex;flex-direction:column;gap:1px}.ovt-gh{padding:10px 10px 4px;font:700 13px var(--f-display);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.ovt-ni{display:flex;align-items:center;gap:10px;min-height:34px;padding:0 10px;border:0;border-radius:7px;background:none;color:var(--muted);font:500 13px var(--f-body);cursor:pointer;text-align:left}
.ovt-ni .nm{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ovt-ni:hover,.ovt-ni.is-open{color:var(--fg)}
.ovt-ni.sel{background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent)}
.ovt-auto{font:600 9px var(--f-data);letter-spacing:.06em;text-transform:uppercase;color:var(--accent)}.ovt-x{font:600 11px var(--f-data);color:#b794f6}
.ovt-stage{flex:999 1 480px;min-width:0;display:flex;flex-direction:column;gap:10px}
.ovt-stagebar{display:flex;flex-wrap:wrap;align-items:center;gap:12px}.ovt-stagebar .btn{margin-left:auto}
.ovt-legend{display:inline-flex;align-items:center;gap:6px;font:500 11px var(--f-data);color:var(--muted)}.ovt-legend i{width:12px;height:8px;border-radius:2px;margin-left:6px}
.ovt-legend .open{border:1.5px solid var(--fg)}.ovt-legend .closed{border:1.5px dashed var(--muted);opacity:.8}
.ovt-screen{max-width:none;margin:0;border-radius:var(--radius,12px);background:linear-gradient(180deg,color-mix(in srgb,var(--surface2) 70%,#1a2230) 0 48%,color-mix(in srgb,var(--surface2) 80%,#2b323c) 48% 100%)}
.ovt-screen .ovrect.sel{border:2px solid var(--accent);background:color-mix(in srgb,var(--accent) 20%,var(--surface));z-index:2}.ovt-screen .ovrect.sel span{color:var(--accent)}
.ovt-insp{flex:0 1 300px;min-width:260px;display:flex;flex-direction:column;gap:14px;padding:14px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius,12px)}
.ovt-ih{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.ovt-ih h2{margin:0;font:700 22px/1 var(--f-display);letter-spacing:.06em;text-transform:uppercase;margin-right:auto}
.ovt-state{display:inline-flex;align-items:center;gap:6px;font:600 10px var(--f-data);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.ovt-state .on-t{display:none}.is-open .ovt-state{color:var(--good)}.is-open .ovt-state .on-t{display:inline}.is-open .ovt-state .off-t{display:none}
.ovt-prev{border-radius:8px;overflow:hidden;min-height:60px}.ovt-pf{position:relative;overflow:hidden;border-radius:8px}.ovt-pf iframe{position:absolute;left:0;top:0;border:0;transform-origin:0 0;pointer-events:none;background:transparent}
#ovtInsp{display:flex;flex-direction:column;gap:14px}.ovt-row2{display:flex;gap:8px}.ovt-row2 .btn{flex:1;min-height:36px}.ovt-cfg.wide{flex:2}
.ovt-f{display:flex;flex-direction:column;gap:7px;min-width:0}.ovt-f select{min-height:34px}.ovt-f input[type=range]{accent-color:var(--accent);width:100%}
.ovt-f .ovt-lab b{color:var(--fg);font-weight:600;float:right}
.ovt-seg3{display:flex}.ovt-seg3 button{flex:1;white-space:nowrap}
/* footer */
.ovt-foot{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding-top:12px;border-top:1px solid var(--line)}
.ovt-more{margin-left:auto}.ovt-more summary{cursor:pointer;font:500 13px var(--f-body);color:var(--muted);list-style:none;padding:6px 12px;border:1px solid var(--line);border-radius:8px}
.ovt-more[open]{flex:1 1 100%;margin-left:0}.ovt-more[open] summary{display:inline-block}
.ovt-morebody{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;margin-top:12px}.ovt-morebody .ovt-f{flex:0 1 auto}
.ovt-place{display:flex;flex-direction:column;gap:10px}
@media (max-width:760px){.ovt-tools,.ovt-l-gallery .ovt-tools{grid-template-columns:minmax(0,1fr)}.ovt-bar{align-items:stretch}.ovt-seg{width:100%;box-sizing:border-box}.ovt-seg button{flex:1;justify-content:center}
  .ovt-lr{grid-template-columns:minmax(0,1fr) auto;row-gap:6px;padding:8px 14px}.ovt-lr>.ovt-games{grid-column:1}.ovt-lr>.ovt-cb{grid-column:2;grid-row:1/3;align-self:center}.ovt-lhd{display:none}
  .ovt-lh .ovt-sum{display:none}.ovt-nav{flex:1 1 100%;max-height:260px}.ovt-insp{flex:1 1 100%;min-width:0}.ovt-search{flex:1 1 100%}.ovt-designs{grid-template-columns:repeat(3,minmax(0,1fr))}}
`;document.head.appendChild(s)})();
