// The privacy policy (/privacy), the terms of service (/terms) and how to delete an account (/delete-account): the
// addresses app stores and Google's sign-in ask for.
// English, Spanish or Portuguese by ?lang= or the browser's language. Plain text, what is kept and why, never how it
// is stored or protected (the product rules).
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const MAIL = "support@pitlanehq.app";
const UPDATED = "2026-11-15";

const PRIVACY = {
  en: { title: "Privacy policy", up: "Last updated", intro: "Pitlane HQ is a free app for sim racing drivers. This page says what it keeps about you, why and for how long.",
    s: [
      ["What we keep", [
        "Your account. Your email address, your nickname and the language you chose.",
        "Your laps and sessions. The Pitlane HQ Agent on your PC uploads the laps you drive in iRacing and Le Mans Ultimate, with their times and telemetry, so you can see them on the web and the phone apps.",
        "Laps without an account. If you use the Pitlane HQ Agent without an account, it still uploads the laps you drive, with their times and telemetry, so the coach learns from them. They are kept under a random id of that installation, with no name and no email, and nobody sees them. If you create an account or sign in on that PC, they become part of your account.",
        "What you share. Laps on the leaderboards, track notes, league posts and support messages, under your nickname or as an anonymous driver if you choose so.",
        "Linked accounts. When you sign in with Steam or Discord or link them, their account id and name, to sign you in and show them where you choose.",
        "The apps' use. Which screens are opened each day, error reports when an app fails and the logs you send from the support chat, to fix problems.",
        "Notifications. With notifications turned on in a phone, a token from Google Firebase (Android) or Apple (iPhone) so the server can wake that phone when there is something new. The message only says there is something new and the phone reads it from Pitlane HQ.",
      ]],
      ["What we do not do", ["We do not sell your data, show ads or share your data with advertisers.", "We never send reminders or summaries by email. Emails are only for your account (confirming the address, signing in, a new password)."]],
      ["Who helps us run it", ["Cloudflare hosts the server, the database and the downloads.", "Resend sends the account emails.", "Google Firebase and Apple deliver the phone notifications when you turn them on.", "Steam and Discord, only when you sign in with them or link them."]],
      ["How long we keep it", ["Your account and its data stay until you delete the account.", "Laps uploaded without an account are deleted after 180 days unless they have joined an account by then. What the coach model learnt from them stays, without any name.", "Notifications are kept 30 days, phone tokens until notifications are turned off or 270 days without use, error reports 30 days."]],
      ["Deleting your account", ["You can delete your account at any time in the app (Account → Delete account) or as explained at <a href=\"/delete-account\">pitlanehq.app/delete-account</a>. Deleting it removes the account, your synced data, your devices and your race analyses. Your laps on the leaderboard and the laps the coach model learns from stay, as an anonymous driver without your name."]],
      ["Children", ["Pitlane HQ is not meant for children under 13 and does not knowingly keep data about them."]],
      ["Contact", [`Questions about your data go to <a href="mailto:${MAIL}">${MAIL}</a>. We may update this page and the date at the top says when it last changed.`]],
    ] },
  es: { title: "Política de privacidad", up: "Última actualización", intro: "Pitlane HQ es una app gratuita para pilotos de sim racing. Esta página dice qué guarda sobre ti, para qué y durante cuánto tiempo.",
    s: [
      ["Qué guardamos", [
        "Tu cuenta. Tu email, tu apodo y el idioma que elegiste.",
        "Tus vueltas y sesiones. Pitlane HQ Agent en tu PC sube las vueltas que das en iRacing y Le Mans Ultimate, con sus tiempos y su telemetría, para que las veas en la web y en las apps del móvil.",
        "Vueltas sin cuenta. Si usas Pitlane HQ Agent sin una cuenta, también sube las vueltas que das, con sus tiempos y su telemetría, para que el coach aprenda de ellas. Se guardan bajo un identificador aleatorio de esa instalación, sin nombre ni email, y nadie las ve. Si creas una cuenta o inicias sesión en ese PC, pasan a formar parte de tu cuenta.",
        "Lo que compartes. Vueltas en las leaderboards, notas de circuito, publicaciones de ligas y mensajes de soporte, con tu apodo o como piloto anónimo si lo eliges.",
        "Cuentas vinculadas. Si inicias sesión con Steam o Discord o los vinculas, su id y su nombre, para iniciar sesión y mostrarlos donde elijas.",
        "El uso de las apps. Qué pantallas se abren cada día, informes de error cuando una app falla y los logs que envías desde el chat de soporte, para arreglar problemas.",
        "Notificaciones. Con las notificaciones activadas en un móvil, un token de Google Firebase (Android) o de Apple (iPhone) para que el servidor pueda avisar a ese móvil cuando hay algo nuevo. El mensaje solo dice que hay algo nuevo y el móvil lo lee de Pitlane HQ.",
      ]],
      ["Qué no hacemos", ["No vendemos tus datos, no mostramos anuncios ni compartimos tus datos con anunciantes.", "Nunca enviamos recordatorios ni resúmenes por email. Los emails son solo para tu cuenta (confirmar la dirección, iniciar sesión, una contraseña nueva)."]],
      ["Quién nos ayuda", ["Cloudflare aloja el servidor, la base de datos y las descargas.", "Resend envía los emails de la cuenta.", "Google Firebase y Apple entregan las notificaciones del móvil cuando las activas.", "Steam y Discord, solo cuando inicias sesión con ellos o los vinculas."]],
      ["Cuánto tiempo lo guardamos", ["Tu cuenta y sus datos se quedan hasta que borras la cuenta.", "Las vueltas subidas sin cuenta se borran a los 180 días si para entonces no se han unido a una cuenta. Lo que el modelo del coach aprendió de ellas se queda, sin ningún nombre.", "Los avisos se guardan 30 días, los tokens del móvil hasta que desactivas las notificaciones o 270 días sin uso, los informes de error 30 días."]],
      ["Borrar tu cuenta", ["Puedes borrar tu cuenta cuando quieras en la app (Cuenta → Borrar cuenta) o como se explica en <a href=\"/delete-account?lang=es\">pitlanehq.app/delete-account</a>. Al borrarla se van la cuenta, tus datos sincronizados, tus dispositivos y tus análisis de carrera. Tus vueltas en la leaderboard y las vueltas de las que aprende el modelo del coach se quedan, como un piloto anónimo sin tu nombre."]],
      ["Menores", ["Pitlane HQ no está pensada para menores de 13 años y no guarda a sabiendas datos sobre ellos."]],
      ["Contacto", [`Las preguntas sobre tus datos van a <a href="mailto:${MAIL}">${MAIL}</a>. Podemos actualizar esta página y la fecha de arriba dice cuándo cambió por última vez.`]],
    ] },
  pt: { title: "Política de privacidade", up: "Última atualização", intro: "O Pitlane HQ é um app gratuito para pilotos de sim racing. Esta página diz o que ele guarda sobre você, para quê e por quanto tempo.",
    s: [
      ["O que guardamos", [
        "Sua conta. Seu email, seu apelido e o idioma que você escolheu.",
        "Suas voltas e sessões. O Pitlane HQ Agent no seu PC envia as voltas que você dá no iRacing e no Le Mans Ultimate, com os tempos e a telemetria, para você vê-las na web e nos apps do celular.",
        "Voltas sem conta. Se você usa o Pitlane HQ Agent sem uma conta, ele também envia as voltas que você dá, com seus tempos e sua telemetria, para o coach aprender com elas. Elas ficam sob um identificador aleatório daquela instalação, sem nome nem email, e ninguém as vê. Se você criar uma conta ou entrar nesse PC, elas passam a fazer parte da sua conta.",
        "O que você compartilha. Voltas nas classificações, notas de pista, publicações de ligas e mensagens de suporte, com seu apelido ou como piloto anônimo se você escolher.",
        "Contas vinculadas. Se você entrar com Steam ou Discord ou vinculá-los, o id e o nome delas, para entrar e mostrá-las onde você escolher.",
        "O uso dos apps. Quais telas são abertas por dia, relatórios de erro quando um app falha e os logs que você envia pelo chat de suporte, para corrigir problemas.",
        "Notificações. Com as notificações ativadas em um celular, um token do Google Firebase (Android) ou da Apple (iPhone) para o servidor poder avisar esse celular quando houver algo novo. A mensagem só diz que há algo novo e o celular lê do Pitlane HQ.",
      ]],
      ["O que não fazemos", ["Não vendemos seus dados, não mostramos anúncios nem compartilhamos seus dados com anunciantes.", "Nunca enviamos lembretes nem resumos por email. Os emails são só para sua conta (confirmar o endereço, entrar, uma nova senha)."]],
      ["Quem nos ajuda", ["A Cloudflare hospeda o servidor, o banco de dados e os downloads.", "A Resend envia os emails da conta.", "O Google Firebase e a Apple entregam as notificações do celular quando você as ativa.", "Steam e Discord, só quando você entra com eles ou os vincula."]],
      ["Por quanto tempo guardamos", ["Sua conta e seus dados ficam até você apagar a conta.", "As voltas enviadas sem conta são apagadas depois de 180 dias se até lá não tiverem entrado em uma conta. O que o modelo do coach aprendeu com elas fica, sem nenhum nome.", "Os avisos ficam 30 dias, os tokens do celular até você desativar as notificações ou 270 dias sem uso, os relatórios de erro 30 dias."]],
      ["Apagar sua conta", ["Você pode apagar sua conta quando quiser no app (Conta → Apagar conta) ou como explicado em <a href=\"/delete-account?lang=pt\">pitlanehq.app/delete-account</a>. Ao apagá-la vão a conta, seus dados sincronizados, seus dispositivos e suas análises de corrida. Suas voltas na classificação e as voltas com que o modelo do coach aprende ficam, como um piloto anônimo sem seu nome."]],
      ["Crianças", ["O Pitlane HQ não é feito para menores de 13 anos e não guarda conscientemente dados sobre eles."]],
      ["Contato", [`Perguntas sobre seus dados vão para <a href="mailto:${MAIL}">${MAIL}</a>. Podemos atualizar esta página e a data no topo diz quando ela mudou pela última vez.`]],
    ] },
};

const TERMS = {
  en: { title: "Terms of service", intro: "These terms apply when you use Pitlane HQ, the web at pitlanehq.app, the phone apps and Pitlane HQ Agent. By using it you agree to them.",
    s: [
      ["The service", ["Pitlane HQ is free during the beta. It records your sim racing laps, analyses them and shows them on your devices. Features can change, arrive or go away while it is in beta."]],
      ["Your account", ["You can sign up with an email or with Steam or Discord. Keep your sign-in to yourself. You are responsible for what is done with your account.", "You must be at least 13 years old to use Pitlane HQ."]],
      ["What you share", ["Laps, notes, league posts and messages you share stay yours. You let Pitlane HQ show them where you chose to share them.", "Do not post anything illegal, hateful, abusive or that is not yours to share, and do not cheat on the leaderboards. We can remove such content and close accounts that break these terms."]],
      ["Our work", ["Pitlane HQ, its apps, code, coach, designs, texts, name and logo belong to Pitlane HQ and are protected by copyright and trademark law. Using the apps does not give you any right to them.", "Do not copy, modify, decompile, disassemble or reverse engineer the apps or their code, make apps or services based on them, or use the Pitlane HQ name or logo, without our written permission. Copies we find are taken down."]],
      ["Fair use", ["Do not try to break, overload or reverse engineer the service, read other people's data or use it to send spam."]],
      ["Games and other companies", ["Pitlane HQ is not made by or linked to iRacing, Motorsport Games, Studio 397, Valve, Discord or Google. Their names and games belong to their owners."]],
      ["No warranty", ["Pitlane HQ is given as it is, without any warranty. It can have bugs or be down at times. As far as the law allows, we are not liable for any loss that comes from using it."]],
      ["Ending", [`You can delete your account at any time, as explained at <a href="/delete-account">pitlanehq.app/delete-account</a>. How we handle your data is in the <a href="/privacy">privacy policy</a>.`]],
      ["Changes and contact", [`We can update these terms and the date at the top says when they last changed. Questions go to <a href="mailto:${MAIL}">${MAIL}</a>.`]],
    ] },
  es: { title: "Términos del servicio", intro: "Estos términos se aplican cuando usas Pitlane HQ, la web en pitlanehq.app, las apps del móvil y Pitlane HQ Agent. Al usarlo los aceptas.",
    s: [
      ["El servicio", ["Pitlane HQ es gratis durante la beta. Guarda tus vueltas de sim racing, las analiza y te las muestra en tus dispositivos. Las funciones pueden cambiar, llegar o irse mientras está en beta."]],
      ["Tu cuenta", ["Puedes registrarte con un email o con Steam o Discord. No compartas tu acceso. Eres responsable de lo que se haga con tu cuenta.", "Tienes que tener al menos 13 años para usar Pitlane HQ."]],
      ["Lo que compartes", ["Las vueltas, notas, publicaciones de ligas y mensajes que compartes siguen siendo tuyos. Permites que Pitlane HQ los muestre donde elegiste compartirlos.", "No publiques nada ilegal, de odio, abusivo o que no sea tuyo, y no hagas trampas en las leaderboards. Podemos quitar ese contenido y cerrar las cuentas que incumplan estos términos."]],
      ["Nuestro trabajo", ["Pitlane HQ, sus apps, código, coach, diseños, textos, nombre y logo pertenecen a Pitlane HQ y están protegidos por las leyes de propiedad intelectual y de marcas. Usar las apps no te da ningún derecho sobre ellos.", "No copies, modifiques, descompiles, desensambles ni hagas ingeniería inversa de las apps o de su código, no hagas apps o servicios basados en ellos y no uses el nombre o el logo de Pitlane HQ sin nuestro permiso por escrito. Las copias que encontremos se retiran."]],
      ["Uso justo", ["No intentes romper, saturar o hacer ingeniería inversa del servicio, leer datos de otras personas ni usarlo para enviar spam."]],
      ["Juegos y otras empresas", ["Pitlane HQ no está hecho por iRacing, Motorsport Games, Studio 397, Valve, Discord ni Google, ni vinculado a ellos. Sus nombres y juegos son de sus dueños."]],
      ["Sin garantía", ["Pitlane HQ se ofrece tal cual, sin ninguna garantía. Puede tener errores o no estar disponible a veces. En lo que permita la ley, no respondemos de pérdidas que vengan de usarlo."]],
      ["Baja", [`Puedes borrar tu cuenta cuando quieras, como se explica en <a href="/delete-account?lang=es">pitlanehq.app/delete-account</a>. Cómo tratamos tus datos está en la <a href="/privacy?lang=es">política de privacidad</a>.`]],
      ["Cambios y contacto", [`Podemos actualizar estos términos y la fecha de arriba dice cuándo cambiaron por última vez. Las preguntas van a <a href="mailto:${MAIL}">${MAIL}</a>.`]],
    ] },
  pt: { title: "Termos de serviço", intro: "Estes termos valem quando você usa o Pitlane HQ, a web em pitlanehq.app, os apps de celular e o Pitlane HQ Agent. Ao usá-lo você os aceita.",
    s: [
      ["O serviço", ["O Pitlane HQ é grátis durante o beta. Ele guarda suas voltas de sim racing, analisa e mostra nos seus dispositivos. Os recursos podem mudar, chegar ou sair enquanto ele está em beta."]],
      ["Sua conta", ["Você pode se cadastrar com um email ou com Steam ou Discord. Não compartilhe seu acesso. Você é responsável pelo que é feito com sua conta.", "Você precisa ter pelo menos 13 anos para usar o Pitlane HQ."]],
      ["O que você compartilha", ["Voltas, notas, posts de ligas e mensagens que você compartilha continuam sendo seus. Você permite que o Pitlane HQ os mostre onde escolheu compartilhá-los.", "Não publique nada ilegal, de ódio, abusivo ou que não seja seu, e não trapaceie nas classificações. Podemos remover esse conteúdo e encerrar contas que descumpram estes termos."]],
      ["Nosso trabalho", ["O Pitlane HQ, seus apps, código, coach, designs, textos, nome e logo pertencem ao Pitlane HQ e são protegidos pelas leis de direitos autorais e de marcas. Usar os apps não lhe dá nenhum direito sobre eles.", "Não copie, modifique, descompile, desmonte nem faça engenharia reversa dos apps ou do seu código, não crie apps ou serviços baseados neles e não use o nome ou o logo do Pitlane HQ sem nossa permissão por escrito. As cópias que encontrarmos são retiradas."]],
      ["Uso justo", ["Não tente quebrar, sobrecarregar ou fazer engenharia reversa do serviço, ler dados de outras pessoas nem usá-lo para enviar spam."]],
      ["Jogos e outras empresas", ["O Pitlane HQ não é feito pela iRacing, Motorsport Games, Studio 397, Valve, Discord ou Google, nem ligado a elas. Seus nomes e jogos pertencem aos donos."]],
      ["Sem garantia", ["O Pitlane HQ é oferecido como está, sem nenhuma garantia. Ele pode ter erros ou ficar fora do ar às vezes. Até onde a lei permite, não respondemos por perdas que venham do seu uso."]],
      ["Encerramento", [`Você pode apagar sua conta quando quiser, como explicado em <a href="/delete-account?lang=pt">pitlanehq.app/delete-account</a>. Como tratamos seus dados está na <a href="/privacy?lang=pt">política de privacidade</a>.`]],
      ["Mudanças e contato", [`Podemos atualizar estes termos e a data no topo diz quando mudaram pela última vez. Perguntas vão para <a href="mailto:${MAIL}">${MAIL}</a>.`]],
    ] },
};

const DELETE = {
  en: { title: "Delete your Pitlane HQ account", steps: [
      "In the phone app, open Account, write your password under Delete account and tap Delete.",
      "Or on the web, open <a href=\"/\">pitlanehq.app</a>, sign in, open Account and use Delete account at the bottom.",
      `If you can no longer sign in, write to <a href="mailto:${MAIL}?subject=Delete%20my%20account">${MAIL}</a> from the email of your account and we delete it within 30 days.`],
    h1: "How to delete it", h2: "What is deleted and what stays",
    what: ["The account, your email, your synced data, your devices, your race analyses, your notifications and linked Steam or Discord accounts are deleted at once.", "Your laps on the leaderboard and the laps the coach model learns from stay, as an anonymous driver without your name.", "The data on your PC stays until you uninstall Pitlane HQ Agent from it. Uninstalling removes all of it from the PC."],
    more: "More in the <a href=\"/privacy\">privacy policy</a>." },
  es: { title: "Borrar tu cuenta de Pitlane HQ", steps: [
      "En la app del móvil, abre Cuenta, escribe tu contraseña en Borrar cuenta y toca Borrar.",
      "O en la web, abre <a href=\"/\">pitlanehq.app</a>, inicia sesión, abre Cuenta y usa Borrar cuenta al final.",
      `Si ya no puedes iniciar sesión, escribe a <a href="mailto:${MAIL}?subject=Borrar%20mi%20cuenta">${MAIL}</a> desde el email de tu cuenta y la borramos en 30 días como mucho.`],
    h1: "Cómo borrarla", h2: "Qué se borra y qué se queda",
    what: ["La cuenta, tu email, tus datos sincronizados, tus dispositivos, tus análisis de carrera, tus avisos y las cuentas de Steam o Discord vinculadas se borran al momento.", "Tus vueltas en la leaderboard y las vueltas de las que aprende el modelo del coach se quedan, como un piloto anónimo sin tu nombre.", "Los datos de tu PC se quedan hasta que desinstales Pitlane HQ Agent de él. Al desinstalarlo se borra todo del PC."],
    more: "Más en la <a href=\"/privacy?lang=es\">política de privacidad</a>." },
  pt: { title: "Apagar sua conta do Pitlane HQ", steps: [
      "No app do celular, abra Conta, escreva sua senha em Apagar conta e toque em Apagar.",
      "Ou na web, abra <a href=\"/\">pitlanehq.app</a>, entre, abra Conta e use Apagar conta no final.",
      `Se você não consegue mais entrar, escreva para <a href="mailto:${MAIL}?subject=Apagar%20minha%20conta">${MAIL}</a> do email da sua conta e nós a apagamos em até 30 dias.`],
    h1: "Como apagá-la", h2: "O que é apagado e o que fica",
    what: ["A conta, seu email, seus dados sincronizados, seus dispositivos, suas análises de corrida, seus avisos e as contas de Steam ou Discord vinculadas são apagados na hora.", "Suas voltas na classificação e as voltas com que o modelo do coach aprende ficam, como um piloto anônimo sem seu nome.", "Os dados do seu PC ficam até você desinstalar o Pitlane HQ Agent dele. A desinstalação apaga tudo do PC."],
    more: "Mais na <a href=\"/privacy?lang=pt\">política de privacidade</a>." },
};

/** en, es or pt: ?lang= first, else the browser's first language that is one of them. */
export function legalLang(req, url) {
  const q = (url.searchParams.get("lang") || "").slice(0, 2).toLowerCase();
  if (PRIVACY[q]) return q;
  for (const part of (req.headers.get("accept-language") || "").toLowerCase().split(",")) { const l = part.trim().slice(0, 2); if (PRIVACY[l]) return l; }
  return "en";
}

const LN = { en: "English", es: "Español", pt: "Português" };
// the page's description for search engines: its first lines, plain, cut at a word near 155 characters
const descOf = (t) => { t = String(t || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(); return t.length <= 155 ? t : t.slice(0, t.lastIndexOf(" ", 152)) + "…"; };
const shell = (l, path, title, body, desc) => `<!doctype html><html lang="${l === "pt" ? "pt-BR" : l}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · Pitlane HQ</title><meta name="description" content="${esc(descOf(desc))}"><link rel="canonical" href="https://pitlanehq.app${path}${l === "en" ? "" : "?lang=" + l}"><link rel="icon" href="/favicon.ico" sizes="any">
<style>body{margin:0;background:#11151b;color:#e7ebf1;font:16px/1.6 system-ui,sans-serif}main{max-width:760px;margin:0 auto;padding:28px 16px 48px}h1{font-size:26px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 8px;color:#ffb02e}p{color:#a9b4c3;margin:6px 0}ul,ol{padding-left:20px;color:#c9d2de}li{margin:6px 0}a{color:#ffb02e}.m{color:#8a97a9;font-size:13px}.top{display:flex;align-items:center;gap:10px;margin-bottom:18px}.top b{font-size:15px;letter-spacing:.06em}.top img{width:28px;height:28px;border-radius:7px}</style></head><body>
<main><div class="top"><img src="/icon-192.png" alt=""><b>PITLANE HQ</b></div>${body}<p class="m" style="margin-top:28px">${Object.keys(LN).map((k) => `<a href="${path}?lang=${k}" hreflang="${k}">${LN[k]}</a>`).join(" · ")}</p></main></body></html>`;

export function privacyPage(l) {
  const p = PRIVACY[l] || PRIVACY.en;
  return shell(l, "/privacy", p.title, `<h1>${esc(p.title)}</h1><p class="m">${esc(p.up)} ${UPDATED}</p><p>${esc(p.intro)}</p>` +
    p.s.map(([h, items]) => `<h2>${esc(h)}</h2>` + (items.length > 1 ? `<ul>${items.map((x) => `<li>${x}</li>`).join("")}</ul>` : `<p>${items[0]}</p>`)).join(""), p.intro);
}

export function termsPage(l) {
  const p = TERMS[l] || TERMS.en, up = (PRIVACY[l] || PRIVACY.en).up;
  return shell(l, "/terms", p.title, `<h1>${esc(p.title)}</h1><p class="m">${esc(up)} ${UPDATED}</p><p>${esc(p.intro)}</p>` +
    p.s.map(([h, items]) => `<h2>${esc(h)}</h2>` + items.map((x) => `<p>${x}</p>`).join("")).join(""), p.intro);
}

export function deletePage(l) {
  const d = DELETE[l] || DELETE.en;
  return shell(l, "/delete-account", d.title, `<h1>${esc(d.title)}</h1><h2>${esc(d.h1)}</h2><ol>${d.steps.map((x) => `<li>${x}</li>`).join("")}</ol><h2>${esc(d.h2)}</h2><ul>${d.what.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><p>${d.more}</p>`, d.what[0]);
}

/** GET /privacy, /terms and /delete-account, or null for any other address. */
export function legal(req, url) {
  const p = url.pathname.replace(/\/+$/, "");
  const page = { "/privacy": privacyPage, "/terms": termsPage, "/delete-account": deletePage }[p];
  if (!page) return null;
  const l = legalLang(req, url);
  return new Response(page(l), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600", vary: "Accept-Language" } });
}
