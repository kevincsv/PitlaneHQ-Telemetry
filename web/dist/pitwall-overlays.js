/* The Overlays tab (docs/spec/overlays.md, "The Overlays tab"): the overlay list, the screen with the overlays placed
   on it and the chosen overlay's main settings beside it. It reads and writes the same settings as the rest of the app:
   CFG.autoWidgets with ui.autoOff per game (autoIn/setAutoIn), the open windows (OV_OPEN, /api/overlay/*), the
   positions (CFG.positions), the design for all (ui.ovstyle) and each overlay's own window settings (ui.<overlay>:
   style, alpha, textScale, hide, title). Loaded after index.html's main script, whose globals it uses. */

/* the four groups of the list; an overlay missing here goes to the last one */
const OVT_GROUPS=[["around",["relative","standings","radar","spotter","map","trackbar","flag","gaps","incidents"]],
  ["pace",["timing","deltabar","coach","brakes","sectors","compare"]],
  ["car",["dash","inputs","fuel","tyres","engine","pit","boost"]],
  ["more",["weather","gg","stats","telemetry","system"]]];
const OVT_GROUP_NAMES={around:["Around you","A tu alrededor","Ao seu redor"],pace:["Pace","Ritmo","Ritmo"],car:["Car","Coche","Carro"],more:["More","Más","Mais"]};
/* the built-in presets: the overlays they open when you get in the car */
const OVT_PRESETS={race:["radar","deltabar","relative","standings"],qualifying:["deltabar","compare","inputs","map"],endurance:["relative","fuel","tyres","deltabar","standings"],engineer:["map","relative","radar","inputs","fuel","tyres","telemetry"]};
const OVT_PRESET_NAMES={race:["Race","Carrera","Corrida"],qualifying:["Qualifying","Clasificación","Classificação"],endurance:["Endurance","Resistencia","Resistência"],engineer:["Engineer","Ingeniero","Engenheiro"]};
const OVT={sel:"",frame:"",prevW:""};
try{OVT.sel=store.get("pw.ovSel","")||""}catch(e){}

const ovtGroups=()=>{const seen=new Set(),g=OVT_GROUPS.map(([k,l])=>{const ws=l.filter(w=>WIDGETS.includes(w));ws.forEach(w=>seen.add(w));return[k,ws]});
  const rest=WIDGETS.filter(w=>!seen.has(w));if(rest.length)g[g.length-1][1].push(...rest);return g};
/* the overlay's name as plain text (the i18n table keeps it as HTML) */
const OVT_NAMES={};
const ovtName=w=>{const k=LANG+w;if(!(k in OVT_NAMES)){const d=document.createElement("textarea");d.innerHTML=L("w."+w,true);OVT_NAMES[k]=d.value}return OVT_NAMES[k]};
const ovtAutoGames=w=>VIEW_GAMES.filter(g=>gameHas(g,"widgets",w));
const ovtAutoAny=w=>VIEW_GAMES.some(g=>autoIn(w,g));
const ovtRemote=()=>pcOverlays();
const ovtExp=w=>!OV_BASIC.includes(w);
const ovtIcon={
  cfg:'<svg class="ovt-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  screen:'<svg class="ovt-ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>'};

/* ---------- presets (yours live in the overlay settings, CFG.ui.ovpresets, so they go with the account) ---------- */
function ovtMyPresets(){const u=(CFG.ui||{}).ovpresets,list=u&&u.list&&typeof u.list==="object"?{...u.list}:{};
  try{const old=JSON.parse(localStorage.getItem("pw.overlayPresets")||"null");if(old&&typeof old==="object"){let moved=false;Object.keys(old).forEach(k=>{if(!list[k]&&Array.isArray(old[k])){list[k]=old[k];moved=true}});localStorage.removeItem("pw.overlayPresets");if(moved)ovtSavePresets(list)}}catch(e){}
  return list}
function ovtSavePresets(list){CFG.ui=CFG.ui||{};CFG.ui.ovpresets={list};saveCfg()}
function ovtApplyPreset(ws){CFG.autoWidgets=ws.filter(w=>WIDGETS.includes(w));if(CFG.ui)delete CFG.ui.autoOff;CFG.autoStart=true;CFG.closeOnExit=true;saveCfg();renderOverlaysTab();toast(T3("Overlay preset applied.","Perfil de overlays aplicado.","Perfil de overlays aplicado."))}
const ovtSameSet=(a,b)=>{const x=[...new Set(a)].sort().join(),y=[...new Set(b)].sort().join();return x===y&&!!x};
const ovtPresetOn=ws=>ovtSameSet(ws.filter(w=>WIDGETS.includes(w)),CFG.autoWidgets||[])&&!Object.keys((CFG.ui||{}).autoOff||{}).length;

/* ---------- a small picture of each overlay: the chosen one's preview away from the agent ---------- */
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
    spotter:()=>`<div class="ovt-th-spot" style="display:flex;gap:6px;align-items:center;height:100%"><i style="width:8px;height:70%;border-radius:3px;background:#f2c94c"></i><b style="flex:1;text-align:center;font-size:11px">◀ CAR LEFT</b><i style="width:8px;height:70%;border-radius:3px;background:#222b37"></i></div>`,
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

/* ---------- the parts of the list and the chosen overlay ---------- */
const ovtCompat=w=>`<div class="ovt-compat"><span class="ovt-lab">${esc(T3("Compatible with","Compatible con","Compatível com"))}</span>${ovtAutoPills(w)}</div>`;
// the games it works in, as badges (gold for every game it works in; dashed where the game does not send what it needs)
function ovtAutoPills(w){return `<span class="ovt-games">${VIEW_GAMES.map(g=>{const ok=gameHas(g,"widgets",w);
  return `<span class="ovt-gp${ok?" on":" no"}"${ok?"":` title="${esc(gameLacks(g,"widgets",w))}"`}>${esc(GAME_SHORT[g])}</span>`}).join("")}</span>`}
// Auto on or off in every game it works in (the card's switch and the settings window's)
function ovtAutoToggle(w){const gs=ovtAutoGames(w);if(!gs.length)return false;const on=ovtAutoAny(w);if(!on&&!(CFG.autoWidgets||[]).includes(w)&&ovtProNeed(w))return false;
  gs.forEach(g=>{if(autoIn(w,g)===on)setAutoIn(w,g,!on)});saveCfg();return true}
// Auto on the card: one switch (open it by itself when I get in the car, in every game it works in), then the games
function ovtAutoSwitch(w){const on=ovtAutoAny(w),ok=ovtAutoGames(w).length>0;
  return `<button type="button" class="ovs-sw" data-a="autoall" data-w="${w}" aria-pressed="${on}"${ok?"":" disabled"}><span><b class="ovt-autob">Auto</b> ${esc(T3("Open by itself","Abrirse solo","Abrir sozinho"))}</span><span class="ovs-tg${on?" on":""}"><i></i></span></button>`}
function ovtOpenBtn(w){const op=OV_OPEN.has(w);
  if(ovtRemote())return `<button type="button" class="btn small ovt-open${op?" on":""}" data-a="open" data-w="${w}">${esc(op?T3("Close","Cerrar","Fechar"):T3("Open","Abrir","Abrir"))}</button>`;
  if(MODE==="bridge")return `<button type="button" class="btn small ovt-open" data-a="here" data-w="${w}">${L("openHere",true)}</button>`;
  return ""}
const ovtCfgBtn=w=>`<button type="button" class="btn small ovt-cfg" data-a="cfg" data-w="${w}" aria-label="${esc(L("configure",true)+" · "+ovtName(w))}" title="${esc(L("configure",true))}">${ovtIcon.cfg}</button>`;
const ovtExpPill=w=>ovtExp(w)?`<span class="ovt-exp">${esc(T3("Experimental","Experimental","Experimental"))}</span>${typeof proB==="function"?proB("exp_overlays"):""}`:"";
const ovtDot=w=>`<span class="ovt-dot" aria-hidden="true"></span>`;
const ovtStyleAll=()=>ovStyleOk((CFG.ui||{}).ovstyle)?CFG.ui.ovstyle:OV_DEFAULT_STYLE;

function ovtPresetsHTML(){const mine=ovtMyPresets();
  return `<span class="ovt-lab">${esc(T3("Presets","Perfiles","Perfis"))}</span>`+
    Object.keys(OVT_PRESETS).map(k=>{const on=ovtPresetOn(OVT_PRESETS[k]);return `<button type="button" class="ovt-chip${on?" on":""}" data-a="preset" data-k="${k}" aria-pressed="${on}">${esc(T3(...OVT_PRESET_NAMES[k]))}</button>`}).join("")+
    Object.keys(mine).map(k=>{const on=ovtPresetOn(mine[k]||[]);return `<span class="ovt-chip mine${on?" on":""}"><button type="button" data-a="mypreset" data-k="${esc(k)}" aria-pressed="${on}">${esc(k)}</button><button type="button" class="x" data-a="delpreset" data-k="${esc(k)}" aria-label="${esc(T3("Delete","Eliminar","Excluir")+" "+k)}">×</button></span>`}).join("")+
    `<button type="button" class="ovt-chip add" data-a="savepreset">+ ${esc(T3("Save current","Guardar el actual","Salvar o atual"))}</button>`}
function ovtDesignHTML(){const cur=ovtStyleAll();
  return `<label class="ovt-designsel"><span class="ovt-lab">${esc(T3("Design","Diseño","Design"))}</span><select data-c="style">${OV_STYLES.map(([k])=>`<option value="${k}"${cur===k?" selected":""}>${esc(ovStyleLabel(k))}${k==="classic"?"":" · Beta"}</option>`).join("")}</select></label>`}
// the foot: when they open and close by themselves. The window kind (always the frameless one), the frame rate and
// the title are no longer for all of them here: the rate and the title are each overlay's own (its settings → Look),
// and clicks reach the overlays only while they are being placed (the owner's choices)
function ovtFootHTML(){
  return `${chk("oAuto",CFG.autoStart,L("autoOpen",true))}${chk("oClose",CFG.closeOnExit,L("closeExit",true))}`}
function ovtCounts(){const open=WIDGETS.filter(w=>OV_OPEN.has(w)).length,auto=WIDGETS.filter(ovtAutoAny).length,s=$("#ovSub");if(!s)return;
  s.textContent=(ovtRemote()?T3(`${open} open`,`${open} abiertos`,`${open} abertos`)+" · ":"")+T3(`${auto} on Auto`,`${auto} en Auto`,`${auto} no Auto`)}

/* ---------- the frame: built once per language, so the preview keeps its page while the settings change ---------- */
function ovtFrame(){const root=$("#ovTab");if(!root)return null;const key=LANG;if(OVT.frame===key&&root.firstChild)return root;OVT.frame=key;OVT.prevW="";
  root.className="ovt";
  root.innerHTML=`<div class="ovt-bar"><div class="ovt-presets" id="ovtPresets"></div><div class="ovt-acts" id="ovtActs"></div></div>
    <div class="ovt-b"><nav class="ovt-nav" id="ovtNav" aria-label="${esc(L("tab.overlays",true))}"></nav>
      <div class="ovt-stage"><div class="ovt-stagebar" id="ovtStageBar"></div><div class="screen ovt-screen" id="ovScreen"></div></div>
      <aside class="ovt-insp" id="ovtInspBox"><div id="ovtInspHead"></div><div class="ovt-prev" id="ovtPrev"></div><div id="ovtInsp"></div></aside></div>
    <div class="ovt-foot" id="ovtFoot"></div>`;
  root.onclick=ovtClick;root.onchange=ovtChange;root.oninput=ovtInput;return root}

function renderOverlaysTab(){const root=ovtFrame();if(!root)return;const remote=ovtRemote(),dis=remote?"":" disabled";
  if(!PRO.tried)loadPro().then(()=>{if(PRO.loaded&&typeof CUR_VIEW!=="undefined"&&CUR_VIEW==="overlays")renderOverlaysTab()});
  // without Pro on this PC once the beta is over the experimental ones close; the Auto list is left as it is (it goes
  // with the account, so the PC with Pro keeps it): the agent opens only the first basic ones (proAutoList in pcid.go)
  if(proGated())WIDGETS.filter(w=>!OV_BASIC.includes(w)&&OV_OPEN.has(w)).forEach(w=>{OV_OPEN.delete(w);fetch(`/api/overlay/close?w=${w}`,{method:"POST"}).catch(()=>{})});
  const c=$("#ovCallout");if(c){const t=MODE!=="bridge"?Lp("Overlay windows open when the app runs in Pitlane HQ Agent on your Windows PC. You can set them up here already.","Las ventanas overlay se abren cuando la app funciona en Pitlane HQ Agent en tu PC con Windows. Ya puedes configurarlas aquí.",false,null,"As janelas overlay abrem quando o app roda no Pitlane HQ Agent no seu PC com Windows. Você já pode configurá-las aqui."):!remote?Lp("Overlay windows need Pitlane HQ Agent running on Windows.","Las ventanas overlay necesitan Pitlane HQ Agent en Windows.",false,null,"As janelas overlay precisam do Pitlane HQ Agent no Windows."):"";c.innerHTML=t;c.hidden=!t}
  $("#ovtActs").innerHTML=`<button type="button" class="btn${CFG.edit?" primary":""}" data-a="edit" aria-pressed="${!!CFG.edit}"${remote||MODE==="local"?"":dis}>${esc(CFG.edit?T3("Done placing","Terminar de colocar","Terminar de posicionar"):T3("Place on the screen","Colocar en la pantalla","Posicionar na tela"))}</button>
    <button type="button" class="btn" data-a="closeall"${dis}>${L("closeAll",true)}</button><button type="button" class="btn primary" data-a="opennow"${dis}>${esc(T3("Open now","Abrir ahora","Abrir agora"))}</button>`;
  $("#ovtPresets").innerHTML=ovtPresetsHTML();
  const foot=$("#ovtFoot");foot.innerHTML=ovtFootHTML();
  ovtRenderScreen();
  ovtCounts();markOvOpen();markGameGaps();renderScreenEditor();refreshScreenRects()}

/* the list, the screen and the chosen overlay */
function ovtPick(){if(WIDGETS.includes(OVT.sel))return OVT.sel;return WIDGETS.find(w=>OV_OPEN.has(w))||WIDGETS.find(ovtAutoAny)||"relative"}
function ovtRenderScreen(){const sel=ovtPick();OVT.sel=sel;
  $("#ovtNav").innerHTML=ovtGroups().map(([g,ws])=>`<div class="ovt-ng"><span class="ovt-gh">${esc(T3(...OVT_GROUP_NAMES[g]))}</span>${ws.map(w=>`<button type="button" class="ovt-ni${w===sel?" sel":""}" data-a="sel" data-w="${w}" data-ovw="${w}" aria-current="${w===sel}">${ovtDot(w)}<span class="nm">${esc(ovtName(w))}</span>${ovtExp(w)?`<span class="ovt-x">Beta</span>`:""}<span class="ovt-auto"${ovtAutoAny(w)?"":` style="visibility:hidden" aria-hidden="true"`}>Auto</span></button>`).join("")}</div>`).join("");
  $("#ovtStageBar").innerHTML=`${ovtDesignHTML()}<span class="ovt-legend"><i class="open"></i>${esc(T3("Open","Abierto","Aberto"))}<i class="closed"></i>${esc(T3("Closed","Cerrado","Fechado"))}</span><button type="button" class="btn small" data-a="reset"${ovtRemote()?"":" disabled"}>${L("resetPos",true)}</button>`;
  ovtRenderInsp()}
/* an overlay's text size: a slider, 50 to 150 %, that makes its window that much of its normal width, so the text and
   the box shrink or grow together (/api/overlay/size, ovSizeRect in overlay.go; an overlay not open opens at it); it
   takes the old Small/Normal/Large (textScale) into it. Only where the overlays are this PC's */
const OV_SIZE={};let OV_SIZE_T=0;
function ovSizeHTML(w){const v=Math.round((OV_SIZE[w]||1)*100),on=typeof pcOverlays==="function"&&pcOverlays();
  return `<span class="ovt-lab">${esc(T3("Text size","Tamaño del texto","Tamanho do texto"))} <b class="ovsz-v" data-w="${w}">${v}%</b></span><input type="range" min="50" max="150" step="5" value="${v}" data-ovsz="${w}" aria-label="${esc(T3("Text size","Tamaño del texto","Tamanho do texto"))}"${on?"":" disabled"}>`}
function ovSizeShow(w,v){document.querySelectorAll(`.ovsz-v[data-w="${w}"]`).forEach(b=>{b.textContent=v+"%"})}
async function ovSizeLoad(w){if(!(typeof pcOverlays==="function"&&pcOverlays()))return;
  try{const r=await (await fetch(`/api/overlay/size?w=${encodeURIComponent(w)}`)).json();if(!r||!(r.s>0))return;OV_SIZE[w]=r.s;const v=Math.round(r.s*100);
    document.querySelectorAll(`input[data-ovsz="${w}"]`).forEach(i=>{if(document.activeElement!==i)i.value=v});ovSizeShow(w,v)}catch(e){}}
// while the slider moves the window follows (a few times a second); on release it is kept
function ovSizeSet(t,done){const w=t.dataset.ovsz,v=Math.max(50,Math.min(150,+t.value||100));ovSizeShow(w,v);OV_SIZE[w]=v/100;
  const now=performance.now();if(!done&&now-OV_SIZE_T<150)return;OV_SIZE_T=now;
  if(done){const m=(CFG.ui||{})[w];if(m&&"textScale" in m){const n=Object.assign({},m);delete n.textScale;CFG.ui[w]=n;saveCfg()}}
  if(typeof pcOverlays==="function"&&pcOverlays())fetch(`/api/overlay/size?w=${encodeURIComponent(w)}&s=${v/100}`,{method:"POST"}).then(r=>r.json()).then(j=>{if(done&&j&&j.rect){CFG.positions=Object.assign({},CFG.positions,{[w]:j.rect});try{renderScreenEditor();refreshScreenRects()}catch(e){}}}).catch(()=>{})}
function ovtRenderInsp(){const w=OVT.sel,g=ui(w),own=(CFG.ui||{})[w]||{},alpha=ovAlphaOf(w),ts=g.textScale||1,hd=g.hide||"";
  $("#ovtInspHead").innerHTML=`<div class="ovt-ih" data-ovw="${w}"><h2>${esc(ovtName(w))}</h2>${ovtExpPill(w)}<span class="ovt-pvtag" hidden></span><span class="ovt-state">${ovtDot(w)}<span class="on-t">${esc(T3("Open","Abierto","Aberto"))}</span><span class="off-t">${esc(T3("Closed","Cerrado","Fechado"))}</span></span></div>${ovtCompat(w)}`;
  ovtPreview(w);ovtTagShow($("#ovtPrev"));ovSizeLoad(w);
  const seg=(a,list,cur)=>`<div class="seg3 ovt-seg3">${list.map(([v,...n])=>`<button type="button" data-a="${a}" data-k="${v}" aria-pressed="${String(cur)===String(v)}">${esc(T3(...n))}</button>`).join("")}</div>`;
  $("#ovtInsp").innerHTML=`<div class="ovt-row2" data-ovw="${w}">${ovtOpenBtn(w)}${ovtCfgBtn(w).replace('class="btn small ovt-cfg"','class="btn small ovt-cfg wide"').replace(ovtIcon.cfg,ovtIcon.cfg+`<span>${esc(T3("All settings","Todos los ajustes","Todos os ajustes"))}</span>`)}</div>
    <div class="ovt-f">${ovtAutoSwitch(w)}</div>
    <label class="ovt-f"><span class="ovt-lab">${esc(T3("Design","Diseño","Design"))}</span><select data-c="ovstyle" data-w="${w}"><option value="">${esc(T3("Same as all","Igual que todos","Igual a todos"))} · ${esc(ovStyleLabel(ovtStyleAll()))}</option>${OV_STYLES.map(([k])=>`<option value="${k}"${own.style===k?" selected":""}>${esc(ovStyleLabel(k))}${k==="classic"?"":" · Beta"}</option>`).join("")}</select></label>
    <label class="ovt-f"><span class="ovt-lab">${esc(T3("Opacity","Opacidad","Opacidade"))} <b id="ovtAlphaV">${Math.round(alpha/255*100)}%</b></span><input type="range" min="60" max="255" step="5" value="${alpha}" data-c="alpha" data-w="${w}"></label>
    <label class="ovt-f">${ovSizeHTML(w)}</label>
    <div class="ovt-f"><span class="ovt-lab">${esc(T3("Hide by itself","Ocultarse solo","Ocultar sozinho"))}</span>${seg("hide",[["","Never","Nunca","Nunca"],["car","Out of the car","Fuera del coche","Fora do carro"],["pits","And in the pits","Y en boxes","E nos boxes"]],hd)}</div>
    ${OV_TITLED.includes(w)?`<div class="ovt-f"><button type="button" class="ovt-chip${g.title!==false?" on":""}" data-a="title" aria-pressed="${g.title!==false}">${esc(T3("Show the title","Mostrar el título","Mostrar o título"))}</button></div>`:""}`}
/* the chosen overlay's live preview: the overlay page itself (scaled to the column), playing the game's data or a real
   sample of it (previewSampleTick in index.html) */
function ovtPreview(w){const box=$("#ovtPrev");if(!box)return;
  if(MODE==="bridge")ovtPic(box,w);
  else{const sz=OVSZ[w]||[460,260];if(OVT.prevW!==w||!box.querySelector("iframe")){OVT.prevW=w;box.dataset.pvtag="";box.innerHTML=`<div class="ovt-pf"><iframe title="${esc(ovtName(w))}" src="?overlay=${w}&preview=1" style="width:${sz[0]}px;height:${sz[1]}px" tabindex="-1"></iframe></div>`}
    const f=box.querySelector("iframe"),k=Math.min(1,(box.clientWidth||280)/sz[0]);f.style.transform=`scale(${k})`;f.parentElement.style.height=Math.round(sz[1]*k)+"px"}
  box.style.opacity=String(ovAlphaOf(w)/255)}
/* on the PC the preview is the overlay drawn by its own code, the picture its window shows (GET
   /api/overlay/preview.png, ovpreview.go), several times a second while it is on the screen, with its settings as they
   are now: it grows with the columns and rows it has to show. Its tag says whose data it plays when not the game's. */
/* the tag sits in the header beside Open/Closed, never on the picture, so it never covers the overlay's numbers; the
   web's preview (an overlay page in a frame) hands its tag here (pvTag in index.html) */
const ovtTagEl=box=>!box?null:box.id==="ovtPrev"?$("#ovtInspHead .ovt-pvtag"):box.id==="ovsPv"?$("#ovsDlg .ovs-h .ovt-pvtag"):null;
function ovtTagShow(box){const tag=ovtTagEl(box);if(!tag)return;const t=box.dataset.pvtag||"";tag.hidden=!t;tag.textContent=t}
function ovtPvTag(frame,t){const box=frame&&frame.closest&&frame.closest("#ovtPrev,#ovsPv");if(!box||!ovtTagEl(box))return false;box.dataset.pvtag=t||"";ovtTagShow(box);return true}
function ovtPic(box,w){let img=box.querySelector("img.ovt-pic");
  if(!img||img.dataset.w!==w){box.dataset.pvtag="";box.innerHTML=`<div class="ovt-picw"><img class="ovt-pic" data-w="${w}" alt="${esc(ovtName(w))}"></div>`;img=box.querySelector("img.ovt-pic");ovtTagShow(box)}
  if(img._loop)return;img._loop=true;
  const tick=async()=>{if(!img.isConnected)return;
    if(!document.hidden){try{const r=await fetch(`/api/overlay/preview.png?w=${encodeURIComponent(w)}&t=${Date.now()}`,{cache:"no-store"});
      if(r.ok){const src=r.headers.get("X-Preview-Src")||"",u=URL.createObjectURL(await r.blob()),old=img.src;img.onload=()=>{if(old.startsWith("blob:"))URL.revokeObjectURL(old)};img.src=u;
        const t=src==="mine"?T3("Your last session","Tu última sesión","Sua última sessão"):src==="community"?T3("Another driver","Otro piloto","Outro piloto"):"";if((box.dataset.pvtag||"")!==t||(ovtTagEl(box)&&ovtTagEl(box).textContent!==t)){box.dataset.pvtag=t;ovtTagShow(box)}}}catch(e){}}
    setTimeout(tick,120)};
  tick()}

/* ---------- what the controls do ---------- */
const ovtProNeed=w=>{if(!proGated()||OV_BASIC.includes(w))return false;proDialog(T3("The experimental overlays need Pro.","Los overlays experimentales necesitan Pro.","Os overlays experimentais precisam do Pro."));return true};
const ovtBackToLive=w=>{if(HIDDEN.has(w)){HIDDEN.delete(w);store.set("pw.hiddenW",[...HIDDEN]);applyLayout()}}; // a closed overlay comes back to Telemetry
async function ovtToggleOpen(w){if(!OV_OPEN.has(w)){if(ovtProNeed(w))return;await popOut(w);OV_OPEN.add(w);markOvOpen();setTimeout(refreshScreenRects,600);return}
  OV_OPEN.delete(w);ovtBackToLive(w);markOvOpen();fetch(`/api/overlay/close?w=${w}`,{method:"POST"}).catch(()=>{}).finally(()=>setTimeout(refreshScreenRects,400))}
function ovtSelect(w){if(!WIDGETS.includes(w))return;OVT.sel=w;store.set("pw.ovSel",w);ovtRenderScreen();markOvOpen();markGameGaps();renderScreenEditor()}
// the previews follow the settings at once: the PC's overlay pages hear them from the agent, the web's are told here
// on the web the previews are the overlay page: its frame takes the size the overlay grows to (more columns or rows)
setInterval(()=>{document.querySelectorAll("#ovtPrev iframe,#ovsPv iframe").forEach(f=>{try{const d=f.contentDocument&&f.contentDocument.documentElement,b=f.parentElement.parentElement;if(!d||!b)return;
  const w=Math.max(parseInt(f.dataset.w0||f.style.width)||0,d.scrollWidth),h=Math.max(parseInt(f.dataset.h0||f.style.height)||0,d.scrollHeight);if(!f.dataset.w0){f.dataset.w0=parseInt(f.style.width);f.dataset.h0=parseInt(f.style.height)}
  f.style.width=w+"px";f.style.height=h+"px";const k=Math.min(1,(b.clientWidth||280)/w);f.style.transform=`scale(${k})`;f.parentElement.style.height=Math.round(h*k)+"px"}catch(e){}})},700);
function ovtSyncPreview(){if(MODE==="bridge")return;document.querySelectorAll("#ovtPrev iframe,#ovsPv iframe").forEach(f=>{try{const cw=f.contentWindow;if(cw&&cw.applyServerCfg)cw.applyServerCfg(JSON.parse(JSON.stringify(CFG)),true)}catch(e){}})}
["click","change"].forEach(t=>document.addEventListener(t,()=>{if(typeof CUR_VIEW!=="undefined"&&CUR_VIEW==="overlays")setTimeout(ovtSyncPreview,0)}));
async function ovtClick(e){const b=e.target.closest("[data-a]");if(!b||b.disabled||!e.currentTarget.contains(b))return;const a=b.dataset.a,w=b.dataset.w,k=b.dataset.k;
  if(a==="sel")return ovtSelect(w);
  if(a==="autoall"){if(ovtAutoToggle(w))renderOverlaysTab();return}
  if(a==="open")return ovtToggleOpen(w);
  if(a==="here"){window.open(`/?overlay=${w}`,"_blank");return}
  if(a==="cfg")return ovtSettings(w);
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
  if(a==="hide"){setUI(OVT.sel,{hide:k});return}
  if(a==="title"){setUI(OVT.sel,{title:ui(OVT.sel).title===false});return}}
// the footer's switches keep their ids (chk): Open my overlays when I get in the car, Close them when the game closes, click-through
document.addEventListener("click",e=>{const b=e.target.closest("#ovTab #oAuto,#ovTab #oClose");if(!b)return;const k={oAuto:"autoStart",oClose:"closeOnExit"}[b.id];CFG[k]=!CFG[k];saveCfg();renderOverlaysTab()});
function ovtChange(e){const t=e.target,c=t.dataset&&t.dataset.c;if(!c)return;
  if(c==="style"){CFG.ui=CFG.ui||{};if(t.value===OV_DEFAULT_STYLE)delete CFG.ui.ovstyle;else CFG.ui.ovstyle=t.value;saveCfg();renderOverlaysTab()}
  else if(c==="ovstyle"){const w=t.dataset.w;CFG.ui=CFG.ui||{};const m=Object.assign({},CFG.ui[w]||{});if(t.value)m.style=t.value;else delete m.style;CFG.ui[w]=m;saveCfg()}
  else if(c==="alpha")setUI(t.dataset.w,{alpha:Math.max(60,Math.min(255,+t.value||255))});
  else if(t.dataset.ovsz)ovSizeSet(t,true);
}
function ovtInput(e){const t=e.target,c=t.dataset&&t.dataset.c;if(t.dataset&&t.dataset.ovsz)return ovSizeSet(t,false);
  if(c==="alpha"){const p=$("#ovtPrev"),v=$("#ovtAlphaV");if(p)p.style.opacity=String(+t.value/255);if(v)v.textContent=Math.round(+t.value/255*100)+"%"}}
addEventListener("resize",()=>{if(typeof CUR_VIEW!=="undefined"&&CUR_VIEW==="overlays")ovtPreview(OVT.sel)});

/* which overlays are open on the PC right now: the dots, the badges, the Open/Close buttons and the counts */
function markOvOpen(){
  document.querySelectorAll("#ovTab [data-ovw]").forEach(el=>el.classList.toggle("is-open",OV_OPEN.has(el.dataset.ovw)));
  document.querySelectorAll('#ovTab [data-a="open"]').forEach(b=>{const on=OV_OPEN.has(b.dataset.w);b.classList.toggle("on",on);b.textContent=on?T3("Close","Cerrar","Fechar"):T3("Open","Abrir","Abrir")});
  ovtCounts()}

/* ---------- the screen: every open or Auto overlay where it sits on the PC (and the chosen one), dragged and resized
   from the app; the windows move as you drag (/api/overlay/move) ---------- */
// where an overlay opens the first time, on a 2560×1440 screen (ovHome in overlay.go)
const OV_HOME={relative:[1880,900],radar:[1150,700],deltabar:[1020,40],timing:[40,40],standings:[40,300],map:[2080,40],flag:[1020,150],dash:[1000,1180],fuel:[40,1180]};
async function renderScreenEditor(){const box=$("#ovScreen");if(!box||SCREEN_DRAG)return;const sc=await screenInfo(),[vx,vy,vw,vh]=sc.virtual;if(!box.isConnected)return;box.style.aspectRatio=vw+" / "+vh;
  const pos=CFG.positions||{},sel=OVT.sel,names=[...new Set([...(CFG.autoWidgets||[]),...OV_OPEN,...(sel?[sel]:[])])].filter(n=>OVSZ[n]&&WIDGETS.includes(n));
  const inside=([x,y,w,h])=>{w=Math.min(w,vw);h=Math.min(h,vh);return[Math.max(vx,Math.min(vx+vw-w,x)),Math.max(vy,Math.min(vy+vh-h,y)),w,h]};
  const home=n=>{const h=OV_HOME[n],[px,py,pw,ph]=sc.primary;const k=Math.max(.5,Math.min(1,ph/1440)) /* its size for the main screen too (ovScreenK) */,w=Math.round(OVSZ[n][0]*k),hh=Math.round(OVSZ[n][1]*k);return h&&[px+Math.max(0,Math.min(pw-w,Math.round(h[0]*pw/2560))),py+Math.max(0,Math.min(ph-hh,Math.round(h[1]*ph/1440))),w,hh]};
  const rect=(n,i)=>inside(pos[n]||home(n)||[vx+80+i*40,vy+80+i*40,OVSZ[n][0],OVSZ[n][1]]);
  box.innerHTML=`<div class="mon" style="left:${(sc.primary[0]-vx)/vw*100}%;top:${(sc.primary[1]-vy)/vh*100}%;width:${sc.primary[2]/vw*100}%;height:${sc.primary[3]/vh*100}%"></div>`+
    (names.map((n,i)=>{const[x,y,w,h]=rect(n,i);return `<div class="ovrect${(CFG.autoWidgets||[]).includes(n)?" auto":""}${OV_OPEN.has(n)?"":" closed"}${n===sel?" sel":""}" data-n="${n}" style="left:${(x-vx)/vw*100}%;top:${(y-vy)/vh*100}%;width:${w/vw*100}%;height:${h/vh*100}%"><span>${esc(ovtName(n))}</span><i class="rz"></i></div>`}).join("")||
    `<p class="empty" style="position:absolute;inset:0;display:grid;place-items:center;margin:0">${Lp("Open an overlay or mark it with Auto to place it here.","Abre un overlay o márcalo con Auto para colocarlo aquí.",false,null,"Abra um overlay ou marque-o com Auto para posicioná-lo aqui.")}</p>`);
  box.querySelectorAll(".ovrect").forEach(el=>{el.onpointerdown=e=>{e.preventDefault();SCREEN_DRAG=true;el.setPointerCapture(e.pointerId);const n=el.dataset.n,resize=!!e.target.closest(".rz"),k=vw/box.clientWidth;
    let[x,y,w,h]=rect(n,names.indexOf(n));const sx=e.clientX,sy=e.clientY,x0=x,y0=y,w0=w,h0=h;let t=0,moved=false;
    const send=()=>{CFG.positions=Object.assign({},CFG.positions,{[n]:[x,y,w,h]});if(pcOverlays())fetch(`/api/overlay/move?w=${n}&x=${x}&y=${y}&width=${w}&height=${h}`,{method:"POST"}).catch(()=>{});else if(MODE==="local")store.set("pw.cfg",CFG)};
    el.onpointermove=ev=>{const dx=(ev.clientX-sx)*k,dy=(ev.clientY-sy)*k,snap=v=>Math.round(v/5)*5;if(!moved&&Math.abs(ev.clientX-sx)+Math.abs(ev.clientY-sy)<4)return;moved=true;
      if(resize){const mw=OV_MINW[n]||200,mh=OV_MINH[n]||40;w=Math.max(mw,Math.min(vx+vw-x,snap(w0+dx)));h=Math.max(mh,Math.min(vy+vh-y,snap(h0+dy)))}else{x=Math.max(vx,Math.min(vx+vw-w,snap(x0+dx)));y=Math.max(vy,Math.min(vy+vh-h,snap(y0+dy)))}
      el.style.left=(x-vx)/vw*100+"%";el.style.top=(y-vy)/vh*100+"%";el.style.width=w/vw*100+"%";el.style.height=h/vh*100+"%";const now=performance.now();if(now-t>120){t=now;send()}};
    el.onpointerup=()=>{el.onpointermove=null;el.onpointerup=null;SCREEN_DRAG=false;if(moved)send();else if(n!==OVT.sel)ovtSelect(n)}}})}
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
.ovt-bar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}.ovt-presets{flex:1 1 520px}.ovt-presets>.ovt-lab{margin-right:4px}
.ovt-acts{display:flex;flex-wrap:wrap;gap:8px}
.ovt-presets{display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius,12px);padding:12px 14px;min-width:0}
.ovt-chip{display:inline-flex;align-items:center;min-height:32px;padding:0 13px;border-radius:999px;border:1px solid var(--line);background:var(--surface2);color:var(--fg);font:600 12px/1 var(--f-body);letter-spacing:.05em;text-transform:uppercase;cursor:pointer}
.ovt-chip:hover{border-color:var(--line2,var(--muted))}.ovt-chip.on{border-color:var(--accent);color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,var(--surface2))}
.ovt-chip.add{border-style:dashed;background:none;color:var(--muted);text-transform:none;letter-spacing:0;font-weight:500}
.ovt-chip.mine{padding:0;gap:0}.ovt-chip.mine button{background:none;border:0;color:inherit;font:inherit;letter-spacing:inherit;text-transform:none;min-height:30px;padding:0 6px 0 13px;cursor:pointer}.ovt-chip.mine .x{padding:0 10px 0 4px;color:var(--muted)}
.ovt-designsel{display:flex;align-items:center;gap:10px}.ovt-designsel select{min-height:34px}
.ovt-design .sw.clear{border:1px dashed var(--muted)}.ovt-design .sw i{display:block;height:5px;border-radius:3px;width:70%}.ovt-design .sw i+i{width:100%;opacity:.7}
.ovt-exp{flex:none;font:600 9px/1 var(--f-data);letter-spacing:.06em;text-transform:uppercase;color:#b794f6;border:1px solid color-mix(in srgb,#b794f6 45%,transparent);border-radius:4px;padding:3px 5px}
.ovt-dot{flex:none;width:8px;height:8px;border-radius:50%;box-sizing:border-box;border:1.5px solid var(--line2,var(--muted))}
.is-open .ovt-dot,.is-open>.ovt-dot{background:var(--good);border-color:var(--good)}
.ovt-autob{font:700 11px var(--f-data);letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-right:6px}.ovs-sw[disabled]{opacity:.45;cursor:default}
.ovt-games{display:inline-flex;flex-wrap:wrap;gap:6px}.ovt-compat{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:8px}.ovt-compat .ovt-lab{margin:0}
.ovt-gp{display:inline-flex;align-items:center;min-height:22px;padding:0 8px;border-radius:5px;border:1px solid var(--line);color:var(--muted);font:600 10px var(--f-data);letter-spacing:.04em}
.ovt-gp.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent)}
.ovt-gp.no{border-style:dashed;opacity:.45;text-decoration:line-through}
.ovt-cb{display:inline-flex;gap:6px;justify-content:flex-end}
.ovt-open{min-width:74px}.ovt-open.on{color:var(--good);border-color:color-mix(in srgb,var(--good) 45%,var(--line))}
.ovt-cfg{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-width:36px;padding:0 9px}
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
/* screen */
.ovt-b{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start}
.ovt-nav{flex:0 1 240px;min-width:210px;display:flex;flex-direction:column;gap:2px;padding:8px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius,12px);max-height:calc(100vh - 230px);overflow:auto;scrollbar-width:thin}
.ovt-ng{display:flex;flex-direction:column;gap:1px}.ovt-gh{padding:10px 10px 4px;font:700 13px var(--f-display);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.ovt-ni{display:flex;align-items:center;gap:10px;min-height:34px;padding:0 10px;border:0;border-radius:7px;background:none;color:var(--muted);font:500 13px var(--f-body);cursor:pointer;text-align:left}
.ovt-ni .nm{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ovt-ni:hover,.ovt-ni.is-open{color:var(--fg)}
.ovt-ni.sel{background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent)}
.ovt-auto{font:600 9px var(--f-data);letter-spacing:.06em;text-transform:uppercase;color:var(--accent)}.ovt-x{font:600 9px var(--f-data);letter-spacing:.06em;text-transform:uppercase;color:#b794f6;padding:1px 5px;border:1px solid color-mix(in srgb,#b794f6 45%,transparent);border-radius:4px}.ovt-x+.ovt-auto{margin-left:6px}.ovt-ni .ovt-auto{min-width:30px;text-align:right}
.ovt-stage{flex:999 1 480px;min-width:0;display:flex;flex-direction:column;gap:10px}
.ovt-stagebar{display:flex;flex-wrap:wrap;align-items:center;gap:12px}.ovt-stagebar .btn{margin-left:auto}
.ovt-legend{display:inline-flex;align-items:center;gap:6px;font:500 11px var(--f-data);color:var(--muted)}.ovt-legend i{width:12px;height:8px;border-radius:2px;margin-left:6px}
.ovt-legend .open{border:1.5px solid var(--fg)}.ovt-legend .closed{border:1.5px dashed var(--muted);opacity:.8}
.ovt-screen{max-width:none;margin:0;border-radius:var(--radius,12px);background:linear-gradient(180deg,#1c2533 0 47%,#29313b 47% 100%)}
.ovt-screen::before{content:"";position:absolute;left:30%;right:30%;bottom:0;height:53%;background:#3a414b;clip-path:polygon(40% 0,60% 0,100% 100%,0 100%);opacity:.75;pointer-events:none}
.ovt-screen::after{content:"";position:absolute;left:33%;right:33%;bottom:0;height:20%;background:#0e1218;border-radius:45% 45% 0 0;pointer-events:none}
.ovt-screen .ovrect,.ovt-screen .ovrect.auto{z-index:1;border-radius:5px;background:color-mix(in srgb,#0d1116 88%,transparent);border:1.5px solid color-mix(in srgb,#e8edf3 55%,transparent);user-select:none}
.ovt-screen .ovrect.closed{border-style:dashed;opacity:.6}.ovt-screen .ovrect span{font-size:10px;color:#e8edf3;padding:3px 5px}
.ovt-screen .ovrect .rz{width:14px;height:14px;background:linear-gradient(135deg,transparent 50%,color-mix(in srgb,#e8edf3 60%,transparent) 50%)}
.ovt-screen .ovrect.sel{border:2px solid var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 25%,transparent);background:color-mix(in srgb,#0d1116 88%,transparent);z-index:3;opacity:1}.ovt-screen .ovrect.sel span{color:var(--accent)}.ovt-screen .ovrect.sel .rz{background:linear-gradient(135deg,transparent 50%,var(--accent) 50%)}
.ovt-insp{flex:0 1 300px;min-width:260px;display:flex;flex-direction:column;gap:14px;padding:14px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius,12px)}
.ovt-ih{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.ovt-ih h2{margin:0;font:700 22px/1 var(--f-display);letter-spacing:.06em;text-transform:uppercase;margin-right:auto}
.ovt-state{display:inline-flex;align-items:center;gap:6px;font:600 10px var(--f-data);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.ovt-state .on-t{display:none}.is-open .ovt-state{color:var(--good)}.is-open .ovt-state .on-t{display:inline}.is-open .ovt-state .off-t{display:none}
.ovt-prev{border-radius:8px;overflow:hidden;min-height:60px}.ovt-picw{position:relative}.ovt-pic{display:block;max-width:100%;height:auto;margin:0 auto}.ovt-pvtag{padding:2px 7px;white-space:nowrap;border-radius:999px;background:color-mix(in srgb,var(--accent) 85%,transparent);color:#11151b;font:800 9px/1.4 var(--f-data);letter-spacing:.08em;text-transform:uppercase;pointer-events:none}.ovt-pvtag[hidden]{display:none}.ovt-pf{position:relative;overflow:hidden;border-radius:8px}.ovt-pf iframe{position:absolute;left:0;top:0;border:0;transform-origin:0 0;pointer-events:none;background:transparent}
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
@media (max-width:760px){.ovt-bar{align-items:stretch}.ovt-acts{width:100%}.ovt-nav{flex:1 1 100%;max-height:260px}.ovt-insp{flex:1 1 100%;min-width:0}}
`;document.head.appendChild(s)})();
