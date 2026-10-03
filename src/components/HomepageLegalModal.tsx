import { X } from 'lucide-react';

type LegalDocument = 'privacy' | 'terms';

interface HomepageLegalModalProps {
  document: LegalDocument | null;
  onClose: () => void;
}

export default function HomepageLegalModal({ document, onClose }: HomepageLegalModalProps) {
  if (!document) return null;
  const isPrivacy = document === 'privacy';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-950/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={isPrivacy ? 'Privacy Policy' : 'Website Terms and Conditions'}>
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white text-stone-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-5 md:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-600">FastCheckIn</p>
            <h2 className="mt-1 text-2xl font-bold">{isPrivacy ? 'Privacy Policy' : 'Website Terms and Conditions'}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-stone-500 hover:bg-stone-100"><X className="h-6 w-6" /></button>
        </div>
        <div className="overflow-y-auto px-6 py-7 text-sm leading-7 text-stone-700 md:px-10">
          {isPrivacy ? <PrivacyContent /> : <TermsContent />}
        </div>
      </div>
    </div>
  );
}

function PrivacyContent() {
  return <div className="space-y-7">
    <p><strong>Effective date:</strong> 3 October 2026</p>
    <p>This Privacy Policy explains how Aemara Group Pty Ltd trading as FastCheckIn ("FastCheckIn", "we", "us" or "our") processes personal information collected through the FastCheckIn website, marketing forms, enquiries, demonstrations, downloadable resources and related public-facing services.</p>
    <section><h3 className="text-lg font-bold text-stone-900">1. Who we are</h3><p className="mt-2">FastCheckIn is a cloud-based software platform for accommodation establishments. For website enquiries and marketing activities, FastCheckIn acts as the responsible party for personal information collected through this website. Contact: sales@fastcheckin.co.za.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">2. Personal information we collect</h3><p className="mt-2">Depending on how you interact with us, we may collect your full name, company or property name, email address, telephone number, physical or business address, enquiry category, comments, download history, communication preferences, technical information such as IP address and browser/device information, and information you voluntarily provide. We do not ask you to submit hotel guest personal information through these public marketing forms.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">3. Why we use your information</h3><p className="mt-2">We use personal information to provide requested brochures and sample reports, respond to enquiries, arrange demonstrations or callbacks, communicate about FastCheckIn products and services where permitted, maintain business records, improve the website and resources, prevent misuse, and comply with applicable legal obligations.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">4. Lawful processing and direct marketing</h3><p className="mt-2">We process personal information in accordance with the Protection of Personal Information Act 4 of 2013 (POPIA), including its conditions for lawful processing. Where consent is required for direct marketing by unsolicited electronic communication, we will obtain the required consent and provide an appropriate way to withdraw it. A download request is not, by itself, treated as blanket consent to unrelated marketing communications.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">5. Sharing and service providers</h3><p className="mt-2">We may use trusted service providers for hosting, email delivery, analytics, security and website operations. Such providers may process information on our behalf and are required to protect it appropriately. We do not sell your personal information. We may disclose information where required by law, lawful process, or to protect our rights, users or systems.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">6. Cross-border processing</h3><p className="mt-2">Some technology and service providers may process information outside South Africa. Where applicable, FastCheckIn will take reasonable steps to ensure that cross-border transfers comply with POPIA and that appropriate safeguards are in place.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">7. Retention</h3><p className="mt-2">We retain personal information only for as long as reasonably necessary for the purposes for which it was collected, legitimate business requirements, dispute resolution, security, or applicable legal obligations. Retention periods may differ according to the nature of the record.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">8. Security</h3><p className="mt-2">We apply reasonable technical and organisational safeguards designed to protect personal information against loss, unauthorised access, disclosure, alteration or destruction. No internet transmission or storage system can be guaranteed to be completely secure.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">9. Your rights</h3><p className="mt-2">Subject to applicable law, you may request access to personal information we hold about you and request correction or deletion where legally appropriate. You may also object to or withdraw consent for processing where the applicable lawful basis is consent, and you may object to direct marketing. Requests may be sent to sales@fastcheckin.co.za.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">10. Cookies and similar technologies</h3><p className="mt-2">The website may use essential browser storage and similar technologies to remember preferences and provide requested functionality. Additional analytics or marketing technologies, if introduced, will be used subject to applicable law and the relevant consent or notice requirements.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">11. Children</h3><p className="mt-2">The public FastCheckIn website and marketing forms are intended for business users and are not directed at children. We do not knowingly solicit personal information from children through these forms.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">12. Complaints</h3><p className="mt-2">We encourage you to contact us first so that we can investigate your concern. You may also have the right to lodge a complaint with the South African Information Regulator in accordance with applicable law.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">13. Changes to this policy</h3><p className="mt-2">We may update this Privacy Policy from time to time. The effective date at the top of this policy will indicate when it was last updated. Material changes will be communicated where required by law.</p></section>
    <p className="border-t border-stone-200 pt-5 text-xs text-stone-500">This website policy is intended to reflect the South African legal framework, including POPIA and PAIA, but should be reviewed by FastCheckIn's South African legal adviser before publication as a final legal document.</p>
  </div>;
}

function TermsContent() {
  return <div className="space-y-7">
    <p><strong>Effective date:</strong> 3 October 2026</p>
    <p>These Website Terms and Conditions govern access to and use of the public FastCheckIn website and its publicly available marketing resources. They apply to Aemara Group Pty Ltd trading as FastCheckIn ("FastCheckIn", "we", "us" or "our") and each person who accesses the website ("you").</p>
    <section><h3 className="text-lg font-bold text-stone-900">1. Acceptance</h3><p className="mt-2">By using this website, requesting a brochure or sample report, or submitting an enquiry, you agree to these terms and our Privacy Policy. If you do not agree, please do not use the website or submit information through it.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">2. Website and product information</h3><p className="mt-2">FastCheckIn provides information about its software platform, features, plans and services. Website content and sample reports are provided for general information and demonstration purposes. Features, pricing, availability, integrations and service specifications may change. A sample report is illustrative and does not represent the actual performance of any customer property.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">3. Downloads and permitted use</h3><p className="mt-2">Brochures, sample snapshots and other resources may be downloaded for your internal evaluation of FastCheckIn. You may not reproduce, resell, alter, redistribute or commercially exploit FastCheckIn materials without our prior written permission, except where permitted by applicable law.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">4. Intellectual property</h3><p className="mt-2">The FastCheckIn name, branding, software, website design, text, graphics, reports, documentation and other materials are owned by or licensed to FastCheckIn and are protected by applicable intellectual-property laws. No ownership rights are transferred to you by accessing or downloading website material.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">5. Enquiries and communications</h3><p className="mt-2">Information submitted through enquiry and download forms must be accurate and must not be used to impersonate another person or submit unlawful, abusive or misleading content. We may contact you in response to an enquiry or requested resource. Marketing communications will be handled in accordance with applicable privacy and direct-marketing law.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">6. Third-party services and links</h3><p className="mt-2">The website may use or link to third-party services. FastCheckIn does not control third-party websites and is not responsible for their content, availability, security or privacy practices. Your use of third-party services is subject to their own terms.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">7. Availability and security</h3><p className="mt-2">We aim to keep the website available and secure but do not guarantee uninterrupted or error-free operation. You must not attempt to interfere with the website, bypass reasonable access controls, introduce malicious code, or use the website in a manner that could damage our systems or other users.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">8. Disclaimer</h3><p className="mt-2">To the maximum extent permitted by law, website content and marketing resources are provided on an "as is" and "as available" basis. FastCheckIn does not warrant that all information is complete, current, uninterrupted or free from errors. Compliance references are general information and do not constitute legal advice or a guarantee that a particular establishment is legally compliant.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">9. Limitation of liability</h3><p className="mt-2">To the maximum extent permitted by applicable law, FastCheckIn will not be liable for indirect, incidental, special or consequential loss arising from use of the public website or reliance on its marketing materials. Nothing in these terms excludes or limits liability that cannot lawfully be excluded or limited under South African law.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">10. Electronic communications</h3><p className="mt-2">Electronic records and communications may be used in accordance with applicable law, including the Electronic Communications and Transactions Act 25 of 2002. You should retain copies of important communications sent to you.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">11. Consumer protection</h3><p className="mt-2">Where the Consumer Protection Act 68 of 2008 applies, nothing in these terms is intended to waive or limit rights or remedies that cannot lawfully be waived or limited.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">12. Changes</h3><p className="mt-2">We may update these terms as the website, platform or legal requirements develop. Continued use after an update may constitute acceptance to the extent permitted by law.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">13. Governing law</h3><p className="mt-2">These terms are governed by the laws of the Republic of South Africa. Subject to any mandatory jurisdiction or consumer protection provisions, disputes will be dealt with by a court of competent jurisdiction in South Africa.</p></section>
    <section><h3 className="text-lg font-bold text-stone-900">14. Contact</h3><p className="mt-2">FastCheckIn, Aemara Group Pty Ltd. Email: sales@fastcheckin.co.za.</p></section>
    <p className="border-t border-stone-200 pt-5 text-xs text-stone-500">These website terms are not a substitute for a final SaaS subscription agreement, service-level agreement or other customer contract. They should be reviewed by FastCheckIn's South African legal adviser before publication.</p>
  </div>;
}
