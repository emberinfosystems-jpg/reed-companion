// @ember/legal, config-driven Terms of Service + Privacy Policy content.
// Harvested + generalized from Horizon's TermsPage (the fleet's strongest legal
// doc) into app-agnostic clauses. Each app passes a small config; the fleet
// constants (EIS entity, Oregon jurisdiction, non-extractive stance) are baked in.
//
// 🛑 TEMPLATE, NOT LEGAL ADVICE. Fine for ordinary business/utility apps. Apps
// touching PHI (HIPAA) or the Haven/DV line MUST get expert review + addenda and
// must NOT rely on this generic text. See README.

export const EIS = {
  company: 'Ember Information Systems LLC',
  short: 'EIS',
  jurisdiction: 'Oregon',
  country: 'United States',
  contactEmail: 'support@emberinformation.com',
}

// Normalize a caller config against fleet defaults.
/**
 * ── THE THREE SHAPES AN EIS APP CAN HAVE ───────────────────────────────────
 *
 * Scott, 2026-08-10: *"some apps do have email accessibility and user delete...
 * we may need 2 @ember/legal assets for this use case then."*
 *
 * Not two assets, ONE rail with named profiles. But he was right that the
 * split I had made was wrong, and there are THREE shapes, not two:
 *
 *   SAAS             account + our server.            GrantGuard.
 *   LOCAL_ONLY       no account, no server, no        Scriptorium.
 *                    personal data at all.
 *   LOCAL_CUSTODIAN  no account, no server, but the   Sessions.
 *                    USER stores other people's
 *                    personal data on their device.
 *
 * 🛑 LOCAL_CUSTODIAN is the one that is easy to get wrong and the most
 * dangerous to get wrong. Sessions has no auth library and no backend, and a
 * massage therapist using it holds client names, emails, phones and session
 * notes. Handing that user a policy that says only "we hold none of your data"
 * is technically true and practically misleading, it reassures them at the
 * exact moment they take on a duty to people who never agreed to anything.
 *
 * Spread a profile, then override:
 *   buildPrivacy({ ...PROFILES.LOCAL_CUSTODIAN, appName: 'Sessions',
 *                  thirdPartyTerm: 'clients' })
 *
 * 🛑 Nothing here is a substitute for a lawyer, and two cases must NEVER be
 * auto-wrapped: HIPAA-regulated apps need real addenda, and Haven/DV work is
 * life-safety and needs NNEDV review.
 */
export const PROFILES = {
  SAAS: { hasAccounts: true, noServer: false, localFirst: false, holdsThirdPartyData: false },
  LOCAL_ONLY: { hasAccounts: false, noServer: true, localFirst: true, holdsThirdPartyData: false },
  LOCAL_CUSTODIAN: { hasAccounts: false, noServer: true, localFirst: true, holdsThirdPartyData: true },
  /** Local storage, but syncing through a folder the user owns (iCloud/Drive/OneDrive). */
  LOCAL_SYNCED: { hasAccounts: false, noServer: true, localFirst: true, holdsThirdPartyData: false },
}

/** The "Data We Collect" table, shaped to what the app actually does. */
function defaultDataCollected(cfg) {
  const hasAccounts = cfg.hasAccounts !== false
  const who = cfg.thirdPartyTerm || 'clients'

  if (hasAccounts) {
    return [
      { category: 'Account Data', detail: 'Email and a hashed password.', retention: 'Until you delete your account.' },
      { category: 'Content You Create', detail: 'The records and data you enter into the app.', retention: 'Until you delete it or your account.' },
      { category: 'Technical Data', detail: 'App version and error logs, for debugging.', retention: 'Rolling 90 days.' },
    ]
  }

  const rows = [
    { category: 'Account Data', detail: 'None. There is no account and no sign-in.', retention: 'n/a' },
    { category: 'Your Content', detail: 'Stored on your device, under your control. Never transmitted to us.', retention: 'Kept or deleted entirely by you.' },
    { category: 'Analytics', detail: 'None. No telemetry, no usage tracking, no crash reporting.', retention: 'n/a' },
  ]
  if (cfg.holdsThirdPartyData) {
    rows.splice(1, 0, {
      category: `Records about your ${who}`,
      detail: `Names, contact details and your notes: held on your device. We never see them.`,
      retention: `Kept or deleted by you. See "Data About Your ${who[0].toUpperCase()}${who.slice(1)}" below.`,
    })
  }
  return rows
}

export function resolveConfig(cfg = {}) {
  return {
    appName: cfg.appName || 'This Application',
    tagline: cfg.tagline || 'software',
    description: cfg.description || `${cfg.appName || 'This application'} is software provided by ${EIS.company}.`,
    company: cfg.company || EIS.company,
    jurisdiction: cfg.jurisdiction || EIS.jurisdiction,
    country: cfg.country || EIS.country,
    contactEmail: cfg.contactEmail || EIS.contactEmail,
    effectiveDate: cfg.effectiveDate || 'July 2026',
    version: cfg.version || '1.0',
    minAge: cfg.minAge ?? 18,
    usesPayments: !!cfg.usesPayments,
    localFirst: cfg.localFirst !== false, // EIS default: your data is yours
    /**
     * 🛑 hasAccounts, set FALSE for an app with no sign-in at all.
     *
     * Added 2026-08-10 after Scriptorium (local-only, no account, no network)
     * generated a privacy policy promising "delete your account" and listing
     * "Email and a hashed password" as data we hold. Every word of that was
     * FALSE, and it would have been published as a statement about ourselves.
     *
     * A default that fills a blank with plausible content is worse than an
     * empty section: nobody proof-reads a section that is already written.
     * Defaults to TRUE so existing apps are unaffected.
     */
    hasAccounts: cfg.hasAccounts !== false,
    /** No server at all, nothing is transmitted, so nothing is retained by us. */
    noServer: !!cfg.noServer,
    /**
     * 🛑 holdsThirdPartyData, the app stores personal data about people who
     * are NOT the user. Clients, patients, tenants, students.
     *
     * Added 2026-08-10 because Scott caught a false split. I had assumed two
     * shapes, SaaS with accounts, and local-only with nothing. SESSIONS is
     * neither: it has no account and no server, but a massage therapist using
     * it holds their clients' names, emails, phones and session notes on their
     * own device. Legally that is the SHARPEST case of the three, and both of
     * my first two profiles got it wrong: "we hold none of your data" is true
     * of us and silent about the duty the USER has just taken on.
     */
    holdsThirdPartyData: !!cfg.holdsThirdPartyData,
    /** What those third parties are called in this app's world. */
    thirdPartyTerm: cfg.thirdPartyTerm || 'clients',
    /**
     * The flaming-shark footnote in Dispute Resolution. On by default because
     * EIS terms should have a heartbeat, but a named opt-out, because a
     * regulated, DV, or enterprise policy has to read dead straight. HIPAA and
     * Haven profiles force it off below regardless of what is passed.
     */
    easterEgg: cfg.easterEgg !== false && !cfg.regulated && !cfg.lifeSafety,
    /**
     * 🛑 THE DEFAULT MUST MATCH THE SHAPE OF THE APP.
     *
     * This was a single SaaS-shaped list, and it leaked. Setting
     * hasAccounts:false correctly removed the account SENTENCES from Retention
     * and Rights, and the "Data We Collect" TABLE still announced "Account
     * Data, email and a hashed password" for an app with no sign-in.
     * Caught only by testing the profile with no other overrides, which is
     * exactly how a future app will use it.
     *
     * Second time in one day that a helpful default filled a blank with a
     * false statement. A default is not neutral, it is a claim nobody
     * proof-read.
     */
    dataCollected: cfg.dataCollected || defaultDataCollected(cfg),
    addenda: cfg.addenda || [],
    // Open-source credits. See buildAttributions() below.
    attributions: cfg.attributions || [],
    /**
     * 🛑 Subprocessors, third parties that touch user data (Stripe, Supabase,
     * an email/SMS relay, an AI API). App-Store data-safety forms ask for this
     * explicitly, so the policy must name them. Shape: { name, purpose }.
     * Empty by default, a local-only app has none, and a fabricated name here
     * would be a false statement about who sees the user's data.
     */
    subprocessors: cfg.subprocessors || [],
    /**
     * 🛑 "How You Get This App" clause (Scott, 2026-09-20, "bake into every PP
     * from now on"). Describes the EIS SALES channel, not in-app collection, so
     * it does NOT change an app-store Data Safety declaration.
     *   storeDistribution, the app is distributed through an app store (the
     *     store is merchant of record; we receive no name/email/payment). Default
     *     tracks the app shape: TRUE for no-account apps (mobile/store), FALSE for
     *     SaaS (which is not sold through a store, saying so would be false).
     *   directSales, a user may buy directly from EIS now or in future (we
     *     collect their email + a purchase record; Stripe processes payment and
     *     we never see or store card details). On by default (a company-level fact).
     *   showHowYouGet, master switch to suppress the whole section.
     */
    storeDistribution: cfg.storeDistribution ?? (cfg.hasAccounts === false),
    directSales: cfg.directSales !== false,
    showHowYouGet: cfg.showHowYouGet !== false,
    /**
     * "provide what the model invents" (2026-09-25). The forge destructures
     * `const { branding } = resolveConfig(...)` and then reads `branding.primary` /
     * `branding.accent` — passing it as `<ThemeProvider brand={branding.primary}>`
     * (43 refs across the fleet; weblesshound Hunt.jsx crashed on `branding.primary`
     * of undefined). resolveConfig had no `branding` key, so carry a real one with the
     * EIS palette so the read resolves to true brand colors instead of throwing.
     * Values mirror @canopy/ui Theme tokens (light palette).
     */
    branding: cfg.branding || {
      name: cfg.appName || 'This Application',
      primary: '#E8843C', accent: '#E8843C', secondary: '#3C6FE8',
      danger: '#E5484D', success: '#43B581',
      colors: {
        background: '#f7f3e8', surface: '#ffffff', card: '#ffffff',
        onSurface: '#241f1a', onBackground: '#241f1a',
        primary: '#E8843C', accent: '#E8843C', border: '#e5ddcf', muted: '#6b6155',
      },
    },
  }
}

/**
 * Open Source & Attributions section.
 *
 * Added 2026-08-10. Scott: *"I am HUGE on credit where credit is due."*
 *
 * Two jobs, and only the first is optional:
 *
 * 1. THANKS. MIT/Apache/ISC ask for a notice, not gratitude. We name the authors
 *    anyway, because an EIS app is mostly other people's work and pretending
 *    otherwise is a lie told by omission.
 *
 * 2. 🛑 COPYLEFT COMPLIANCE. LGPL/MPL libraries carry real obligations, the user
 *    must be able to REPLACE that library with their own build. Any entry marked
 *    `relinkable: true` gets its obligations spelled out explicitly, in the Terms,
 *    where nobody has to email us to find them.
 *
 * Every app in the fleet ships open source. Several currently credit none of it.
 * Passing `attributions` fixes that in one line per app.
 *
 * Entry shape:
 *   { name, version, license, author?, repo?, what?, thanks?,
 *     relinkable?: boolean, obligations?: string[] }
 */
export function buildAttributions(cfg) {
  const c = resolveConfig(cfg)
  if (!c.attributions.length) return null

  const copyleft = c.attributions.filter((a) => a.relinkable)
  const body = [
    `${c.appName} is built on open-source software written by other people. ` +
    `It would not exist without them. Each library below is listed with its author, ` +
    `licence and project link.`,
  ]

  body.push({
    list: c.attributions.map((a) => {
      const bits = [`${a.name} ${a.version || ''}`.trim()]
      if (a.author) bits.push(`by ${a.author}`)
      bits.push(`,  ${a.license}`)
      if (a.what) bits.push(`· ${a.what}`)
      if (a.repo) bits.push(`· ${a.repo}`)
      return bits.join(' ')
    }),
  })

  const thanked = c.attributions.filter((a) => a.thanks)
  if (thanked.length) {
    body.push('With particular thanks to:')
    body.push({ list: thanked.map((a) => `${a.author || a.name}, ${a.thanks}`) })
  }

  if (copyleft.length) {
    body.push(
      'Some of these libraries are copyleft-licensed, which means you have the right ' +
      'to replace them with your own build. We support that, and here is exactly how ' +
      'we have made it possible:',
    )
    for (const a of copyleft) {
      body.push(`${a.name} (${a.license}), ${a.repo || ''}`)
      body.push({ list: a.obligations || [
        'Source is shipped with the application and is not minified.',
        'You may substitute your own build of this library.',
        'Reverse engineering for the purpose of debugging is permitted.',
      ] })
    }
    body.push(
      `If you want the source for any library above and cannot find it in the ` +
      `application folder, email ${c.contactEmail} and we will send it to you at no charge.`,
    )
  }

  return { id: 'attributions', title: 'Open Source & Attributions', body }
}

/**
 * 🦈 EXHIBIT Z, THE CARCHARODON IGNIS PROTOCOL.
 *
 * The full flaming-shark arbitration clause, restored 2026-08-12 at Scott's
 * insistence after I shipped a limp one-line version. His words: *"the original
 * was so much cooler, it went full ham."* He is right, and a thing worth doing
 * as a joke is worth doing at full commitment.
 *
 * 🛑 IT STAYS SAFE BY BEING LOUD, NOT BY BEING SMALL. Section 3 declares, in
 * capitals, that the entire Exhibit is null, void and of no legal force, and
 * bars any Party from citing it. That disclaimer is the ONLY reason a parody
 * clause belongs in a real terms document, remove it and this becomes a
 * genuine problem. So the disclaimer is non-negotiable and always renders.
 *
 * Returns null when the easter egg is off (regulated / lifeSafety), so nothing
 * that must read straight ever carries it. Company + venue interpolate.
 */
export function buildExhibitZ(cfg) {
  const c = resolveConfig(cfg)
  if (!c.easterEgg) return null
  return {
    id: 'exhibit-z',
    title: 'Exhibit Z: Shark Wrestling Protocol (Non-Binding)',
    body: [
      { html: '<strong>Section 1. Standard Arbitration.</strong> Except as expressly modified by this Section, all disputes arising out of or relating to this Agreement shall be resolved exclusively through binding arbitration administered by a recognized arbitral body (e.g. JAMS or AAA) in accordance with its Commercial Arbitration Rules, before a single neutral arbitrator, in the venue specified above, and judgment upon the award may be entered in any court having jurisdiction. The arbitrator shall have exclusive authority to resolve any threshold arbitrability issues, including the validity, enforceability, or scope of this arbitration provision.' },
      { html: '<strong>Section 2. Fallback Extraordinary Dispute Resolution, The Carcharodon Ignis Protocol.</strong> Notwithstanding the foregoing, in the event that the standard arbitration proceeding set forth in Section 1:' },
      { list: [
        '(a) fails to empanel an arbitrator within ninety (90) days of the initial demand;',
        '(b) results in a deadlock or tie vote by a panel of three (3) arbitrators that remains unresolved for thirty (30) days following the close of briefing; or',
        '(c) is otherwise determined by the Parties, in mutual written agreement, to be in extremis and incapable of rendering a final, enforceable award;',
      ] },
      'then, and only then, the Parties shall submit the dispute to a final, sui generis, extra-jurisdictional proceeding known as the Flaming Shark Wrestling Adjudication (“FSWA”).',
      { html: '<strong>Section 2.1. The Contest.</strong> In lieu of written briefs, witnesses, or evidentiary hearings, each Party shall select one (1) representative (the “Wrestler”) to engage in unarmed, hand-to-fin combat with a genetically or magically ignited Selachimorpha specimen (the “Flame Shark”), in a controlled aqueous arena measuring no less than one (1) Olympic-sized swimming pool in volume. The Flame Shark shall possess a continuous surface combustion of at least 500°C, as measured by a Type-K thermocouple affixed to its dorsal fin. Victory shall be determined by: (i) pinning the Flame Shark’s ventral surface to the pool floor for a count of three (3) seconds; (ii) causing the Flame Shark to extinguish its own flames by active submission (audible or visible sign of surrender); or (iii) the Flame Shark’s unambiguous incapacitation, as certified by a licensed xenoveterinarian.' },
      { html: '<strong>Section 2.2. Presiding Authority, Currellian-Level Civilization.</strong> The FSWA shall be presided over by a single adjudicator representing a civilization no less advanced than Level Three (3) on the Kardashev-Sagan-Galactic Scale, as defined by the most recent publication of the Galactic Council’s Compendium of Sentient Advancement (GC Pub. No. 404, rev. 12.0). Such adjudicator must hold, at a minimum, the diplomatic standing of a Currellian Emissary, defined as a sentient entity that has (i) achieved interstellar civil engineering over a minimum of three (3) star systems, (ii) successfully petitioned the Galactic Council for observer status for no fewer than five (5) standard galactic cycles, and (iii) demonstrated fluency in at least one (1) non-verbal telepathic matrix recognized under Council Rule 7.3(b). The presiding adjudicator shall have sole and absolute discretion to:' },
      { list: [
        'Set the duration and rules of engagement;',
        'Summon auxiliary Flame Sharks in the event of premature extinction;',
        'Render a final oral award immediately upon conclusion of the wrestling, which award shall be transcribed by holographic glyph and telepathically broadcast to both Parties; and',
        'Enforce the award via any means consistent with its home civilization’s extra-atmospheric enforcement protocols, provided such means do not violate the Prime Directive of Non-Interference with Class-1 civilizations.',
      ] },
      { html: '<strong>Section 2.3. Costs and Logistics.</strong> All costs, including but not limited to Flame Shark acquisition, arena heating, fire-retardant safety suits, intergalactic travel for the adjudicator, and translation services for Currellian glyph-speech, shall be borne equally by the Parties, unless the adjudicator awards full costs to the prevailing Wrestler as part of its final declaration.' },
      { html: '<strong>Section 3. Solemn Disclaimer, No Legal Force Whatsoever.</strong> NOTWITHSTANDING THE ELOQUENT AND PAINSTAKING DRAFTING OF SECTION 2 AND ITS SUBSECTIONS, THE FOREGOING FLAMING SHARK WRESTLING PROTOCOL IS EXPRESSLY DECLARED TO BE NULL, VOID, AND OF NO LEGAL EFFECT WHATSOEVER. It shall not supersede, amend, or otherwise affect the binding standard arbitration set forth in Section 1. No Party may invoke, cite, or rely upon Section 2 in any motion, pleading, or proceeding before any terrestrial or extraterrestrial court, tribunal, or council. The FSWA exists solely and exclusively as an ornamental easter egg, included for the amusement, curiosity, and mild bewilderment of those diligent enough to peruse the fine print of this Agreement.' },
      { html: '<em>You are now one of those persons. Well done. No refunds, no appeals, and no actual sharks will be harmed in the reading of this clause.</em>' },
    ],
  }
}

// ── Terms of Service ────────────────────────────────────────────────────────
export function buildTerms(cfg) {
  const c = resolveConfig(cfg)
  const S = []
  S.push({ id: 'acceptance', num: '1', title: 'Acceptance of Terms', body: [
    `By accessing, downloading, installing, or using ${c.appName} ("the Service"), you agree to be bound by these Terms of Service ("Terms") and all applicable laws. If you do not agree, you may not use the Service.`,
    { html: `These Terms are a legally binding agreement between you and <strong>${c.company}</strong> ("${EIS.short}," "we," "us," or "our"), a limited liability company operating under the laws of the State of ${c.jurisdiction}, ${c.country}.` },
    'We may modify these Terms at any time. Continued use after changes take effect constitutes acceptance of the revised Terms.',
  ] })
  S.push({ id: 'service', num: '2', title: 'Description of Service', body: [
    c.description,
    `${c.appName} is provided as-is for its stated purpose. It is not affiliated with any incumbent product; any similarity to existing tools is incidental.`,
  ] })
  S.push({ id: 'eligibility', num: '3', title: 'Eligibility', body: [
    `You must be at least ${c.minAge} years of age and have the legal capacity to enter into binding agreements in your jurisdiction. You warrant that all information you provide is accurate and current.`,
  ] })
  // 🛑 Flag-aware, same reason as the privacy sections: an app with no sign-in
  // must not tell the user to guard "login credentials" they were never issued.
  if (c.hasAccounts) {
    S.push({ id: 'accounts', num: '4', title: 'Accounts & Credentials', body: [
      'You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. Notify us immediately of any unauthorized access.',
      { html: '<strong>Account Deletion:</strong> You may permanently delete your account at any time from the app. Deletion is irreversible. Obligations arising before deletion survive it.' },
    ] })
  } else {
    S.push({ id: 'accounts', num: '4', title: 'No Account Needed', body: [
      `${c.appName} has no account and no sign-in. Nothing you do is tied to an identity we hold, because we hold none.`,
      ...(c.holdsThirdPartyData
        ? [`Because there is no login, anyone who can use this device can use ${c.appName} and open whatever is stored in it. Protecting that access is yours to manage, see the privacy notice on records about other people.`]
        : [`Because there is no login, anyone who can use this device can use ${c.appName}. Protecting access to the device is up to you.`]),
    ] })
  }
  S.push({ id: 'conduct', num: '5', title: 'Acceptable Use', body: [
    'You agree not to:',
    { list: [
      'Use the Service for any unlawful purpose or in violation of any regulation',
      'Attempt to gain unauthorized access to systems, data, or other users’ accounts',
      'Interfere with, disrupt, or reverse-engineer the Service except as permitted by law',
      'Upload malicious code or misuse the Service to harm others',
      'Circumvent usage limits, security, or access controls',
    ] },
    'Violations may result in suspension or permanent termination of your access.',
  ] })
  if (c.usesPayments) {
    S.push({ id: 'payment', num: String(S.length + 1), title: 'Payment Terms', body: [
      { html: '<strong>Payment Processing:</strong> Card details are processed and stored exclusively by <strong>Stripe, Inc.</strong> We never store raw card numbers, only tokenized references and transaction records.' },
      'Fees for paid tiers are disclosed at the point of purchase. Subscriptions renew until cancelled. You may cancel at any time; access continues through the end of the paid period.',
      'Refund requests must be made within 14 days of a charge. We may issue refunds at our discretion. Fraudulent disputes may result in account suspension.',
    ] })
  }
  S.push({ id: 'ip', num: String(S.length + 1), title: 'Intellectual Property', body: [
    { html: `The Service: including its source code, design, and branding, is the intellectual property of ${c.company}, protected under applicable copyright, trademark, and trade-secret law.` },
    'Content you create in the Service remains yours. You grant us only the limited licence necessary to store and display it back to you in order to operate the Service.',
  ] })
  S.push({ id: 'warranty', num: String(S.length + 1), title: 'Disclaimers', body: [
    { html: 'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.' },
    'We do not warrant that the Service will be uninterrupted, error-free, or that it will meet any regulatory or business outcome. You are responsible for verifying that your use meets your own legal and professional obligations.',
  ] })
  S.push({ id: 'liability', num: String(S.length + 1), title: 'Limitation of Liability', body: [
    { html: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, ${c.company.toUpperCase()} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, PROFITS, OR REVENUE, ARISING FROM YOUR USE OF THE SERVICE.` },
    'Where liability cannot be excluded, it is limited to the amount you paid us for the Service in the twelve months preceding the claim.',
  ] })
  // 🛑 DRAFT wording, pending licensed-attorney review (added 2026-08-31; see a consuming app's
  // LEGAL_REVIEW_PROMPT_PACK). The second clause is deliberate: force majeure must NOT waive a
  // mandatory legal duty (e.g. breach-notification), so it says so.
  S.push({ id: 'forcemajeure', num: String(S.length + 1), title: 'Force Majeure', body: [
    'Neither party is liable for any failure or delay in performance caused by events beyond its reasonable control, including natural disasters, fire, flood, power or network failures, destruction of infrastructure, acts of government, war, civil unrest, labor disputes, or other events that could not reasonably be foreseen or prevented.',
    'This does not excuse any obligation that applicable law requires to be performed regardless of such events (for example, mandatory data-breach-notification duties), which continue to apply.',
  ] })
  S.push({ id: 'dispute', num: String(S.length + 1), title: 'Dispute Resolution', body: [
    { html: '<strong>Informal Resolution First.</strong> Most disputes can be resolved by contacting us. Please reach out before initiating formal proceedings.' },
    { html: `<strong>Governing forum.</strong> Any dispute not resolved informally shall be brought in the state or federal courts located in ${c.jurisdiction}, ${c.country}, and you consent to their jurisdiction, except where applicable law grants you the right to your local forum.` },
    // The full protocol is its own Exhibit, below, when the easter egg is on , 
    // just a quiet breadcrumb here so a diligent reader knows to keep going.
    ...(c.easterEgg ? [{ html: '<em>See also Exhibit Z, below, for the fallback dispute-resolution protocol. It has no legal effect and is the best thing in this document.</em>' }] : []),
  ] })
  S.push({ id: 'termination', num: String(S.length + 1), title: 'Termination', body: [
    'You may stop using the Service at any time. We may suspend or terminate access for violation of these Terms or as required by law. Provisions that by their nature should survive termination (ownership, disclaimers, liability limits) survive.',
  ] })
  S.push({ id: 'governing', num: String(S.length + 1), title: 'Governing Law', body: [
    `These Terms are governed by the laws of the State of ${c.jurisdiction}, ${c.country}, without regard to conflict-of-law principles.`,
  ] })
  for (const a of c.addenda) S.push({ id: 'addendum-' + a.title.toLowerCase().replace(/\W+/g, '-'), num: String(S.length + 1), title: a.title, body: Array.isArray(a.body) ? a.body : [a.body] })
  // Open-source credits + copyleft obligations. Sits before Contact so the
  // "email us for source" line lands next to the contact details.
  const attrib = buildAttributions(cfg)
  if (attrib) S.push({ ...attrib, num: String(S.length + 1) })
  // 🦈 Exhibit Z, the whole glorious Carcharodon Ignis Protocol. Comes AFTER
  // attributions and BEFORE contact, so the last thing a fine-print reader
  // meets before the email address is the flaming shark. Off for regulated/DV.
  const zed = buildExhibitZ(c)
  if (zed) S.push({ ...zed, num: 'Z' })
  S.push({ id: 'contact', title: 'Contact', body: [
    { html: `Questions about these Terms? Contact <a href="mailto:${c.contactEmail}">${c.contactEmail}</a>.` },
  ] })

  // 🛑 RENUMBER LAST. Sections were pushed with ad-hoc `String(S.length + 1)`,
  // which counted Exhibit Z, so with the shark present the run read 12 → Z →
  // "14", skipping 13. Fixed 2026-08-12 (Scott caught it on EquityBridge): a
  // single final pass numbers the ordinary sections 1..n in order, and Exhibit
  // Z keeps its literal 'Z' without consuming a number. Now correct whether the
  // easter egg, payments, or any addenda are present or not.
  let n = 0
  for (const s of S) s.num = s.id === 'exhibit-z' ? 'Z' : String(++n)
  return S
}

// ── Privacy Policy ──────────────────────────────────────────────────────────
export function buildPrivacy(cfg) {
  const c = resolveConfig(cfg)
  const S = []
  S.push({ id: 'overview', num: '1', title: 'Our Commitment', body: [
    { html: `${c.company} builds ${c.appName} on a simple promise: <strong>your data is yours.</strong> We do not sell your personal data. We do not engage in behavioral advertising. We do not build advertising profiles.` },
    'This policy explains what we collect, why, how long we keep it, and the rights you have over it.',
  ] })
  S.push({ id: 'collect', num: '2', title: 'Data We Collect', body: [
    'We collect only what the Service needs to function:',
    { table: c.dataCollected },
  ] })
  S.push({ id: 'use', num: '3', title: 'How We Use Data', body: [
    'We use your data solely to operate the Service: to authenticate you, to store and display the content you create, to process payments where applicable, and to debug and improve reliability. We do not use it for any purpose you would not reasonably expect.',
  ] })
  S.push({ id: 'sharing', num: '4', title: 'Data Sharing', body: [
    { html: '<strong>We do not sell your data.</strong> We share it only where strictly necessary to run the Service, or where legally compelled:' },
    { list: [
      ...(c.usesPayments ? ['Stripe, Inc.: to process payments (they never share your card number with us)'] : []),
      ...c.subprocessors.map((s) => `${s.name}, ${s.purpose}`),
      'Service providers strictly bound to operate the Service on our behalf',
      'Authorities, only where required by valid legal process',
    ] },
    ...(c.subprocessors.length
      ? [{ html: `The named parties above are our <strong>subprocessors</strong>: the complete list of outside services that may process your data on our behalf.` }]
      : []),
  ] })
  // 🛑 The §5 exception points to "Section 11" (Connectivity & Consent), TRUE for the standard
  // 2-addendum layout (Outbound=10, Connectivity=11), e.g. GrantHarbor. An app with a different
  // addenda count will renumber; per-app legal rail variants (Scott, 09-10) are the fix for that.
  S.push({ id: 'retention', num: '5', title: 'Data Retention', body: [
    c.noServer
      ? 'We retain nothing, because nothing reaches us. Your files stay on your device and are kept or deleted entirely by you, unless it is connected to a specific feature you have requested of us (see Section 11 below for details).'
      : 'We keep data only as long as needed for the purpose it was collected:',
    ...(c.noServer ? [] : [{ table: c.dataCollected.map((d) => ({ category: d.category, detail: d.retention })) }]),
    ...(c.hasAccounts
      ? ['When you delete your account, associated data is removed, except records we are legally required to retain.']
      : []),
  ] })
  S.push({ id: 'rights', num: '6', title: 'Your Rights', body: [
    c.hasAccounts
      ? 'You have the right to:'
      : 'These rights exist wherever a company holds your personal data. In this application they are already satisfied by design, because we hold none of it:',
    { list: [
      c.hasAccounts
        ? 'Access: request a copy of the data we hold about you'
        : 'Access: everything is in your own files, on your own device',
      c.hasAccounts
        ? 'Correction: fix inaccurate personal data'
        : 'Correction: edit your files directly; we have no copy to correct',
      c.hasAccounts
        ? 'Erasure: delete your account and associated data'
        : 'Erasure: delete the files, or uninstall. There is no account and nothing held elsewhere',
      c.hasAccounts
        ? 'Portability: export your data in a machine-readable format (JSON/CSV)'
        : 'Portability: your data never left a standard file format to begin with',
      'Restriction & Objection: limit or object to certain processing',
    ] },
    { html: `To exercise any of these, or to ask a question, contact <a href="mailto:${c.contactEmail}">${c.contactEmail}</a>. We respond within 30 days.` },
  ] })
  S.push({ id: 'security', num: '7', title: 'Security', body: [
    c.noServer
      ? 'There is no server to breach and no database of users to leak, because neither exists. The security of your files is the security of your own device, so keep it locked and backed up, and be as careful with the files you export as you would with the originals.'
      : 'We protect your data with industry-standard measures: passwords are hashed, data in transit is encrypted, and access is restricted. No system is perfectly secure, but we design to minimize what is exposed if something fails.',
  ] })
  if (c.localFirst) {
    S.push({ id: 'localfirst', num: '8', title: 'Local-First by Design', body: [
      { html: `${c.appName} is built local-first: wherever possible, your data lives on your device or your own instance rather than a central server we mine. This is a deliberate architectural choice, not a marketing line.` },
    ] })
  }

  /**
   * 🛑 THE SECTION THAT EXISTS BECAUSE "WE HOLD NOTHING" IS ONLY HALF THE TRUTH.
   * If the app stores records about other people, the user has become the
   * custodian of someone else's personal data. Saying only "your data never
   * leaves your device" is technically accurate and practically misleading:
   * it reassures the user at the exact moment they take on a duty to people
   * who are not in the room and never agreed to anything.
   */
  if (c.holdsThirdPartyData) {
    const who = c.thirdPartyTerm
    S.push({ id: 'thirdparty', num: '9', title: `Data About Your ${who[0].toUpperCase()}${who.slice(1)}`, body: [
      `${c.appName} stores records about people other than you, names, contact details and the notes you write. Those people are not our users and have never agreed to anything with us. We never see their information.`,
      `That means you, not us, are the custodian of it. Practically:`,
      { list: [
        `Your ${who} generally have the right to see what you hold about them, to correct it, and in many places to have it deleted.`,
        `Keep only what you actually need, and for no longer than you need it.`,
        `Anyone with access to this device has access to these records. Use a screen lock and full-disk encryption.`,
        `Exports and backups are plain copies with none of the app's protections, treat an exported file exactly as carefully as the originals.`,
        `If you lose the device, treat it as a data breach and act accordingly.`,
      ] },
      { html: `<strong>This is general information, not legal advice.</strong> Health, financial, legal and children's records carry additional obligations in most jurisdictions, HIPAA, GDPR, state privacy laws and professional licensing rules may all apply to you even though they do not apply to us. If your ${who}' records fall into one of those categories, get advice specific to your practice.` },
    ] })
  }
  S.push({ id: 'children', num: String(S.length + 1), title: 'Children’s Privacy', body: [
    `The Service is not directed to children under ${Math.max(c.minAge, 13)}, and we do not knowingly collect their data. If you believe a child has provided us data, contact us and we will delete it.`,
  ] })
  for (const a of c.addenda) S.push({ id: 'p-addendum-' + a.title.toLowerCase().replace(/\W+/g, '-'), num: String(S.length + 1), title: a.title, body: Array.isArray(a.body) ? a.body : [a.body] })
  // 🛑 How You Get This App, standard direct-purchase clause. Store purchases vs
  // buying directly from EIS. Describes the SALES channel, not in-app collection.
  if (c.showHowYouGet) {
    const getBody = []
    if (c.storeDistribution) {
      getBody.push(
        `You can get ${c.appName} from an app store such as Google Play, and you may also be able to buy it directly from ${c.company} in the future. When you get it through a store, that store handles the purchase under its own terms, and we do not receive your name, email, or payment information from it.`,
      )
    }
    if (c.directSales) {
      getBody.push({ html:
        `If you ever buy ${c.appName} or an add-on <strong>directly from ${c.company}</strong>, for example through our own website, we collect the email address you give us and keep a record of the purchase so we can deliver it and support it. In that case payment is handled by our payment processor, <strong>Stripe, Inc.</strong>, and we never see or store your card details.`,
      })
    }
    if (getBody.length) {
      getBody.push('We do not use any of this to advertise to you or to build a profile.')
      S.push({ id: 'howget', num: String(S.length + 1), title: 'How You Get This App', body: getBody })
    }
  }
  S.push({ id: 'changes', num: String(S.length + 1), title: 'Changes to This Policy', body: [
    'We may update this policy. Material changes will be surfaced in the app. The effective date below reflects the latest version.',
  ] })
  S.push({ id: 'p-contact', num: String(S.length + 1), title: 'Contact', body: [
    { html: `Privacy questions? Contact <a href="mailto:${c.contactEmail}">${c.contactEmail}</a>.` },
  ] })
  return S
}

// ── Support ─────────────────────────────────────────────────────────────────
/**
 * The third pillar the App-Store gate requires alongside Terms + Privacy
 * (LEGAL_COMPLIANCE_SOP). Config-driven like the others; `supportEmail` defaults
 * to the contact email, `faq` is an optional [{ q, a }] list, `responseHours`
 * sets the reply-time promise. Deliberately short, a support page nobody can
 * find help on is worse than none.
 */
/**
 * buildContactUs(cfg) → a small contact-info OBJECT (not sections): email + support hours + expected
 * response. Accessed as fields, e.g. buildContactUs().support_hours. cfg is optional (defaults apply).
 * Added 2026-09-19, the forge emitted it as a sibling of buildSupport and failed to build without it.
 */
export function buildContactUs(cfg) {
  const c = resolveConfig(cfg || {})
  const email = (cfg && cfg.supportEmail) || c.contactEmail
  const hours = (cfg && cfg.responseHours) || 48
  return {
    email,
    support_email: email,
    support_hours: (cfg && cfg.supportHours) || 'Mon-Fri, 9am-5pm PT',
    expected_response_time: `within ${hours} hours`,
    company: c.company,
  }
}

export function buildSupport(cfg) {
  const c = resolveConfig(cfg)
  const email = cfg.supportEmail || c.contactEmail
  const S = []
  S.push({ id: 's-help', num: '1', title: `Getting Help with ${c.appName}`, body: [
    { html: `The fastest way to reach a human is email: <a href="mailto:${email}?subject=${encodeURIComponent(c.appName + ' support')}">${email}</a>. We aim to reply within ${cfg.responseHours || 48} hours.` },
    ...(cfg.bugCricket !== false
      ? [`To report a bug from inside the app, use the 🦗 in Settings: it prefills your app version and platform so we can reproduce it faster.`]
      : []),
  ] })
  if (Array.isArray(cfg.faq) && cfg.faq.length) {
    S.push({ id: 's-faq', num: '2', title: 'Frequently Asked', body: cfg.faq.flatMap((f) => [{ html: `<strong>${f.q}</strong>` }, f.a]) })
  }
  S.push({ id: 's-data', num: String(S.length + 1), title: 'Your Data & Deletion Requests', body: [
    c.noServer
      ? `${c.appName} keeps your data on your device, to delete it, remove it in the app or uninstall. We hold nothing to delete on our end.`
      : `To export or permanently delete your data, use the controls in the app, or email ${email} and we will action it within 30 days. You can request deletion in-app and by email, you never have to keep an account to leave.`,
  ] })
  S.push({ id: 's-status', num: String(S.length + 1), title: 'Known Issues & Updates', body: [
    `Material changes and known issues are surfaced in the app. ${c.appName} is version ${c.version}, effective ${c.effectiveDate}.`,
  ] })
  S.push({ id: 's-contact', num: String(S.length + 1), title: 'Contact', body: [
    { html: `${c.company} · <a href="mailto:${email}">${email}</a>` },
  ] })
  return S
}
