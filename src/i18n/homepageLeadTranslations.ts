import type { SupportedLanguage } from './types';

type LeadCopy = {
  brochureTitle: string;
  brochureBody: string;
  visitorTitle: string;
  visitorBody: string;
  businessTitle: string;
  businessBody: string;
  fullName: string;
  company: string;
  email: string;
  telephone: string;
  address: string;
  privacyBody: string;
  privacy: string;
  terms: string;
  security: string;
  allFields: string;
  rejectedTitle: string;
  rejectedBody: string;
  editEmail: string;
  thankYou: string;
  emailSent: string;
  correctEmail: string;
  openBrochure: string;
  close: string;
  cancel: string;
  preparing: string;
  download: string;
  error: string;
};

const EN: LeadCopy = {
  brochureTitle: 'Get the FastCheckIn Brochure',
  brochureBody: 'Complete the form to open the FastCheckIn brochure without leaving this page. We will also email you a thank-you message with the brochure link and next steps.',
  visitorTitle: 'Download the Visitor Origin Explorer Snapshot',
  visitorBody: 'See an example of how FastCheckIn turns guest-origin information into market insight.',
  businessTitle: 'Download the Business Snapshot',
  businessBody: 'See an example of the operational and business measures FastCheckIn can bring together.',
  fullName: 'Full name', company: 'Company / hotel name', email: 'Email address', telephone: 'Telephone', address: 'Business / property address',
  privacyBody: 'We use these details to provide the requested resource and respond to related enquiries.', privacy: 'Privacy Policy', terms: 'Terms',
  security: 'Please complete the security verification.', allFields: 'Please complete all fields before continuing.',
  rejectedTitle: "We couldn't recognise this email address", rejectedBody: 'The email service did not accept this address. Please check it and edit it to continue.', editEmail: 'Edit email',
  thankYou: 'Thank you for your interest in FastCheckIn', emailSent: "We've sent an email to {email}. You can now open the brochure here without leaving this page.",
  correctEmail: 'Please correct the email address below, then select Open brochure again.', openBrochure: 'Open brochure', close: 'Close', cancel: 'Cancel', preparing: 'Preparing…', download: 'Download', error: 'Unable to prepare the requested resource.'
};

export const HOMEPAGE_LEAD_TRANSLATIONS: Record<SupportedLanguage, LeadCopy> = {
  en: EN,
  af: {
    brochureTitle: 'Kry die FastCheckIn-brosjure', brochureBody: 'Voltooi die vorm om die FastCheckIn-brosjure oop te maak sonder om hierdie bladsy te verlaat. Ons sal ook vir jou ’n dankie-e-pos met die brosjureskakel en volgende stappe stuur.',
    visitorTitle: 'Laai die Besoekersherkomsverkenner-oorsig af', visitorBody: 'Sien ’n voorbeeld van hoe FastCheckIn gasteherkomsinligting in markinsig omskakel.',
    businessTitle: 'Laai die Besigheidsmomentopname af', businessBody: 'Sien ’n voorbeeld van die bedryfs- en besigheidsmaatstawwe wat FastCheckIn kan saambring.',
    fullName: 'Volle naam', company: 'Maatskappy- / hotelnaam', email: 'E-posadres', telephone: 'Telefoon', address: 'Besigheids- / eiendomsadres',
    privacyBody: 'Ons gebruik hierdie besonderhede om die aangevraagde hulpbron te verskaf en op verwante navrae te reageer.', privacy: 'Privaatheidsbeleid', terms: 'Bepalings',
    security: 'Voltooi asseblief die sekuriteitsverifikasie.', allFields: 'Voltooi asseblief alle velde voordat jy voortgaan.',
    rejectedTitle: 'Ons kon nie hierdie e-posadres herken nie', rejectedBody: 'Die e-posdiens het hierdie adres nie aanvaar nie. Kontroleer dit asseblief en wysig dit om voort te gaan.', editEmail: 'Wysig e-pos',
    thankYou: 'Dankie vir jou belangstelling in FastCheckIn', emailSent: 'Ons het ’n e-pos aan {email} gestuur. Jy kan nou die brosjure hier oopmaak sonder om hierdie bladsy te verlaat.',
    correctEmail: 'Korrigeer asseblief die e-posadres hieronder en kies dan weer Maak brosjure oop.', openBrochure: 'Maak brosjure oop', close: 'Sluit', cancel: 'Kanselleer', preparing: 'Berei voor…', download: 'Laai af', error: 'Kon nie die aangevraagde hulpbron voorberei nie.'
  },
  de: {
    brochureTitle: 'FastCheckIn-Broschüre erhalten', brochureBody: 'Füllen Sie das Formular aus, um die FastCheckIn-Broschüre zu öffnen, ohne diese Seite zu verlassen. Wir senden Ihnen außerdem eine Dankes-E-Mail mit dem Broschürenlink und den nächsten Schritten.',
    visitorTitle: 'Visitor-Origin-Explorer-Snapshot herunterladen', visitorBody: 'Sehen Sie ein Beispiel dafür, wie FastCheckIn Gästeinformationen zur Herkunft in Marktinformationen umwandelt.',
    businessTitle: 'Business-Snapshot herunterladen', businessBody: 'Sehen Sie ein Beispiel für die betrieblichen und geschäftlichen Kennzahlen, die FastCheckIn zusammenführen kann.',
    fullName: 'Vollständiger Name', company: 'Unternehmens- / Hotelname', email: 'E-Mail-Adresse', telephone: 'Telefon', address: 'Geschäfts- / Objektadresse',
    privacyBody: 'Wir verwenden diese Angaben, um die angeforderte Ressource bereitzustellen und auf damit verbundene Anfragen zu antworten.', privacy: 'Datenschutzerklärung', terms: 'Bedingungen',
    security: 'Bitte schließen Sie die Sicherheitsüberprüfung ab.', allFields: 'Bitte füllen Sie alle Felder aus, bevor Sie fortfahren.',
    rejectedTitle: 'Diese E-Mail-Adresse konnte nicht erkannt werden', rejectedBody: 'Der E-Mail-Dienst hat diese Adresse nicht akzeptiert. Bitte überprüfen und bearbeiten Sie sie, um fortzufahren.', editEmail: 'E-Mail bearbeiten',
    thankYou: 'Vielen Dank für Ihr Interesse an FastCheckIn', emailSent: 'Wir haben eine E-Mail an {email} gesendet. Sie können die Broschüre jetzt hier öffnen, ohne diese Seite zu verlassen.',
    correctEmail: 'Bitte korrigieren Sie die E-Mail-Adresse unten und wählen Sie anschließend erneut Broschüre öffnen.', openBrochure: 'Broschüre öffnen', close: 'Schließen', cancel: 'Abbrechen', preparing: 'Wird vorbereitet…', download: 'Herunterladen', error: 'Die angeforderte Ressource konnte nicht vorbereitet werden.'
  },
  fr: {
    brochureTitle: 'Obtenir la brochure FastCheckIn', brochureBody: 'Remplissez le formulaire pour ouvrir la brochure FastCheckIn sans quitter cette page. Nous vous enverrons également un e-mail de remerciement avec le lien vers la brochure et les prochaines étapes.',
    visitorTitle: 'Télécharger l’aperçu de Visitor Origin Explorer', visitorBody: 'Découvrez un exemple de la façon dont FastCheckIn transforme les informations sur l’origine des visiteurs en informations de marché.',
    businessTitle: 'Télécharger le Business Snapshot', businessBody: 'Découvrez un exemple des indicateurs opérationnels et commerciaux que FastCheckIn peut réunir.',
    fullName: 'Nom complet', company: 'Nom de l’entreprise / de l’hôtel', email: 'Adresse e-mail', telephone: 'Téléphone', address: 'Adresse de l’entreprise / de l’établissement',
    privacyBody: 'Nous utilisons ces informations pour fournir la ressource demandée et répondre aux demandes associées.', privacy: 'Politique de confidentialité', terms: 'Conditions',
    security: 'Veuillez effectuer la vérification de sécurité.', allFields: 'Veuillez remplir tous les champs avant de continuer.',
    rejectedTitle: 'Nous n’avons pas pu reconnaître cette adresse e-mail', rejectedBody: 'Le service de messagerie n’a pas accepté cette adresse. Vérifiez-la et modifiez-la pour continuer.', editEmail: 'Modifier l’e-mail',
    thankYou: 'Merci de votre intérêt pour FastCheckIn', emailSent: 'Nous avons envoyé un e-mail à {email}. Vous pouvez maintenant ouvrir la brochure ici sans quitter cette page.',
    correctEmail: 'Veuillez corriger l’adresse e-mail ci-dessous, puis sélectionnez à nouveau Ouvrir la brochure.', openBrochure: 'Ouvrir la brochure', close: 'Fermer', cancel: 'Annuler', preparing: 'Préparation…', download: 'Télécharger', error: 'Impossible de préparer la ressource demandée.'
  },
  it: {
    brochureTitle: 'Ottieni la brochure FastCheckIn', brochureBody: 'Compila il modulo per aprire la brochure FastCheckIn senza lasciare questa pagina. Ti invieremo anche un’e-mail di ringraziamento con il link alla brochure e i prossimi passaggi.',
    visitorTitle: 'Scarica l’istantanea di Visitor Origin Explorer', visitorBody: 'Scopri un esempio di come FastCheckIn trasforma le informazioni sulla provenienza degli ospiti in dati di mercato.',
    businessTitle: 'Scarica il Business Snapshot', businessBody: 'Scopri un esempio degli indicatori operativi e aziendali che FastCheckIn può riunire.',
    fullName: 'Nome completo', company: 'Nome azienda / hotel', email: 'Indirizzo e-mail', telephone: 'Telefono', address: 'Indirizzo dell’azienda / struttura',
    privacyBody: 'Utilizziamo questi dati per fornire la risorsa richiesta e rispondere alle richieste correlate.', privacy: 'Informativa sulla privacy', terms: 'Termini',
    security: 'Completa la verifica di sicurezza.', allFields: 'Completa tutti i campi prima di continuare.',
    rejectedTitle: 'Non abbiamo riconosciuto questo indirizzo e-mail', rejectedBody: 'Il servizio e-mail non ha accettato questo indirizzo. Controllalo e modificalo per continuare.', editEmail: 'Modifica e-mail',
    thankYou: 'Grazie per il tuo interesse per FastCheckIn', emailSent: 'Abbiamo inviato un’e-mail a {email}. Ora puoi aprire la brochure qui senza lasciare questa pagina.',
    correctEmail: 'Correggi l’indirizzo e-mail qui sotto, quindi seleziona di nuovo Apri brochure.', openBrochure: 'Apri brochure', close: 'Chiudi', cancel: 'Annulla', preparing: 'Preparazione…', download: 'Scarica', error: 'Impossibile preparare la risorsa richiesta.'
  },
  pt: {
    brochureTitle: 'Obtenha a brochura FastCheckIn', brochureBody: 'Preencha o formulário para abrir a brochura FastCheckIn sem sair desta página. Também lhe enviaremos um e-mail de agradecimento com o link da brochura e os próximos passos.',
    visitorTitle: 'Baixar o resumo do Visitor Origin Explorer', visitorBody: 'Veja um exemplo de como o FastCheckIn transforma informações sobre a origem dos hóspedes em conhecimento de mercado.',
    businessTitle: 'Baixar o Business Snapshot', businessBody: 'Veja um exemplo dos indicadores operacionais e de negócio que o FastCheckIn pode reunir.',
    fullName: 'Nome completo', company: 'Nome da empresa / hotel', email: 'Endereço de e-mail', telephone: 'Telefone', address: 'Endereço da empresa / propriedade',
    privacyBody: 'Usamos estes dados para fornecer o recurso solicitado e responder a pedidos relacionados.', privacy: 'Política de privacidade', terms: 'Termos',
    security: 'Conclua a verificação de segurança.', allFields: 'Preencha todos os campos antes de continuar.',
    rejectedTitle: 'Não foi possível reconhecer este endereço de e-mail', rejectedBody: 'O serviço de e-mail não aceitou este endereço. Verifique-o e edite-o para continuar.', editEmail: 'Editar e-mail',
    thankYou: 'Obrigado pelo seu interesse no FastCheckIn', emailSent: 'Enviámos um e-mail para {email}. Agora pode abrir a brochura aqui sem sair desta página.',
    correctEmail: 'Corrija o endereço de e-mail abaixo e selecione novamente Abrir brochura.', openBrochure: 'Abrir brochura', close: 'Fechar', cancel: 'Cancelar', preparing: 'A preparar…', download: 'Baixar', error: 'Não foi possível preparar o recurso solicitado.'
  },
  es: {
    brochureTitle: 'Obtén el folleto de FastCheckIn', brochureBody: 'Completa el formulario para abrir el folleto de FastCheckIn sin salir de esta página. También te enviaremos un correo de agradecimiento con el enlace al folleto y los próximos pasos.',
    visitorTitle: 'Descargar el resumen de Visitor Origin Explorer', visitorBody: 'Consulta un ejemplo de cómo FastCheckIn convierte la información sobre el origen de los huéspedes en información de mercado.',
    businessTitle: 'Descargar el Business Snapshot', businessBody: 'Consulta un ejemplo de los indicadores operativos y empresariales que FastCheckIn puede reunir.',
    fullName: 'Nombre completo', company: 'Nombre de la empresa / hotel', email: 'Dirección de correo electrónico', telephone: 'Teléfono', address: 'Dirección de la empresa / establecimiento',
    privacyBody: 'Utilizamos estos datos para proporcionar el recurso solicitado y responder a consultas relacionadas.', privacy: 'Política de privacidad', terms: 'Términos',
    security: 'Completa la verificación de seguridad.', allFields: 'Completa todos los campos antes de continuar.',
    rejectedTitle: 'No hemos podido reconocer esta dirección de correo electrónico', rejectedBody: 'El servicio de correo electrónico no aceptó esta dirección. Compruébala y edítala para continuar.', editEmail: 'Editar correo',
    thankYou: 'Gracias por tu interés en FastCheckIn', emailSent: 'Hemos enviado un correo a {email}. Ahora puedes abrir el folleto aquí sin salir de esta página.',
    correctEmail: 'Corrige la dirección de correo electrónico y selecciona de nuevo Abrir folleto.', openBrochure: 'Abrir folleto', close: 'Cerrar', cancel: 'Cancelar', preparing: 'Preparando…', download: 'Descargar', error: 'No se ha podido preparar el recurso solicitado.'
  },
  nl: {
    brochureTitle: 'Ontvang de FastCheckIn-brochure', brochureBody: 'Vul het formulier in om de FastCheckIn-brochure te openen zonder deze pagina te verlaten. We sturen u ook een bedankmail met de brochurelink en de volgende stappen.',
    visitorTitle: 'Download de Visitor Origin Explorer-snapshot', visitorBody: 'Bekijk een voorbeeld van hoe FastCheckIn informatie over de herkomst van gasten omzet in marktinzichten.',
    businessTitle: 'Download de Business Snapshot', businessBody: 'Bekijk een voorbeeld van de operationele en zakelijke kengetallen die FastCheckIn kan samenbrengen.',
    fullName: 'Volledige naam', company: 'Bedrijfs- / hotelnaam', email: 'E-mailadres', telephone: 'Telefoon', address: 'Adres van bedrijf / accommodatie',
    privacyBody: 'We gebruiken deze gegevens om de aangevraagde bron te leveren en te reageren op gerelateerde vragen.', privacy: 'Privacybeleid', terms: 'Voorwaarden',
    security: 'Voltooi de beveiligingscontrole.', allFields: 'Vul alle velden in voordat u verdergaat.',
    rejectedTitle: 'We konden dit e-mailadres niet herkennen', rejectedBody: 'De e-maildienst heeft dit adres niet geaccepteerd. Controleer en bewerk het om verder te gaan.', editEmail: 'E-mail bewerken',
    thankYou: 'Bedankt voor uw interesse in FastCheckIn', emailSent: 'We hebben een e-mail naar {email} gestuurd. U kunt de brochure nu hier openen zonder deze pagina te verlaten.',
    correctEmail: 'Corrigeer het e-mailadres hieronder en selecteer daarna opnieuw Brochure openen.', openBrochure: 'Brochure openen', close: 'Sluiten', cancel: 'Annuleren', preparing: 'Voorbereiden…', download: 'Downloaden', error: 'De aangevraagde bron kan niet worden voorbereid.'
  },
  ru: {
    brochureTitle: 'Получить брошюру FastCheckIn', brochureBody: 'Заполните форму, чтобы открыть брошюру FastCheckIn, не покидая эту страницу. Мы также отправим вам письмо с благодарностью, ссылкой на брошюру и дальнейшими шагами.',
    visitorTitle: 'Скачать обзор Visitor Origin Explorer', visitorBody: 'Посмотрите пример того, как FastCheckIn превращает сведения о происхождении гостей в рыночную аналитику.',
    businessTitle: 'Скачать Business Snapshot', businessBody: 'Посмотрите пример операционных и бизнес-показателей, которые FastCheckIn может объединить.',
    fullName: 'Полное имя', company: 'Название компании / отеля', email: 'Адрес электронной почты', telephone: 'Телефон', address: 'Адрес компании / объекта размещения',
    privacyBody: 'Мы используем эти данные для предоставления запрошенного материала и ответа на связанные запросы.', privacy: 'Политика конфиденциальности', terms: 'Условия',
    security: 'Пройдите проверку безопасности.', allFields: 'Заполните все поля перед продолжением.',
    rejectedTitle: 'Не удалось распознать этот адрес электронной почты', rejectedBody: 'Почтовый сервис не принял этот адрес. Проверьте его и отредактируйте, чтобы продолжить.', editEmail: 'Изменить e-mail',
    thankYou: 'Спасибо за интерес к FastCheckIn', emailSent: 'Мы отправили письмо на адрес {email}. Теперь вы можете открыть брошюру здесь, не покидая эту страницу.',
    correctEmail: 'Исправьте адрес электронной почты ниже и снова выберите Открыть брошюру.', openBrochure: 'Открыть брошюру', close: 'Закрыть', cancel: 'Отмена', preparing: 'Подготовка…', download: 'Скачать', error: 'Не удалось подготовить запрошенный материал.'
  },
  zh: {
    brochureTitle: '获取 FastCheckIn 产品手册', brochureBody: '填写表单即可打开 FastCheckIn 产品手册，无需离开此页面。我们还会向您发送感谢邮件，其中包含手册链接和后续步骤。',
    visitorTitle: '下载访客来源探索器概览', visitorBody: '查看 FastCheckIn 如何将宾客来源信息转化为市场洞察的示例。',
    businessTitle: '下载 Business Snapshot', businessBody: '查看 FastCheckIn 可汇总的运营和业务指标示例。',
    fullName: '姓名', company: '公司 / 酒店名称', email: '电子邮箱地址', telephone: '电话', address: '公司 / 酒店地址',
    privacyBody: '我们使用这些信息来提供您请求的资源并回复相关咨询。', privacy: '隐私政策', terms: '条款',
    security: '请完成安全验证。', allFields: '请填写所有字段后再继续。',
    rejectedTitle: '无法识别此电子邮箱地址', rejectedBody: '邮件服务未接受此地址。请检查并修改后继续。', editEmail: '编辑邮箱',
    thankYou: '感谢您对 FastCheckIn 的关注', emailSent: '我们已向 {email} 发送邮件。现在您可以直接在此处打开产品手册，无需离开本页面。',
    correctEmail: '请更正下方的电子邮箱地址，然后再次选择打开手册。', openBrochure: '打开手册', close: '关闭', cancel: '取消', preparing: '准备中…', download: '下载', error: '无法准备您请求的资源。'
  },
  ar: {
    brochureTitle: 'احصل على كتيب FastCheckIn', brochureBody: 'أكمل النموذج لفتح كتيب FastCheckIn دون مغادرة هذه الصفحة. سنرسل إليك أيضًا رسالة شكر بالبريد الإلكتروني تتضمن رابط الكتيب والخطوات التالية.',
    visitorTitle: 'تنزيل ملخص مستكشف مصادر الزوار', visitorBody: 'اطّلع على مثال لكيفية تحويل FastCheckIn معلومات مصادر الضيوف إلى رؤى سوقية.',
    businessTitle: 'تنزيل Business Snapshot', businessBody: 'اطّلع على مثال للمؤشرات التشغيلية ومؤشرات الأعمال التي يمكن لـ FastCheckIn جمعها.',
    fullName: 'الاسم الكامل', company: 'اسم الشركة / الفندق', email: 'عنوان البريد الإلكتروني', telephone: 'الهاتف', address: 'عنوان الشركة / المنشأة',
    privacyBody: 'نستخدم هذه البيانات لتوفير المورد المطلوب والرد على الاستفسارات ذات الصلة.', privacy: 'سياسة الخصوصية', terms: 'الشروط',
    security: 'يرجى إكمال التحقق الأمني.', allFields: 'يرجى إكمال جميع الحقول قبل المتابعة.',
    rejectedTitle: 'تعذر التعرّف على عنوان البريد الإلكتروني هذا', rejectedBody: 'لم تقبل خدمة البريد الإلكتروني هذا العنوان. يرجى التحقق منه وتعديله للمتابعة.', editEmail: 'تعديل البريد الإلكتروني',
    thankYou: 'شكرًا لاهتمامك بـ FastCheckIn', emailSent: 'أرسلنا رسالة إلى {email}. يمكنك الآن فتح الكتيب هنا دون مغادرة هذه الصفحة.',
    correctEmail: 'يرجى تصحيح عنوان البريد الإلكتروني أدناه، ثم اختيار فتح الكتيب مرة أخرى.', openBrochure: 'فتح الكتيب', close: 'إغلاق', cancel: 'إلغاء', preparing: 'جارٍ التحضير…', download: 'تنزيل', error: 'تعذر تجهيز المورد المطلوب.'
  },
  he: {
    brochureTitle: 'קבלת חוברת FastCheckIn', brochureBody: 'מלאו את הטופס כדי לפתוח את חוברת FastCheckIn מבלי לעזוב את הדף. נשלח אליכם גם הודעת תודה בדוא״ל עם קישור לחוברת והשלבים הבאים.',
    visitorTitle: 'הורדת תמונת מצב של Visitor Origin Explorer', visitorBody: 'ראו דוגמה לאופן שבו FastCheckIn הופך מידע על מקור האורחים לתובנות שוק.',
    businessTitle: 'הורדת Business Snapshot', businessBody: 'ראו דוגמה למדדים תפעוליים ועסקיים ש-FastCheckIn יכול לרכז.',
    fullName: 'שם מלא', company: 'שם החברה / המלון', email: 'כתובת דוא״ל', telephone: 'טלפון', address: 'כתובת החברה / הנכס',
    privacyBody: 'אנו משתמשים בפרטים אלה כדי לספק את המשאב המבוקש ולהשיב לפניות הקשורות אליו.', privacy: 'מדיניות פרטיות', terms: 'תנאים',
    security: 'יש להשלים את אימות האבטחה.', allFields: 'יש למלא את כל השדות לפני ההמשך.',
    rejectedTitle: 'לא הצלחנו לזהות את כתובת הדוא״ל הזו', rejectedBody: 'שירות הדוא״ל לא קיבל כתובת זו. בדקו וערכו אותה כדי להמשיך.', editEmail: 'עריכת דוא״ל',
    thankYou: 'תודה על התעניינותכם ב-FastCheckIn', emailSent: 'שלחנו הודעת דוא״ל אל {email}. כעת ניתן לפתוח את החוברת כאן מבלי לעזוב את הדף.',
    correctEmail: 'יש לתקן את כתובת הדוא״ל למטה ולאחר מכן לבחור שוב פתיחת חוברת.', openBrochure: 'פתיחת החוברת', close: 'סגירה', cancel: 'ביטול', preparing: 'מכין…', download: 'הורדה', error: 'לא ניתן להכין את המשאב המבוקש.'
  }
};

export const getHomepageLeadCopy = (language: SupportedLanguage): LeadCopy => HOMEPAGE_LEAD_TRANSLATIONS[language] || EN;
