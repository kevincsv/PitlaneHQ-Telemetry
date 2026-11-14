// The names the admin page gives to what the apps count, in English, Spanish and Portuguese (Brazil), so the phones'
// admin panel shows the PC's names without a copy of them (the web names its screens with its own labels). Also the
// sources and the sentences of What stands out (highlightsOf in usagelib.js), written once here for every device.

/** [en, es, pt] */
const N = (en, es, pt) => [en, es || en, pt || en];

import { REASONS } from "./uninstall.js";

export const VIEWS = {
  home: N("Home", "Inicio", "Início"), live: N("Telemetry", "Telemetría", "Telemetria"), telemetry: N("Telemetry", "Telemetría", "Telemetria"),
  laps: N("Laps", "Vueltas", "Voltas"), cloudlaps: N("My sessions", "Mis sesiones", "Minhas sessões"), session: N("Session", "Sesión", "Sessão"),
  races: N("My races", "Mis carreras", "Minhas corridas"), coach: N("Coach"), tracks: N("Tracks", "Circuitos", "Pistas"), tyres: N("Tyres", "Neumáticos", "Pneus"),
  field: N("Standings", "Posiciones", "Classificação"), standings: N("Standings", "Posiciones", "Classificação"), overlays: N("Overlays"),
  revbeep: N("Rev beep", "Pitido de revoluciones", "Bipe de giros"), community: N("Community", "Comunidad", "Comunidade"), leagues: N("Leagues", "Ligas", "Ligas"),
  profile: N("Driver profile", "Perfil de piloto", "Perfil do piloto"), me: N("My account", "Mi cuenta", "Minha conta"), account: N("My account", "Mi cuenta", "Minha conta"),
  settings: N("Settings", "Ajustes", "Configurações"), calendar: N("Calendar", "Calendario", "Calendário"), plan: N("Planner", "Planificador", "Planejador"),
  notes: N("Notes", "Notas", "Notas"), drinks: N("DRINKS mode", "Modo DRINKS", "Modo DRINKS"), news: N("News", "Noticias", "Notícias"), goals: N("Goals", "Objetivos", "Metas"),
  admin: N("Admin"),
};
export const ACTS = {
  race_summary: [N("Race summary", "Resumen de carrera", "Resumo da corrida"), N("Opened the summary of a race", "Abrió el resumen de una carrera", "Abriu o resumo de uma corrida")],
  plan_to_overlay: [N("Plan to the coach overlay", "Plan al overlay del coach", "Plano para o overlay do coach"), N("Sent the coach's plan to the coach overlay", "Llevó el plan del coach al overlay del coach", "Levou o plano do coach ao overlay do coach")],
  track_page: [N("Track page", "Página del circuito", "Página da pista"), N("Opened a track's page", "Abrió la página de un circuito", "Abriu a página de uma pista")],
  leaderboard: [N("Leaderboard", "Leaderboard", "Classificação"), N("Opened a leaderboard", "Abrió una leaderboard", "Abriu uma classificação")],
  overlay_open: [N("Overlay opened", "Overlay abierto", "Overlay aberto"), N("Put an overlay on the screen", "Puso un overlay en pantalla", "Colocou um overlay na tela")],
  profile: [N("Profile opened", "Perfil abierto", "Perfil aberto"), N("Opened a driver's profile", "Abrió el perfil de un piloto", "Abriu o perfil de um piloto")],
  voice_call: [N("Voice call", "Llamada de voz", "Chamada de voz"), N("Started a voice call", "Empezó una llamada de voz", "Começou uma chamada de voz")],
  open_in_coach: [N("Lap sent to the coach", "Vuelta llevada al coach", "Volta levada ao coach"), N("Sent a lap from Laps to the coach", "Llevó una vuelta de Vueltas al coach", "Levou uma volta de Voltas ao coach")],
  widget_settings: [N("Overlay settings", "Ajustes de un overlay", "Ajustes de um overlay"), N("Opened the settings of an overlay", "Abrió los ajustes de un overlay", "Abriu os ajustes de um overlay")],
  whats_new: [N("What's new", "Novedades", "Novidades"), N("Read What's new", "Leyó las Novedades", "Leu as Novidades")],
  session_picker: [N("Choose a session", "Elegir una sesión", "Escolher uma sessão"), N("Picked another session to look at", "Eligió otra sesión para mirar", "Escolheu outra sessão para ver")],
  coach_report: [N("Coach report", "Informe del coach", "Relatório do coach"), N("Opened the coach's report of a lap", "Abrió el informe del coach de una vuelta", "Abriu o relatório do coach de uma volta")],
  coach_plan: [N("Coach plan", "Plan del coach", "Plano do coach"), N("Opened the coach's plan", "Abrió el plan del coach", "Abriu o plano do coach")],
  compare: [N("Compare laps", "Comparar vueltas", "Comparar voltas"), N("Put two laps side by side", "Puso dos vueltas lado a lado", "Colocou duas voltas lado a lado")],
  share_code: [N("Share code", "Código para compartir", "Código de compartilhamento"), N("Made a share code for the live link", "Creó un código para compartir el enlace en directo", "Criou um código para compartilhar o link ao vivo")],
  watch_code: [N("Watch with a code", "Seguir con un código", "Acompanhar com um código"), N("Watched a driver with a share code", "Siguió a un piloto con un código", "Acompanhou um piloto com um código")],
  drinks: [N("DRINKS mode", "Modo DRINKS", "Modo DRINKS"), N("Used DRINKS mode", "Usó el modo DRINKS", "Usou o modo DRINKS")],
  feedback_button: [N("Feedback button", "Botón de opiniones", "Botão de opiniões"), N("Pressed the floating feedback button", "Pulsó el botón flotante de opiniones", "Tocou o botão flutuante de opiniões")],
  feedback_sent: [N("Feedback sent", "Opinión enviada", "Opinião enviada"), N("Sent an answer to Share your feedback", "Envió una respuesta a Danos tu opinión", "Enviou uma resposta a Dê sua opinião")],
  support_open: [N("Support chat opened", "Chat de soporte abierto", "Chat de suporte aberto"), N("Opened the support chat", "Abrió el chat de soporte", "Abriu o chat de suporte")],
  support_sent: [N("Message to support", "Mensaje a soporte", "Mensagem ao suporte"), N("Wrote to support", "Escribió a soporte", "Escreveu ao suporte")],
  support_reply: [N("Support reply", "Respuesta de soporte", "Resposta do suporte"), N("Answered as support (admins)", "Respondió como soporte (admins)", "Respondeu como suporte (admins)")],
  support_logs: [N("Logs sent to support", "Registros enviados a soporte", "Registros enviados ao suporte"), N("Sent the app's logs to support", "Envió los registros de la app a soporte", "Enviou os registros do app ao suporte")],
  share_card: [N("Lap card shared", "Tarjeta de vuelta compartida", "Cartão de volta compartilhado"), N("Shared a lap card", "Compartió una tarjeta de vuelta", "Compartilhou um cartão de volta")],
  connect: [N("Phone connected", "Móvil conectado", "Celular conectado"), N("Connected a phone to the PC", "Conectó un móvil al PC", "Conectou um celular ao PC")],
};
export const AREAS = [
  ["analysis", N("Analysis", "Análisis", "Análise"), ["view:telemetry", "view:live", "view:laps", "view:cloudlaps", "view:session", "view:races", "act:session_picker", "act:race_summary", "act:compare", "view:tracks", "view:tyres", "view:field", "view:standings"]],
  ["coach", N("Coach"), ["view:coach", "act:coach_report", "act:open_in_coach", "act:coach_plan", "act:plan_to_overlay", "view:goals"]],
  ["overlays", N("Overlays"), ["view:overlays", "act:overlay_open", "act:widget_settings", "view:revbeep"]],
  ["community", N("Community", "Comunidad", "Comunidade"), ["view:community", "view:leagues", "act:leaderboard", "act:track_page", "act:profile", "view:profile", "act:share_code", "act:watch_code", "act:voice_call", "act:share_card", "view:drinks", "act:drinks"]],
  ["planning", N("Planning", "Planificación", "Planejamento"), ["view:calendar", "view:plan", "view:notes"]],
  ["help", N("Help and feedback", "Ayuda y opiniones", "Ajuda e opiniões"), ["act:feedback_button", "act:feedback_sent", "act:support_open", "act:support_sent", "act:support_reply", "act:support_logs", "act:whats_new", "view:news"]],
  ["account", N("Home and account", "Inicio y cuenta", "Início e conta"), ["view:home", "view:me", "view:account", "view:settings", "act:connect"]],
];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
/** A counted key's name and what it counts, [en, es, pt] each. */
export function featureOf(key) {
  const [kind, name = ""] = String(key).split(/:(.*)/);
  if (kind === "act" && ACTS[name]) return { name: ACTS[name][0], what: ACTS[name][1] };
  const v = VIEWS[name] || N(cap(name));
  return { name: v, what: [`Opened ${v[0]}`, `Abrió ${v[1]}`, `Abriu ${v[2]}`] };
}
/** The answer's features in their areas, for the phones: [{k, name, rows: [{key, name, what, users, n}]}] */
export function areasOf(top) {
  const seen = new Set(), out = [];
  for (const [k, name, keys] of AREAS) {
    const rows = keys.map((key) => top.find((x) => x.key === key)).filter(Boolean);
    rows.forEach((x) => seen.add(x.key));
    if (rows.length) out.push({ k, name, rows: rows.map((x) => ({ ...featureOf(x.key), key: x.key, users: x.users, n: x.n })) });
  }
  const rest = top.filter((x) => !seen.has(x.key) && x.key !== "view:admin").slice(0, 10);
  if (rest.length) out.push({ k: "other", name: N("Other", "Otros", "Outros"), rows: rest.map((x) => ({ ...featureOf(x.key), key: x.key, users: x.users, n: x.n })) });
  return out;
}

export const SRC_NAMES = {
  direct: N("Direct", "Directo", "Direto"), unknown: N("Not known", "Sin saber", "Desconhecido"), "pc-app": N("The PC agent", "El agente del PC", "O agente do PC"),
  msstore: N("Microsoft Store"),
  "android-app": N("The Android app", "La app de Android", "O app Android"), "ios-app": N("The iPhone app", "La app de iPhone", "O app iPhone"),
  iracing: N("iRacing forums", "Foros de iRacing", "Fóruns do iRacing"), google: N("Google"), bing: N("Bing"), duckduckgo: N("DuckDuckGo"), yahoo: N("Yahoo"),
  yandex: N("Yandex"), baidu: N("Baidu"), ecosia: N("Ecosia"), brave: N("Brave Search"), qwant: N("Qwant"), chatgpt: N("ChatGPT"), perplexity: N("Perplexity"),
  claude: N("Claude"), gemini: N("Gemini"), copilot: N("Copilot"), reddit: N("Reddit"), discord: N("Discord"), youtube: N("YouTube"), facebook: N("Facebook"),
  instagram: N("Instagram"), x: N("X (Twitter)"), tiktok: N("TikTok"), twitch: N("Twitch"), steam: N("Steam"), overtake: N("OverTake"), simhub: N("SimHub"),
  github: N("GitHub"), whatsapp: N("WhatsApp"), telegram: N("Telegram"), linkedin: N("LinkedIn"), gmail: N("Gmail"),
};
export const KIND_NAMES = {
  search: N("Search", "Buscador", "Busca"), ai: N("AI assistant", "Asistente de IA", "Assistente de IA"), community: N("Community", "Comunidad", "Comunidade"),
  social: N("Social", "Redes sociales", "Redes sociais"), direct: N("Direct", "Directo", "Direto"), app: N("App"), other: N("Other site", "Otra web", "Outro site"),
  unknown: N("Not known", "Sin saber", "Desconhecido"), store: N("App store", "Tienda de apps", "Loja de apps"),
};
export const srcName = (s) => SRC_NAMES[s] || N(s);
export const GAME_NAMES = { iracing: "iRacing", lmu: "Le Mans Ultimate", acc: "ACC", ac: "Assetto Corsa" };
const gameName = (g) => GAME_NAMES[g] || g;

/** One sentence of What stands out from its key and numbers, [en, es, pt]. */
export function hiText(k, a) {
  const s = (x) => srcName(x);
  switch (k) {
    case "active_more": return [`${a[0]} drivers were active in these ${a[1]} days, ${a[2]} more than in the ${a[1]} before.`, `${a[0]} pilotos estuvieron activos en estos ${a[1]} días, ${a[2]} más que en los ${a[1]} anteriores.`, `${a[0]} pilotos estiveram ativos nestes ${a[1]} dias, ${a[2]} a mais que nos ${a[1]} anteriores.`];
    case "active_fewer": return [`${a[0]} drivers were active in these ${a[1]} days, ${a[2]} fewer than in the ${a[1]} before.`, `${a[0]} pilotos estuvieron activos en estos ${a[1]} días, ${a[2]} menos que en los ${a[1]} anteriores.`, `${a[0]} pilotos estiveram ativos nestes ${a[1]} dias, ${a[2]} a menos que nos ${a[1]} anteriores.`];
    case "active_first": return [`${a[0]} drivers were active in these ${a[1]} days, and ${a[2]} accounts were made.`, `${a[0]} pilotos estuvieron activos en estos ${a[1]} días y se crearon ${a[2]} cuentas.`, `${a[0]} pilotos estiveram ativos nestes ${a[1]} dias e foram criadas ${a[2]} contas.`];
    case "no_app": return [`${a[0]} of the ${a[1]} new accounts (${a[2]}%) never opened an app.`, `${a[0]} de las ${a[1]} cuentas nuevas (${a[2]}%) nunca abrieron una app.`, `${a[0]} das ${a[1]} contas novas (${a[2]}%) nunca abriram um app.`];
    case "no_drive": return [`${a[0]} of the ${a[1]} new accounts (${a[2]}%) never drove with the agent.`, `${a[0]} de las ${a[1]} cuentas nuevas (${a[2]}%) nunca condujeron con el agente.`, `${a[0]} das ${a[1]} contas novas (${a[2]}%) nunca dirigiram com o agente.`];
    case "coach_low": return [`Only ${a[0]} of the ${a[1]} active drivers used the coach, while ${a[2]} looked at their laps.`, `Solo ${a[0]} de los ${a[1]} pilotos activos usaron el coach, mientras ${a[2]} miraron sus vueltas.`, `Só ${a[0]} dos ${a[1]} pilotos ativos usaram o coach, enquanto ${a[2]} olharam suas voltas.`];
    case "top_signups": return [`Most new accounts came from ${s(a[0])[0]} (${a[1]}).`, `La mayoría de las cuentas nuevas vinieron de ${s(a[0])[1]} (${a[1]}).`, `A maioria das contas novas veio de ${s(a[0])[2]} (${a[1]}).`];
    case "top_visits": return [`Most visits came from ${s(a[0])[0]} (${a[1]} of ${a[2]}).`, `La mayoría de las visitas vinieron de ${s(a[0])[1]} (${a[1]} de ${a[2]}).`, `A maioria das visitas veio de ${s(a[0])[2]} (${a[1]} de ${a[2]}).`];
    case "games": return [`${gameName(a[0])} drivers run ${a[1]} sessions each, ${gameName(a[2])} drivers ${a[3]}.`, `Los pilotos de ${gameName(a[0])} hacen ${a[1]} sesiones cada uno, los de ${gameName(a[2])} ${a[3]}.`, `Os pilotos de ${gameName(a[0])} fazem ${a[1]} sessões cada, os de ${gameName(a[2])} ${a[3]}.`];
    case "no_android": return [`No Android phone opened the app in these ${a[0]} days.`, `Ningún móvil Android abrió la app en estos ${a[0]} días.`, `Nenhum celular Android abriu o app nestes ${a[0]} dias.`];
    case "no_ios": return [`No iPhone opened the app in these ${a[0]} days.`, `Ningún iPhone abrió la app en estos ${a[0]} días.`, `Nenhum iPhone abriu o app nestes ${a[0]} dias.`];
    case "behind": return [`${a[0]} devices seen this week are not on the newest version.`, `${a[0]} dispositivos vistos esta semana no tienen la versión más nueva.`, `${a[0]} dispositivos vistos esta semana não estão na versão mais nova.`];
    case "uninstalls": return [`The agent was uninstalled ${a[0]} times in these ${a[1]} days.`, `El agente se desinstaló ${a[0]} veces en estos ${a[1]} días.`, `O agente foi desinstalado ${a[0]} vezes nestes ${a[1]} dias.`];
    case "uninstalls_why": { const r = REASONS[a[2]] || REASONS.other; return [`The agent was uninstalled ${a[0]} times in these ${a[1]} days, most often because "${r.en}".`, `El agente se desinstaló ${a[0]} veces en estos ${a[1]} días, sobre todo por "${r.es}".`, `O agente foi desinstalado ${a[0]} vezes nestes ${a[1]} dias, mais por "${r.pt}".`]; }
    case "donations": return [`${a[0]} donations came in through Stripe in these ${a[1]} days.`, `Llegaron ${a[0]} donaciones por Stripe en estos ${a[1]} días.`, `Chegaram ${a[0]} doações pelo Stripe nestes ${a[1]} dias.`];
    default: return null;
  }
}
