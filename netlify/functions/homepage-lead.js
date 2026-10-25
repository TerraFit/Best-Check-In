import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { supabaseInsert } from './lib/supabase-rest.js';

const MARKETING_BUCKET = 'fastcheckin-marketing';
const SIGNED_URL_EXPIRES_IN = 300;
const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const clean = (value, max = 300) => String(value ?? '').trim().slice(0, max);
const escapeHtml = value => clean(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#039;');
const jsonResponse = (statusCode, body) => ({ statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) });

async function verifyTurnstile(token, event, expectedAction) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok:false, error:'CAPTCHA is temporarily unavailable. Please try again later.' };
  if (!token || typeof token !== 'string' || token.length > 2048) return { ok:false, error:'Please complete the CAPTCHA verification.' };
  const remoteip = event?.headers?.['x-forwarded-for']?.split(',')[0]?.trim();
  const payload = new URLSearchParams({ secret, response: token });
  if (remoteip) payload.set('remoteip', remoteip);
  if (process.env.TURNSTILE_SITE_KEY) payload.set('sitekey', process.env.TURNSTILE_SITE_KEY);
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{ method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:payload.toString(), signal:AbortSignal.timeout(5000) });
    const result = await response.json();
    if (!response.ok || !result.success) return { ok:false, error:'CAPTCHA verification failed. Please try again.' };
    const hosts = (process.env.TURNSTILE_ALLOWED_HOSTNAMES || '').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
    if (!result.hostname || !hosts.includes(String(result.hostname).toLowerCase()) || result.action !== expectedAction) return { ok:false, error:'CAPTCHA verification failed. Please try again.' };
    return { ok:true };
  } catch (error) { console.error('Turnstile verification request failed:',error); return { ok:false, error:'CAPTCHA verification is temporarily unavailable. Please try again.' }; }
}

function validateLead(lead) {
  const fields=['fullName','companyName','email','telephone','address'];
  if (!lead || fields.some(field=>!clean(lead[field]))) return 'Please complete all required fields.';
  if (!/^\S+@\S+\.\S+$/.test(clean(lead.email))) return 'Please enter a valid email address.';
  return null;
}

async function sendEmail({ to, subject, html, reportRecipientError = false }) {
  if (!process.env.RESEND_API_KEY) { console.warn('RESEND_API_KEY is not configured.'); return false; }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({ from:'FastCheckin <notifications@fastcheckin.co.za>', to:Array.isArray(to)?to:[to], subject, html });
    if (result?.error) {
      console.error('Resend returned an error:',result.error);
      const message = `${result.error.message || ''} ${result.error.name || ''}`;
      if (reportRecipientError && /invalid recipient|invalid email|email address.*invalid|recipient.*invalid/i.test(message)) return { sent:false, invalidRecipient:true };
      return false;
    }
    return true;
  } catch (error) { console.error('Email send failed:',error); return false; }
}

async function notifyLead(lead, document) {
  const labels={brochure:'FastCheckIn Brochure','visitor-origin':'Visitor Origin Explorer Snapshot','business-snapshot':'Business Snapshot'};
  const documentLabel=labels[document] || 'FastCheckIn resource';
  const html='<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><h2>FastCheckIn resource request</h2><p><strong>Resource:</strong> '+documentLabel+'</p><p><strong>Name:</strong> '+escapeHtml(lead.fullName)+'</p><p><strong>Company / hotel:</strong> '+escapeHtml(lead.companyName)+'</p><p><strong>Email:</strong> '+escapeHtml(lead.email)+'</p><p><strong>Telephone:</strong> '+escapeHtml(lead.telephone)+'</p><p><strong>Address:</strong> '+escapeHtml(lead.address)+'</p></div>';
  return sendEmail({ to:process.env.FASTCHECKIN_INQUIRY_EMAIL || 'inquiry@fastcheckin.co.za', subject:'Homepage resource request: '+documentLabel, html });
}

const BROCHURE_EMAIL_COPY = {
  en:{subject:'Thank you for your interest in FastCheckIn',tagline:'Hospitality, connected',eyebrow:'FastCheckIn',heading:'Turn every guest check-in into',highlight:'better business intelligence.',dear:'Dear',thanks:'Thank you for your interest in FastCheckIn. We hope the brochure gives you a clear picture of how digital check-in, guest information, hotel operations and business intelligence can work together to help your property make smarter decisions.',explore:'Explore the platform, compare the available packages, and when you are ready, let us show you FastCheckIn in action with a personal demonstration.',brochure:'Open / download brochure',compare:'Compare packages',note:'The brochure opens online and includes',print:'Print / Save as PDF',download:'Download HTML',question:'Would you like to see what FastCheckIn can do for your property?',demo:'Book a demonstration',call:'Request a phone call',online:'explore FastCheckIn online',anytime:'at any time.',closing:'Kind regards',team:'The FastCheckIn Team'},
  af:{subject:'Dankie vir u belangstelling in FastCheckIn',tagline:'Gasvryheid, verbind',eyebrow:'FastCheckIn',heading:'Maak van elke gaste-inboek ’n',highlight:'beter bron van sake-intelligensie.',dear:'Geagte',thanks:'Dankie vir u belangstelling in FastCheckIn. Ons hoop die brosjure gee u ’n duidelike beeld van hoe digitale inboek, gaste-inligting, hotelbedrywighede en sake-intelligensie kan saamwerk om u eiendom te help om slimmer besluite te neem.',explore:'Verken die platform, vergelyk die beskikbare pakkette, en wanneer u gereed is, wys ons u graag FastCheckIn in aksie met ’n persoonlike demonstrasie.',brochure:'Open / laai brosjure af',compare:'Vergelyk pakkette',note:'Die brosjure maak aanlyn oop en sluit',print:'Druk / Stoor as PDF',download:'Laai HTML af',question:'Wil u sien wat FastCheckIn vir u eiendom kan doen?',demo:'Bespreek ’n demonstrasie',call:'Versoek ’n telefoonoproep',online:'verken FastCheckIn aanlyn',anytime:'wanneer u wil.',closing:'Vriendelike groete',team:'Die FastCheckIn-span'},
  de:{subject:'Vielen Dank für Ihr Interesse an FastCheckIn',tagline:'Gastfreundschaft, vernetzt',eyebrow:'FastCheckIn',heading:'Machen Sie aus jedem Check-in',highlight:'bessere Geschäftsinformationen.',dear:'Guten Tag',thanks:'Vielen Dank für Ihr Interesse an FastCheckIn. Wir hoffen, dass die Broschüre Ihnen zeigt, wie digitaler Check-in, Gästeinformationen, Hotelbetrieb und Business Intelligence zusammenwirken können, damit Ihre Unterkunft bessere Entscheidungen trifft.',explore:'Entdecken Sie die Plattform, vergleichen Sie die verfügbaren Pakete und lassen Sie sich FastCheckIn in einer persönlichen Demonstration zeigen, sobald Sie bereit sind.',brochure:'Broschüre öffnen / herunterladen',compare:'Pakete vergleichen',note:'Die Broschüre öffnet sich online und enthält Optionen zum',print:'Drucken / Als PDF speichern',download:'HTML herunterladen',question:'Möchten Sie sehen, was FastCheckIn für Ihre Unterkunft leisten kann?',demo:'Demonstration buchen',call:'Rückruf anfordern',online:'FastCheckIn online erkunden',anytime:'jederzeit.',closing:'Mit freundlichen Grüßen',team:'Das FastCheckIn-Team'},
  fr:{subject:'Merci pour votre intérêt pour FastCheckIn',tagline:'L’hospitalité, connectée',eyebrow:'FastCheckIn',heading:'Transformez chaque arrivée en',highlight:'meilleure intelligence commerciale.',dear:'Bonjour',thanks:'Merci pour votre intérêt pour FastCheckIn. Nous espérons que la brochure vous donnera une vision claire de la façon dont le check-in numérique, les informations sur les clients, les opérations hôtelières et la business intelligence peuvent fonctionner ensemble pour aider votre établissement à prendre de meilleures décisions.',explore:'Découvrez la plateforme, comparez les offres disponibles et, lorsque vous serez prêt, laissez-nous vous présenter FastCheckIn en action lors d’une démonstration personnalisée.',brochure:'Ouvrir / télécharger la brochure',compare:'Comparer les offres',note:'La brochure s’ouvre en ligne et comprend les options',print:'Imprimer / enregistrer en PDF',download:'Télécharger en HTML',question:'Souhaitez-vous découvrir ce que FastCheckIn peut faire pour votre établissement ?',demo:'Réserver une démonstration',call:'Demander un appel téléphonique',online:'découvrir FastCheckIn en ligne',anytime:'à tout moment.',closing:'Cordialement',team:'L’équipe FastCheckIn'},
  it:{subject:'Grazie per il tuo interesse in FastCheckIn',tagline:'Ospitalità, connessa',eyebrow:'FastCheckIn',heading:'Trasforma ogni check-in in',highlight:'migliori informazioni per il business.',dear:'Gentile',thanks:'Grazie per il tuo interesse in FastCheckIn. Ci auguriamo che la brochure mostri chiaramente come check-in digitale, informazioni sugli ospiti, operazioni alberghiere e business intelligence possano lavorare insieme per aiutare la tua struttura a prendere decisioni migliori.',explore:'Esplora la piattaforma, confronta i pacchetti disponibili e, quando sei pronto, scopri FastCheckIn in azione con una dimostrazione personalizzata.',brochure:'Apri / scarica la brochure',compare:'Confronta i pacchetti',note:'La brochure si apre online e include le opzioni',print:'Stampa / Salva come PDF',download:'Scarica HTML',question:'Vuoi scoprire cosa può fare FastCheckIn per la tua struttura?',demo:'Prenota una dimostrazione',call:'Richiedi una telefonata',online:'scopri FastCheckIn online',anytime:'in qualsiasi momento.',closing:'Cordiali saluti',team:'Il team FastCheckIn'},
  pt:{subject:'Obrigado pelo seu interesse no FastCheckIn',tagline:'Hospitalidade, conectada',eyebrow:'FastCheckIn',heading:'Transforme cada check-in em',highlight:'melhor inteligência de negócio.',dear:'Caro(a)',thanks:'Obrigado pelo seu interesse no FastCheckIn. Esperamos que a brochura mostre claramente como o check-in digital, as informações dos hóspedes, as operações hoteleiras e a inteligência de negócio podem trabalhar em conjunto para ajudar o seu estabelecimento a tomar decisões mais inteligentes.',explore:'Explore a plataforma, compare os pacotes disponíveis e, quando estiver pronto, deixe-nos mostrar o FastCheckIn em ação numa demonstração personalizada.',brochure:'Abrir / descarregar brochura',compare:'Comparar pacotes',note:'A brochura abre online e inclui opções para',print:'Imprimir / guardar como PDF',download:'Descarregar HTML',question:'Gostaria de ver o que o FastCheckIn pode fazer pelo seu estabelecimento?',demo:'Marcar uma demonstração',call:'Pedir uma chamada telefónica',online:'explorar o FastCheckIn online',anytime:'a qualquer momento.',closing:'Com os melhores cumprimentos',team:'A equipa FastCheckIn'},
  es:{subject:'Gracias por su interés en FastCheckIn',tagline:'Hospitalidad, conectada',eyebrow:'FastCheckIn',heading:'Convierta cada check-in en',highlight:'mejor inteligencia de negocio.',dear:'Estimado/a',thanks:'Gracias por su interés en FastCheckIn. Esperamos que el folleto le muestre claramente cómo el check-in digital, la información de los huéspedes, las operaciones hoteleras y la inteligencia de negocio pueden trabajar juntas para ayudar a su establecimiento a tomar mejores decisiones.',explore:'Explore la plataforma, compare los paquetes disponibles y, cuando esté preparado, permítanos mostrarle FastCheckIn en acción con una demostración personalizada.',brochure:'Abrir / descargar folleto',compare:'Comparar paquetes',note:'El folleto se abre en línea e incluye opciones para',print:'Imprimir / guardar como PDF',download:'Descargar HTML',question:'¿Le gustaría ver lo que FastCheckIn puede hacer por su establecimiento?',demo:'Reservar una demostración',call:'Solicitar una llamada',online:'explorar FastCheckIn en línea',anytime:'en cualquier momento.',closing:'Atentamente',team:'El equipo de FastCheckIn'},
  nl:{subject:'Bedankt voor uw interesse in FastCheckIn',tagline:'Gastvrijheid, verbonden',eyebrow:'FastCheckIn',heading:'Maak van elke check-in',highlight:'betere bedrijfsinformatie.',dear:'Beste',thanks:'Bedankt voor uw interesse in FastCheckIn. We hopen dat de brochure duidelijk laat zien hoe digitale check-in, gastinformatie, hotelactiviteiten en business intelligence kunnen samenwerken om uw accommodatie te helpen betere beslissingen te nemen.',explore:'Ontdek het platform, vergelijk de beschikbare pakketten en laat ons FastCheckIn, wanneer u er klaar voor bent, in actie zien tijdens een persoonlijke demonstratie.',brochure:'Brochure openen / downloaden',compare:'Pakketten vergelijken',note:'De brochure opent online en bevat opties voor',print:'Afdrukken / opslaan als PDF',download:'HTML downloaden',question:'Wilt u zien wat FastCheckIn voor uw accommodatie kan betekenen?',demo:'Een demonstratie boeken',call:'Een telefoongesprek aanvragen',online:'FastCheckIn online ontdekken',anytime:'op elk moment.',closing:'Met vriendelijke groet',team:'Het FastCheckIn-team'},
  ru:{subject:'Спасибо за интерес к FastCheckIn',tagline:'Гостеприимство, объединённое технологиями',eyebrow:'FastCheckIn',heading:'Превратите каждый заезд гостя в',highlight:'более эффективную бизнес-аналитику.',dear:'Здравствуйте',thanks:'Спасибо за интерес к FastCheckIn. Надеемся, что брошюра даст вам ясное представление о том, как цифровая регистрация, информация о гостях, гостиничные операции и бизнес-аналитика могут работать вместе, помогая вашему объекту принимать более взвешенные решения.',explore:'Изучите платформу, сравните доступные пакеты и, когда будете готовы, мы покажем FastCheckIn в работе на персональной демонстрации.',brochure:'Открыть / скачать брошюру',compare:'Сравнить пакеты',note:'Брошюра открывается онлайн и содержит функции',print:'Печать / сохранение в PDF',download:'Скачать HTML',question:'Хотите узнать, что FastCheckIn может сделать для вашего объекта?',demo:'Заказать демонстрацию',call:'Заказать телефонный звонок',online:'изучить FastCheckIn онлайн',anytime:'в любое время.',closing:'С уважением',team:'Команда FastCheckIn'},
  zh:{subject:'感谢您对 FastCheckIn 的关注',tagline:'让酒店服务互联互通',eyebrow:'FastCheckIn',heading:'让每一次宾客入住都转化为',highlight:'更有价值的商业洞察。',dear:'您好',thanks:'感谢您对 FastCheckIn 的关注。我们希望这份宣传册能清晰展示数字化入住、宾客信息、酒店运营和商业智能如何协同工作，帮助您的酒店做出更明智的决策。',explore:'欢迎探索平台、比较可用套餐；当您准备好后，我们很乐意通过专属演示向您展示 FastCheckIn 的实际应用。',brochure:'打开 / 下载宣传册',compare:'比较套餐',note:'宣传册在线打开，并提供',print:'打印 / 保存为 PDF',download:'下载 HTML',question:'想了解 FastCheckIn 能为您的酒店带来什么吗？',demo:'预约演示',call:'请求电话联系',online:'在线了解 FastCheckIn',anytime:'随时都可以。',closing:'此致',team:'FastCheckIn 团队'},
  ar:{subject:'شكرًا لاهتمامك بـ FastCheckIn',tagline:'الضيافة، متصلة',eyebrow:'FastCheckIn',heading:'حوّل كل تسجيل وصول إلى',highlight:'ذكاء أعمال أفضل.',dear:'مرحبًا',thanks:'شكرًا لاهتمامك بـ FastCheckIn. نأمل أن تمنحك الكتيّب صورة واضحة عن كيفية عمل تسجيل الوصول الرقمي ومعلومات الضيوف وعمليات الفندق وذكاء الأعمال معًا لمساعدة منشأتك على اتخاذ قرارات أفضل.',explore:'استكشف المنصة، وقارن الباقات المتاحة، وعندما تكون مستعدًا، دعنا نعرض لك FastCheckIn عمليًا من خلال عرض توضيحي شخصي.',brochure:'فتح / تنزيل الكتيّب',compare:'مقارنة الباقات',note:'يُفتح الكتيّب عبر الإنترنت ويتضمن خيارات',print:'الطباعة / الحفظ بصيغة PDF',download:'تنزيل HTML',question:'هل ترغب في معرفة ما يمكن أن يقدمه FastCheckIn لمنشأتك؟',demo:'حجز عرض توضيحي',call:'طلب مكالمة هاتفية',online:'استكشاف FastCheckIn عبر الإنترنت',anytime:'في أي وقت.',closing:'مع أطيب التحيات',team:'فريق FastCheckIn'},
  he:{subject:'תודה על התעניינותך ב-FastCheckIn',tagline:'אירוח, מחובר',eyebrow:'FastCheckIn',heading:'הפוך כל צ׳ק-אין של אורח ל',highlight:'מודיעין עסקי טוב יותר.',dear:'שלום',thanks:'תודה על התעניינותך ב-FastCheckIn. אנו מקווים שהחוברת תציג בבירור כיצד צ׳ק-אין דיגיטלי, מידע על אורחים, תפעול המלון ובינה עסקית יכולים לעבוד יחד כדי לעזור לנכס שלך לקבל החלטות טובות יותר.',explore:'גלה את הפלטפורמה, השווה בין החבילות הזמינות, וכשתהיה מוכן נשמח להציג לך את FastCheckIn בפעולה בהדגמה אישית.',brochure:'פתיחת / הורדת החוברת',compare:'השוואת חבילות',note:'החוברת נפתחת באופן מקוון וכוללת אפשרויות',print:'הדפסה / שמירה כ-PDF',download:'הורדת HTML',question:'רוצה לראות מה FastCheckIn יכול לעשות עבור הנכס שלך?',demo:'קביעת הדגמה',call:'בקשת שיחת טלפון',online:'לחקור את FastCheckIn באינטרנט',anytime:'בכל עת.',closing:'בברכה',team:'צוות FastCheckIn'}
};

const ONLINE_PREFIX = { en:'You can also', af:'U kan', de:'Sie können', fr:'Vous pouvez également', it:'Puoi anche', pt:'Também pode', es:'También puede', nl:'U kunt', ru:'Вы также можете', zh:'您也可以', ar:'يمكنك أيضًا', he:'תוכל גם' };
const DEMO_SUBJECT = { en:'FastCheckIn demonstration', af:'FastCheckIn demonstrasie', de:'FastCheckIn Demonstration', fr:'Démonstration FastCheckIn', it:'Dimostrazione FastCheckIn', pt:'Demonstração FastCheckIn', es:'Demostración de FastCheckIn', nl:'FastCheckIn demonstratie', ru:'Демонстрация FastCheckIn', zh:'FastCheckIn 演示', ar:'عرض توضيحي لـ FastCheckIn', he:'הדגמת FastCheckIn' };

async function sendBrochureThankYou(lead, language = 'en') {
  const selectedLanguage = clean(language, 10).toLowerCase().split('-')[0];
  const t = BROCHURE_EMAIL_COPY[selectedLanguage] || BROCHURE_EMAIL_COPY.en;
  const brochureUrl='https://fastcheckin.co.za/FastCheckIn_Brochure.html';
  const compareUrl='https://fastcheckin.co.za/#pricing-section';
  const demoUrl=`mailto:inquiry@fastcheckin.co.za?subject=${encodeURIComponent(DEMO_SUBJECT[selectedLanguage] || DEMO_SUBJECT.en)}`;
  const callUrl='tel:+27837789487';
  const heroImageUrl='https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=82';
  const logoUrl='https://fastcheckin.co.za/fastcheckin-logo.png';
  const firstName=clean(lead.fullName).split(/\s+/)[0] || 'there';
  const button=(href,label,background='#082c3a',color='#ffffff') => `<a href="${href}" style="display:inline-block;background:${background};color:${color};text-decoration:none;font-weight:bold;padding:13px 18px;border-radius:8px;margin:4px">${label}</a>`;
  const onlinePrefix = ONLINE_PREFIX[selectedLanguage] || ONLINE_PREFIX.en;
  const html=`<div style="margin:0;background:#eef3f4;padding:24px 10px;font-family:Arial,Helvetica,sans-serif;color:#18313c"><div style="max-width:680px;margin:auto;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #dce7e7;box-shadow:0 4px 18px rgba(8,44,58,.08)">
  <div style="padding:22px 30px 16px;text-align:center;background:#082c3a"><img src="${logoUrl}" alt="FastCheckIn" style="display:block;width:210px;max-width:80%;height:auto;margin:0 auto 12px"><div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#c3ec5b;font-weight:bold">${t.tagline}</div></div>
  <img src="${heroImageUrl}" alt="${escapeHtml(t.tagline)}" style="display:block;width:100%;height:250px;object-fit:cover">
  <div style="padding:30px 32px 34px"><p style="margin:0 0 10px;color:#a06a00;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:bold">${t.eyebrow}</p><h1 style="margin:0 0 16px;font-size:31px;line-height:1.15;color:#082c3a">${t.heading} <span style="color:#6d9800">${t.highlight}</span></h1>
  <p style="font-size:16px;line-height:1.7;margin:0 0 16px">${t.dear} ${escapeHtml(firstName)},</p>
  <p style="font-size:16px;line-height:1.7;margin:0 0 14px">${t.thanks}</p>
  <p style="font-size:16px;line-height:1.7;margin:0 0 22px">${t.explore}</p>
  <div style="text-align:center;margin:24px 0 26px">${button(brochureUrl,t.brochure,'#a6d631','#17333c')}${button(compareUrl,t.compare,'#082c3a','#ffffff')}</div>
  <p style="font-size:14px;line-height:1.6;color:#60727b;margin:0 0 20px;text-align:center">${t.note} <strong>${t.print}</strong> ${t.download}.</p>
  <div style="border-top:1px solid #e4eceb;padding-top:24px;text-align:center"><p style="font-size:17px;font-weight:bold;color:#082c3a;margin:0 0 14px">${t.question}</p>${button(demoUrl,t.demo,'#082c3a','#ffffff')}${button(callUrl,t.call,'#ffffff','#082c3a')}</div>
  <p style="font-size:15px;line-height:1.7;margin:28px 0 0">${onlinePrefix} ${t.online} ${t.anytime}</p>
  <p style="margin:24px 0 0">${t.closing},<br><strong>${t.team}</strong><br><span style="color:#60727b">${t.tagline}</span></p></div>
  <div style="padding:20px 32px;background:#f3f8f7;font-size:12px;line-height:1.6;color:#60727b;text-align:center">FastCheckIn · Aemara Group Pty Ltd · South Africa<br><a href="mailto:inquiry@fastcheckin.co.za" style="color:#547600">inquiry@fastcheckin.co.za</a> · +27 (0)83 778 9487</div></div></div>`;
  return sendEmail({ to:lead.email, subject:t.subject, html, reportRecipientError:true });
}

async function prepareProtectedResource(resource) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) throw new Error('Supabase Storage credentials are not configured.');
  const storageBaseUrl=`${process.env.SUPABASE_URL.replace(/\/$/,'')}/storage/v1`;
  const serviceKey=process.env.SUPABASE_SERVICE_KEY;
  const authHeaders={ Authorization:`Bearer ${serviceKey}`, apikey:serviceKey };
  const objectPath=resource.fileName;
  const objectUrl=`${storageBaseUrl}/object/${MARKETING_BUCKET}/${objectPath}`;
  const root=process.env.LAMBDA_TASK_ROOT || process.cwd();
  const candidates=[path.resolve(process.cwd(),'public',resource.fileName),path.resolve(root,'public',resource.fileName),path.resolve(process.cwd(),resource.fileName),path.resolve(root,resource.fileName)];
  let filePath=null;
  for (const candidate of candidates) { try { await access(candidate); filePath=candidate; break; } catch {} }
  if (!filePath) throw new Error('Protected resource file is unavailable in the deployed function bundle.');
  const file=await readFile(filePath);
  const upload=await fetch(objectUrl,{method:'POST',headers:{...authHeaders,'Content-Type':'application/pdf','Cache-Control':'max-age=3600','x-upsert':'true'},body:file});
  if (!upload.ok) { const details=await upload.text().catch(()=> ''); throw new Error(`Unable to store protected resource: HTTP ${upload.status}${details ? ` — ${details}` : ''}`); }
  const sign=await fetch(`${storageBaseUrl}/object/sign/${MARKETING_BUCKET}/${objectPath}`,{method:'POST',headers:{...authHeaders,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:SIGNED_URL_EXPIRES_IN})});
  if (!sign.ok) { const details=await sign.text().catch(()=> ''); throw new Error(`Unable to create protected download URL: HTTP ${sign.status}${details ? ` — ${details}` : ''}`); }
  const signed=await sign.json(); const relative=signed?.signedURL || signed?.signedUrl;
  if (!relative) throw new Error('Unable to create protected download URL: missing signed URL');
  const url=new URL(relative.startsWith('http') ? relative : `${storageBaseUrl}${relative.startsWith('/')?'':'/'}${relative}`);
  url.searchParams.set('download','true');
  return url.toString();
}

async function notifyInquiry(lead, topic, comments) {
  const html='<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><h2>FastCheckIn website enquiry</h2><p><strong>Topic:</strong> '+escapeHtml(topic)+'</p><p><strong>Name:</strong> '+escapeHtml(lead.fullName)+'</p><p><strong>Company / hotel:</strong> '+escapeHtml(lead.companyName)+'</p><p><strong>Email:</strong> '+escapeHtml(lead.email)+'</p><p><strong>Telephone:</strong> '+escapeHtml(lead.telephone)+'</p><p><strong>Address:</strong> '+escapeHtml(lead.address)+'</p><p><strong>Comments:</strong><br>'+escapeHtml(comments)+'</p></div>';
  return sendEmail({to:process.env.FASTCHECKIN_INQUIRY_EMAIL || 'inquiry@fastcheckin.co.za',subject:'FastCheckIn website enquiry: '+clean(topic,120),html});
}

const PROTECTED_DOCUMENTS={brochure:{fileName:'FastCheckIn_Platform_Overview_Brochure.pdf'},'visitor-origin':{fileName:'FastCheckIn_Visitor_Origin_Explorer_Snapshot.pdf'},'business-snapshot':{fileName:'FastCheckIn_Business_Snapshot.pdf'}};

export const handler=async event=>{
  if (event.httpMethod==='OPTIONS') return {statusCode:204,headers:JSON_HEADERS,body:''};
  if (event.httpMethod!=='POST') return jsonResponse(405,{error:'Method Not Allowed'});
  let body; try { body=JSON.parse(event.body || '{}'); } catch { return jsonResponse(400,{error:'Invalid JSON body'}); }

  if (body.action==='inquiry' || body.action==='enterprise-inquiry') {
    const captcha=await verifyTurnstile(body.turnstileToken,event,body.action==='enterprise-inquiry'?'enterprise-enquiry':'homepage-enquiry');
    if (!captcha.ok) return jsonResponse(400,{error:captcha.error});
    const leadError=validateLead(body.lead); if (leadError) return jsonResponse(400,{error:leadError});
    const topic=clean(body.topic,160), comments=clean(body.comments,3000); if (!topic || !comments) return jsonResponse(400,{error:'Please select a topic and enter your comments.'});
    const lead={fullName:clean(body.lead.fullName),companyName:clean(body.lead.companyName),email:clean(body.lead.email,320),telephone:clean(body.lead.telephone,80),address:clean(body.lead.address)};
    try {
      const portfolio=body.portfolio && typeof body.portfolio==='object' ? body.portfolio : {};
      await supabaseInsert('website_enquiries',{topic,status:'new',full_name:lead.fullName,company_name:lead.companyName,email:lead.email,telephone:lead.telephone,address:lead.address,website:clean(portfolio.website,500)||null,total_rooms:Number.isFinite(Number(portfolio.totalRooms))?Number(portfolio.totalRooms):null,total_establishments:Number.isFinite(Number(portfolio.totalEstablishments))?Number(portfolio.totalEstablishments):null,sa_establishments:Number.isFinite(Number(portfolio.saEstablishments))?Number(portfolio.saEstablishments):null,sa_provinces:Array.isArray(portfolio.saProvinces)?portfolio.saProvinces.map(v=>clean(v,100)).filter(Boolean):[],international_establishments:Number.isFinite(Number(portfolio.internationalEstablishments))?Number(portfolio.internationalEstablishments):0,international_countries:Array.isArray(portfolio.internationalCountries)?portfolio.internationalCountries.map(v=>clean(v,100)).filter(Boolean):[],comments});
    } catch (error) { console.error('Website enquiry persistence failed:',error); return jsonResponse(500,{error:'Unable to save your enquiry. Please try again.'}); }
    await notifyInquiry(lead,topic,comments);
    return jsonResponse(200,{success:true});
  }

  if (body.action!=='download') return jsonResponse(400,{error:'Unsupported action'});
  const document=['brochure','visitor-origin','business-snapshot'].includes(body.document) ? body.document : null;
  if (!document) return jsonResponse(400,{error:'Unsupported document'});
  const captcha=await verifyTurnstile(body.turnstileToken,event,'homepage-download'); if (!captcha.ok) return jsonResponse(400,{error:captcha.error});
  const leadError=validateLead(body.lead); if (leadError) return jsonResponse(400,{error:leadError});
  const lead={fullName:clean(body.lead.fullName),companyName:clean(body.lead.companyName),email:clean(body.lead.email,320),telephone:clean(body.lead.telephone,80),address:clean(body.lead.address)};
  try {
    await supabaseInsert('website_enquiries',{topic:'Homepage resource request: '+document,status:'new',full_name:lead.fullName,company_name:lead.companyName,email:lead.email,telephone:lead.telephone,address:lead.address,comments:'Requested resource: '+document});
  } catch (error) { console.error('Resource request persistence failed:',error); return jsonResponse(500,{error:'Unable to save your request. Please try again.'}); }
  await notifyLead(lead,document);
  if (document==='brochure') {
    const emailResult=await sendBrochureThankYou(lead, body.language);
    if (emailResult && typeof emailResult==='object' && emailResult.invalidRecipient) return jsonResponse(422,{success:false,emailRejected:true,error:'We could not recognise this email address. Please check it and edit it to continue.'});
    if (emailResult !== true) return jsonResponse(502,{success:false,error:'We could not send the confirmation email. Please try again.'});
    return jsonResponse(200,{success:true,brochureUrl:'/FastCheckIn_Brochure.html',emailSent:true});
  }
  try { const downloadUrl=await prepareProtectedResource(PROTECTED_DOCUMENTS[document]); return jsonResponse(200,{success:true,downloadUrl}); }
  catch (error) { console.error('Protected resource preparation failed:',error); return jsonResponse(500,{error:'Unable to prepare the download. Please try again.'}); }
};