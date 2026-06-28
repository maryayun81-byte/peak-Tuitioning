'use client'

/**
 * ExamWritingEditor — Purpose-built functional writing editor for KCSE / CBC / Kenya examinations.
 *
 * ALLOWED: Bold, Italic, Underline, Lists, Alignment, Indent, Tables, HR, Signature lines
 * BLOCKED: Fonts, font sizes, colours, highlights, external links, emojis, paste-with-formatting
 *
 * Templates — English (KCSE / CBC):
 *   Formal Letter, Report, Speech, Memo, Minutes, Diary, Notice, Essay, Article, Summary
 *
 * Templates — Kiswahili (KCSE / CBC):
 *   Barua Rasmi, Barua Binafsi, Ripoti, Hotuba, Tangazo, Kumbukumbu za Mkutano,
 *   Wasifu, Insha (Hoja / Maelezo / Masimulizi / Wasifu / Kubuni / Mdahalo), Jedwali, Notisi
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, Indent, Outdent, Minus, Table2, ChevronDown, FileText
} from 'lucide-react'

// ─── Template bank ─────────────────────────────────────────────────────────────
const TEMPLATE_GROUPS: { group: string; lang: 'en' | 'sw'; items: Record<string, { label: string; html: string }> }[] = [
  {
    group: 'English — Functional Writing',
    lang: 'en',
    items: {
      letter: {
        label: 'Formal Letter',
        html: `<p><strong>Sender's Name</strong><br>Sender's Address,<br>Town / City,<br><em>DD Month YYYY</em></p>
<p>&nbsp;</p>
<p>The Recipient's Name,<br>Title / Position,<br>Organisation,<br>Address.</p>
<p>&nbsp;</p>
<p>Dear Sir/Madam,</p>
<p>&nbsp;</p>
<p><strong>RE: SUBJECT OF THE LETTER</strong></p>
<p>&nbsp;</p>
<p>Body paragraph 1…</p>
<p>&nbsp;</p>
<p>Body paragraph 2…</p>
<p>&nbsp;</p>
<p>Yours faithfully / sincerely,</p>
<p>&nbsp;</p>
<p>________________________</p>
<p><strong>Your Full Name</strong></p>`
      },
      report: {
        label: 'Report',
        html: `<p style="text-align:center"><strong>TITLE OF THE REPORT</strong></p>
<p>&nbsp;</p>
<p><strong>1. INTRODUCTION</strong></p>
<p>Background information and purpose of this report…</p>
<p>&nbsp;</p>
<p><strong>2. FINDINGS</strong></p>
<p>2.1 First finding…</p>
<p>2.2 Second finding…</p>
<p>&nbsp;</p>
<p><strong>3. RECOMMENDATIONS</strong></p>
<p>3.1 First recommendation…</p>
<p>3.2 Second recommendation…</p>
<p>&nbsp;</p>
<p><strong>4. CONCLUSION</strong></p>
<p>Summary and concluding remarks…</p>
<p>&nbsp;</p>
<p>Prepared by: ________________________</p>
<p>Date: ________________________</p>`
      },
      speech: {
        label: 'Speech',
        html: `<p style="text-align:center"><strong>TITLE OF SPEECH</strong></p>
<p>&nbsp;</p>
<p>Good morning / afternoon, [Chairperson / Honourable guests / Ladies and Gentlemen].</p>
<p>&nbsp;</p>
<p>My name is <strong>[Your Name]</strong> and today I will be speaking about…</p>
<p>&nbsp;</p>
<p><em>Body — Point 1</em></p>
<p>First and foremost, …</p>
<p>&nbsp;</p>
<p><em>Body — Point 2</em></p>
<p>Furthermore, …</p>
<p>&nbsp;</p>
<p><em>Conclusion</em></p>
<p>In conclusion, I would like to emphasise…</p>
<p>&nbsp;</p>
<p>Thank you.</p>`
      },
      memo: {
        label: 'Memorandum',
        html: `<p style="text-align:center"><strong>MEMORANDUM</strong></p>
<p>________________________</p>
<p>&nbsp;</p>
<p><strong>TO:</strong>&nbsp;&nbsp;&nbsp;&nbsp; [Recipient / Department]</p>
<p><strong>FROM:</strong>&nbsp;&nbsp; [Your Name / Title]</p>
<p><strong>DATE:</strong>&nbsp;&nbsp;&nbsp; [DD Month YYYY]</p>
<p><strong>SUBJECT:</strong> [Clear concise subject]</p>
<p>________________________</p>
<p>&nbsp;</p>
<p>Body of the memo…</p>
<p>&nbsp;</p>
<p>Further details…</p>
<p>&nbsp;</p>
<p>Action required / conclusion…</p>`
      },
      minutes: {
        label: 'Minutes of a Meeting',
        html: `<p style="text-align:center"><strong>MINUTES OF THE [NAME] MEETING</strong></p>
<p>&nbsp;</p>
<p><strong>Date:</strong> [DD Month YYYY]&nbsp;&nbsp;&nbsp;&nbsp;<strong>Venue:</strong> [Location]&nbsp;&nbsp;&nbsp;&nbsp;<strong>Time:</strong> [HH:MM]</p>
<p>&nbsp;</p>
<p><strong>Members Present:</strong></p>
<ol><li>[Name] — Chairperson</li><li>[Name] — Secretary</li><li>[Name]</li></ol>
<p>&nbsp;</p>
<p><strong>Agenda:</strong></p>
<ol><li>Opening</li><li>Matters Arising</li><li>Main Agenda</li><li>Any Other Business</li><li>Closure</li></ol>
<p>&nbsp;</p>
<p><strong>1. Opening</strong></p>
<p>The Chairperson called the meeting to order at [time]…</p>
<p>&nbsp;</p>
<p><strong>Resolutions:</strong></p>
<ul><li>It was resolved that…</li></ul>
<p>&nbsp;</p>
<p>The meeting was adjourned at [time].</p>
<p>&nbsp;</p>
<p>________________________&nbsp;&nbsp;&nbsp;&nbsp;________________________</p>
<p>Chairperson&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Secretary</p>`
      },
      diary: {
        label: 'Diary Entry',
        html: `<p><em>[Day], [DD Month YYYY]</em></p>
<p>&nbsp;</p>
<p>Dear Diary,</p>
<p>&nbsp;</p>
<p>Today was [describe the day]…</p>
<p>&nbsp;</p>
<p>In the morning, …</p>
<p>&nbsp;</p>
<p>Later that day, …</p>
<p>&nbsp;</p>
<p>I feel [emotion] because…</p>
<p>&nbsp;</p>
<p>Yours truly,</p>
<p>[Name]</p>`
      },
      notice: {
        label: 'Notice',
        html: `<p style="text-align:center"><strong>NOTICE</strong></p>
<p>&nbsp;</p>
<p style="text-align:center"><strong>[TITLE / SUBJECT]</strong></p>
<p>&nbsp;</p>
<p>This is to inform all [target audience] that [main announcement]…</p>
<p>&nbsp;</p>
<ul><li>Date: [DD Month YYYY]</li><li>Time: [HH:MM]</li><li>Venue: [Location]</li></ul>
<p>&nbsp;</p>
<p>All are requested to [action required].</p>
<p>&nbsp;</p>
<p>[Signed by],</p>
<p>[Name / Title]</p>
<p>[Date]</p>`
      },
      essay: {
        label: 'Structured Essay',
        html: `<p><strong>TITLE OF ESSAY</strong></p>
<p>&nbsp;</p>
<p><em>Introduction:</em></p>
<p>Opening statement / hook…</p>
<p>&nbsp;</p>
<p><em>Body Paragraph 1:</em></p>
<p>Topic sentence. Supporting evidence. Analysis.</p>
<p>&nbsp;</p>
<p><em>Body Paragraph 2:</em></p>
<p>Topic sentence. Supporting evidence. Analysis.</p>
<p>&nbsp;</p>
<p><em>Body Paragraph 3:</em></p>
<p>Topic sentence. Supporting evidence. Analysis.</p>
<p>&nbsp;</p>
<p><em>Conclusion:</em></p>
<p>Restate thesis. Summary. Final thought.</p>`
      },
      article: {
        label: 'Newspaper Article',
        html: `<p style="text-align:center"><strong>HEADLINE</strong></p>
<p style="text-align:center"><em>By [Your Name] | [Date] | [Publication Name]</em></p>
<p>&nbsp;</p>
<p><strong>Lead paragraph:</strong> Who? What? Where? When? Why?</p>
<p>&nbsp;</p>
<p>Body — background and context…</p>
<p>&nbsp;</p>
<p>Quote from source: "…" — [Name, Title]</p>
<p>&nbsp;</p>
<p>Further details…</p>
<p>&nbsp;</p>
<p><em>Conclusion / Call to action</em></p>`
      },
      summary: {
        label: 'Summary / Precis',
        html: `<p><strong>SUMMARY</strong></p>
<p>&nbsp;</p>
<p>The passage discusses… The main points are as follows:</p>
<p>&nbsp;</p>
<ol>
<li>First main point…</li>
<li>Second main point…</li>
<li>Third main point…</li>
<li>Fourth main point…</li>
</ol>
<p>&nbsp;</p>
<p><em>(Word count: ____)</em></p>`
      },
      free: {
        label: 'Free Composition',
        html: `<p>Start writing here…</p>`
      }
    }
  },
  {
    group: 'Kiswahili — Uandishi wa Kazi',
    lang: 'sw',
    items: {
      barua_rasmi: {
        label: 'Barua Rasmi',
        html: `<p><strong>Jina la Mwandishi</strong><br>Anwani ya Mwandishi,<br>Mji / Wilaya,<br><em>Tarehe: Siku Month MWAKA</em></p>
<p>&nbsp;</p>
<p>Jina la Mpokeaji,<br>Cheo / Wadhifa,<br>Shirika / Taasisi,<br>Anwani.</p>
<p>&nbsp;</p>
<p>Ndugu / Bwana / Bibi [Jina],</p>
<p>&nbsp;</p>
<p><strong>KICHWA: [MADA YA BARUA KWA HERUFI KUBWA]</strong></p>
<p>&nbsp;</p>
<p>Aya ya kwanza — utangulizi na madhumuni ya barua hii…</p>
<p>&nbsp;</p>
<p>Aya ya pili — maelezo ya kina…</p>
<p>&nbsp;</p>
<p>Aya ya tatu — hitimisho na ombi…</p>
<p>&nbsp;</p>
<p>Wako mwaminifu / Wako mtiifu,</p>
<p>&nbsp;</p>
<p>________________________</p>
<p><strong>Jina Kamili</strong></p>`
      },
      barua_binafsi: {
        label: 'Barua Binafsi / ya Kirafiki',
        html: `<p>Anwani yangu,<br>Mji,<br><em>Tarehe: Siku Month MWAKA</em></p>
<p>&nbsp;</p>
<p>Rafiki yangu mpendwa [Jina],</p>
<p>&nbsp;</p>
<p>Habari yako? Natumai uko salama pamoja na familia yako yote. Mimi niko salama hapa…</p>
<p>&nbsp;</p>
<p>Nakuandikia barua hii ili kukuarifu kuhusu…</p>
<p>&nbsp;</p>
<p>Pia ningependa kukuambia kwamba…</p>
<p>&nbsp;</p>
<p>Nakutakia kila la heri.</p>
<p>&nbsp;</p>
<p>Rafiki yako,</p>
<p>&nbsp;</p>
<p>________________________</p>
<p>[Jina Lako]</p>`
      },
      ripoti: {
        label: 'Ripoti',
        html: `<p style="text-align:center"><strong>KICHWA CHA RIPOTI</strong></p>
<p>&nbsp;</p>
<p><strong>1. UTANGULIZI / LENGO</strong></p>
<p>Ripoti hii inahusu… Lengo lake ni…</p>
<p>&nbsp;</p>
<p><strong>2. UCHUNGUZI / UGUNDUZI</strong></p>
<p>2.1 Ugunduzi wa kwanza…</p>
<p>2.2 Ugunduzi wa pili…</p>
<p>&nbsp;</p>
<p><strong>3. MATOKEO</strong></p>
<p>Kutokana na uchunguzi huu, ilibainika kuwa…</p>
<p>&nbsp;</p>
<p><strong>4. MAPENDEKEZO</strong></p>
<p>4.1 Pendekezo la kwanza…</p>
<p>4.2 Pendekezo la pili…</p>
<p>&nbsp;</p>
<p><strong>5. HITIMISHO</strong></p>
<p>Kwa muhtasari, ripoti hii inaonyesha…</p>
<p>&nbsp;</p>
<p>Imeandaliwa na: ________________________</p>
<p>Tarehe: ________________________</p>`
      },
      hotuba: {
        label: 'Hotuba',
        html: `<p style="text-align:center"><strong>KICHWA / MADA YA HOTUBA</strong></p>
<p>&nbsp;</p>
<p>Habari za asubuhi / mchana / jioni. Mheshimiwa [Mwenyekiti / Mgeni Rasmi], waheshimiwa wageni, mabibi na mabwana.</p>
<p>&nbsp;</p>
<p>Jina langu ni <strong>[Jina Lako]</strong>. Leo ninasimama mbele yenu kuzungumzia…</p>
<p>&nbsp;</p>
<p><em>Mwili — Hoja ya Kwanza</em></p>
<p>Kwanza kabisa, …</p>
<p>&nbsp;</p>
<p><em>Mwili — Hoja ya Pili</em></p>
<p>Pili, …</p>
<p>&nbsp;</p>
<p><em>Mwili — Hoja ya Tatu</em></p>
<p>Tatu, …</p>
<p>&nbsp;</p>
<p><em>Hitimisho</em></p>
<p>Kwa kumalizia, ningependa kusisitiza kwamba…</p>
<p>&nbsp;</p>
<p>Ahsanteni sana kwa kunisikiliza.</p>`
      },
      tangazo: {
        label: 'Tangazo',
        html: `<p style="text-align:center"><strong>TANGAZO</strong></p>
<p>&nbsp;</p>
<p style="text-align:center"><strong>[KICHWA / MADA YA TANGAZO]</strong></p>
<p>________________________</p>
<p>&nbsp;</p>
<p>Watarajiwa / Wanafunzi / Wananchi wote wanajulishwa kwamba…</p>
<p>&nbsp;</p>
<ul>
<li>Tarehe: [Siku, Tarehe]</li>
<li>Wakati: [HH:MM]</li>
<li>Mahali: [Eneo]</li>
</ul>
<p>&nbsp;</p>
<p>Wote wanaombwa / wanaarifiwa [tendo linalohitajika].</p>
<p>&nbsp;</p>
<p>Kwa taarifa zaidi wasiliana na: ________________________</p>
<p>&nbsp;</p>
<p>[Saini / Cheo],</p>
<p>[Jina]</p>
<p>[Tarehe]</p>`
      },
      kumbukumbu: {
        label: 'Kumbukumbu za Mkutano',
        html: `<p style="text-align:center"><strong>KUMBUKUMBU ZA MKUTANO</strong></p>
<p>&nbsp;</p>
<p><strong>Tarehe:</strong> [Tarehe ya Mkutano]</p>
<p><strong>Mahali:</strong> [Eneo la Mkutano]</p>
<p><strong>Saa:</strong> [Wakati]</p>
<p>&nbsp;</p>
<p><strong>Waliohudhuria:</strong></p>
<ol><li>[Jina] — Mwenyekiti</li><li>[Jina] — Katibu</li><li>[Jina]</li></ol>
<p>&nbsp;</p>
<p><strong>Wasiohudhuria:</strong></p>
<ol><li>[Jina] — [Sababu]</li></ol>
<p>&nbsp;</p>
<p><strong>Ajenda:</strong></p>
<ol><li>Ufunguzi</li><li>Masuala kutoka mkutano uliopita</li><li>Ajenda kuu</li><li>Mengineyo</li><li>Kufunga mkutano</li></ol>
<p>&nbsp;</p>
<p><strong>Yaliyojadiliwa:</strong></p>
<p>&nbsp;</p>
<p><strong>1. Ufunguzi</strong></p>
<p>Mwenyekiti alimkaribisha kila mmoja na kufungua mkutano saa… Mkutano ulifunguliwa kwa sala…</p>
<p>&nbsp;</p>
<p><strong>2. Masuala kutoka mkutano uliopita</strong></p>
<p>Kumbukumbu za mkutano uliopita zilisomwa na kukubaliwa bila mabadiliko…</p>
<p>&nbsp;</p>
<p><strong>Maamuzi / Maazimio:</strong></p>
<ul><li>Iliazimwa kwamba…</li></ul>
<p>&nbsp;</p>
<p>Mkutano uliahirishwa saa… na kufufuliwa saa…</p>
<p>&nbsp;</p>
<p>________________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;________________________</p>
<p>Mwenyekiti&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Katibu</p>`
      },
      wasifu: {
        label: 'Wasifu / Kujiandika (CV)',
        html: `<p style="text-align:center"><strong>WASIFU</strong></p>
<p>&nbsp;</p>
<p><strong>JINA KAMILI:</strong> [Jina lako kamili]</p>
<p><strong>TAREHE YA KUZALIWA:</strong> [Tarehe]</p>
<p><strong>MAHALI PA KUZALIWA:</strong> [Mji / Wilaya / Nchi]</p>
<p><strong>ANWANI:</strong> [Anwani ya sasa]</p>
<p><strong>NAMBARI YA SIMU:</strong> [+254 ...]</p>
<p>&nbsp;</p>
<p><strong>ELIMU:</strong></p>
<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%">
<tr><th>Mwaka</th><th>Taasisi</th><th>Cheti / Daraja</th></tr>
<tr><td>[Mwaka]</td><td>[Shule / Chuo]</td><td>[Cheti]</td></tr>
</table>
<p>&nbsp;</p>
<p><strong>UZOEFU WA KAZI:</strong></p>
<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%">
<tr><th>Mwaka</th><th>Mwajiri</th><th>Wadhifa</th></tr>
<tr><td>[Mwaka]</td><td>[Kampuni]</td><td>[Wadhifa]</td></tr>
</table>
<p>&nbsp;</p>
<p><strong>UJUZI / VIPAJI:</strong></p>
<ul><li>…</li><li>…</li></ul>
<p>&nbsp;</p>
<p><strong>WADHAMINI:</strong></p>
<p>[Jina], [Wadhifa], [Taasisi], [Simu]</p>`
      },
      insha_hoja: {
        label: 'Insha ya Hoja',
        html: `<p><strong>KICHWA: [MADA YA INSHA KWA HERUFI KUBWA]</strong></p>
<p>&nbsp;</p>
<p><em>Utangulizi:</em></p>
<p>Sentensi ya kuvutia / nukuu inayohusiana na mada. Wazo kuu la insha hii…</p>
<p>&nbsp;</p>
<p><em>Aya ya Kwanza — Hoja ya 1:</em></p>
<p>Hoja: … Ushahidi / Mfano: … Hitimisho la aya: …</p>
<p>&nbsp;</p>
<p><em>Aya ya Pili — Hoja ya 2:</em></p>
<p>Hoja: … Ushahidi / Mfano: … Hitimisho la aya: …</p>
<p>&nbsp;</p>
<p><em>Aya ya Tatu — Hoja ya 3:</em></p>
<p>Hoja: … Ushahidi / Mfano: … Hitimisho la aya: …</p>
<p>&nbsp;</p>
<p><em>Hitimisho:</em></p>
<p>Rudia wazo kuu. Muhtasari. Kauli ya mwisho yenye nguvu.</p>`
      },
      insha_masimulizi: {
        label: 'Insha ya Masimulizi',
        html: `<p><strong>KICHWA: [MADA YA INSHA]</strong></p>
<p>&nbsp;</p>
<p><em>Utangulizi — Weka msomaji katika hali:</em></p>
<p>Ilikuwa ni siku ya… Mazingira yalikuwa… Nilihisi…</p>
<p>&nbsp;</p>
<p><em>Mwili — Matukio kwa mpangilio:</em></p>
<p>Kwanza, … Kisha, … Baadaye, …</p>
<p>&nbsp;</p>
<p><em>Kilele cha Hadithi:</em></p>
<p>Ghafla, … Jambo zisizotarajiwa lilitokea…</p>
<p>&nbsp;</p>
<p><em>Hitimisho — Somo / Mwisho wa hadithi:</em></p>
<p>Kutokana na tukio hilo, nilijifunza kwamba…</p>`
      },
      insha_maelezo: {
        label: 'Insha ya Maelezo',
        html: `<p><strong>KICHWA: [MADA YA INSHA]</strong></p>
<p>&nbsp;</p>
<p><em>Utangulizi:</em></p>
<p>Maelezo mafupi ya mada inayozungumzwa…</p>
<p>&nbsp;</p>
<p><em>Aya ya Kwanza — Sifa / Kipengele 1:</em></p>
<p>Kipengele hiki ni… Kinaonekana / kinafanya kazi kwa njia ya…</p>
<p>&nbsp;</p>
<p><em>Aya ya Pili — Sifa / Kipengele 2:</em></p>
<p>Kipengele kingine ni…</p>
<p>&nbsp;</p>
<p><em>Hitimisho:</em></p>
<p>Kwa muhtasari, [mada] ni muhimu kwa sababu…</p>`
      },
      mdahalo: {
        label: 'Mdahalo (Debate)',
        html: `<p style="text-align:center"><strong>MDAHALO</strong></p>
<p style="text-align:center"><em>Hoja: "[KAULI YA MDAHALO]"</em></p>
<p>&nbsp;</p>
<p><strong>Upande wa Kwanza — Wanaounga mkono:</strong></p>
<p>Tunaunga mkono kauli hii kwa sababu…</p>
<p>Kwanza, … Pili, … Tatu, …</p>
<p>&nbsp;</p>
<p><strong>Upande wa Pili — Wanaopinga:</strong></p>
<p>Tunapinga kauli hii kwa sababu…</p>
<p>Kwanza, … Pili, … Tatu, …</p>
<p>&nbsp;</p>
<p><strong>Hitimisho la Mdahalo:</strong></p>
<p>Kwa kuzingatia hoja zote, …</p>`
      },
      notisi: {
        label: 'Notisi (Kiswahili)',
        html: `<p style="text-align:center"><strong>NOTISI</strong></p>
<p>&nbsp;</p>
<p style="text-align:center"><strong>[MADA]</strong></p>
<p>________________________</p>
<p>&nbsp;</p>
<p>Wanafunzi wote / Wananchi wote wanaarifiwa kwamba…</p>
<p>&nbsp;</p>
<ul>
<li>Tarehe: …</li>
<li>Mahali: …</li>
<li>Wakati: …</li>
</ul>
<p>&nbsp;</p>
<p>[Cheo],</p>
<p>[Jina]</p>
<p>[Tarehe]</p>`
      },
    }
  }
]

// Flatten for lookup by key
const ALL_TEMPLATES: Record<string, { label: string; html: string; lang: string }> = {}
TEMPLATE_GROUPS.forEach(group => {
  Object.entries(group.items).forEach(([key, val]) => {
    ALL_TEMPLATES[key] = { ...val, lang: group.lang }
  })
})

// ─── Toolbar Button ─────────────────────────────────────────────────────────
function ToolbarBtn({ icon, title, command, value }: {
  icon: React.ReactNode; title: string; command: string; value?: string
}) {
  const exec = (e: React.MouseEvent) => {
    e.preventDefault()
    document.execCommand(command, false, value)
  }
  return (
    <button title={title} onMouseDown={exec}
      className="p-2 rounded-lg transition-all hover:bg-indigo-500/10 hover:text-indigo-500 text-muted">
      {icon}
    </button>
  )
}

function insertTable() {
  const rows = prompt('Number of rows?', '3')
  const cols = prompt('Number of columns?', '3')
  if (!rows || !cols) return
  let html = '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">'
  for (let r = 0; r < parseInt(rows); r++) {
    html += '<tr>'
    for (let c = 0; c < parseInt(cols); c++) {
      html += r === 0
        ? '<th style="background:#f3f4f6;padding:8px">Kichwa / Header</th>'
        : '<td style="padding:8px">&nbsp;</td>'
    }
    html += '</tr>'
  }
  html += '</table><p>&nbsp;</p>'
  document.execCommand('insertHTML', false, html)
}

// ─── Main Component ──────────────────────────────────────────────────────────
interface ExamWritingEditorProps {
  value: string
  onChange: (html: string) => void
  functionalWritingType?: string
  wordLimit?: number
  placeholder?: string
  readOnly?: boolean
}

export function ExamWritingEditor({
  value,
  onChange,
  functionalWritingType = 'free',
  wordLimit,
  placeholder = 'Andika jibu lako hapa… / Start writing here…',
  readOnly = false
}: ExamWritingEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [wordCount, setWordCount] = useState(0)
  const [showTemplates, setShowTemplates] = useState(false)
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (!editorRef.current || hasInitialized.current) return
    hasInitialized.current = true
    if (value) {
      editorRef.current.innerHTML = value
    } else if (functionalWritingType && ALL_TEMPLATES[functionalWritingType]) {
      editorRef.current.innerHTML = ALL_TEMPLATES[functionalWritingType].html
      onChange(ALL_TEMPLATES[functionalWritingType].html)
    }
    countWords()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const countWords = useCallback(() => {
    if (!editorRef.current) return
    const text = editorRef.current.innerText || ''
    const count = text.trim().split(/\s+/).filter(w => w.length > 0).length
    setWordCount(count)
  }, [])

  const handleInput = useCallback(() => {
    if (!editorRef.current) return
    countWords()
    onChange(editorRef.current.innerHTML)
  }, [onChange, countWords])

  const applyTemplate = (key: string) => {
    if (!editorRef.current) return
    if (!confirm('Apply template? This will replace your current content.')) return
    editorRef.current.innerHTML = ALL_TEMPLATES[key].html
    onChange(ALL_TEMPLATES[key].html)
    countWords()
    setShowTemplates(false)
  }

  const activeTemplate = ALL_TEMPLATES[functionalWritingType]
  const isOverLimit = wordLimit && wordCount > wordLimit

  return (
    <div className="border border-[var(--card-border)] rounded-2xl overflow-hidden bg-[var(--bg)] shadow-inner">
      {!readOnly && (
        <>
          {/* ─── Toolbar ── */}
          <div className="flex flex-wrap items-center gap-1 p-2 border-b border-[var(--card-border)] bg-[var(--card)]">
            <div className="flex items-center gap-0.5 pr-2 border-r border-[var(--card-border)]">
              <ToolbarBtn icon={<Bold size={15} />} title="Bold / Herufi Nzito" command="bold" />
              <ToolbarBtn icon={<Italic size={15} />} title="Italic / Mlazo" command="italic" />
              <ToolbarBtn icon={<Underline size={15} />} title="Underline / Mstari Chini" command="underline" />
            </div>
            <div className="flex items-center gap-0.5 px-2 border-r border-[var(--card-border)]">
              <ToolbarBtn icon={<List size={15} />} title="Bullet List / Orodha" command="insertUnorderedList" />
              <ToolbarBtn icon={<ListOrdered size={15} />} title="Numbered List / Nambari" command="insertOrderedList" />
            </div>
            <div className="flex items-center gap-0.5 px-2 border-r border-[var(--card-border)]">
              <ToolbarBtn icon={<AlignLeft size={15} />} title="Align Left" command="justifyLeft" />
              <ToolbarBtn icon={<AlignCenter size={15} />} title="Align Center" command="justifyCenter" />
              <ToolbarBtn icon={<AlignRight size={15} />} title="Align Right" command="justifyRight" />
              <ToolbarBtn icon={<AlignJustify size={15} />} title="Justify" command="justifyFull" />
            </div>
            <div className="flex items-center gap-0.5 px-2 border-r border-[var(--card-border)]">
              <ToolbarBtn icon={<Indent size={15} />} title="Indent" command="indent" />
              <ToolbarBtn icon={<Outdent size={15} />} title="Outdent" command="outdent" />
            </div>
            <div className="flex items-center gap-0.5 px-2 border-r border-[var(--card-border)]">
              <button title="Horizontal Line / Mstari" onMouseDown={e => { e.preventDefault(); document.execCommand('insertHorizontalRule') }}
                className="p-2 rounded-lg text-muted hover:bg-indigo-500/10 hover:text-indigo-500"><Minus size={15} /></button>
              <button title="Table / Jedwali" onMouseDown={e => { e.preventDefault(); insertTable() }}
                className="p-2 rounded-lg text-muted hover:bg-indigo-500/10 hover:text-indigo-500"><Table2 size={15} /></button>
              <button title="Signature Line / Mstari wa Saini" onMouseDown={e => { e.preventDefault(); document.execCommand('insertHTML', false, '<p>________________________</p>') }}
                className="p-2 rounded-lg text-muted hover:bg-indigo-500/10 hover:text-indigo-500 text-xs font-bold font-mono">___</button>
            </div>

            {/* Template picker */}
            <div className="relative ml-auto">
              <button onMouseDown={e => { e.preventDefault(); setShowTemplates(v => !v) }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20">
                <FileText size={13} /> Templeti <ChevronDown size={11} />
              </button>
              {showTemplates && (
                <div className="absolute right-0 top-full mt-1 w-72 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-2xl z-50 py-2 overflow-hidden max-h-96 overflow-y-auto">
                  {TEMPLATE_GROUPS.map(group => (
                    <div key={group.group}>
                      <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-muted bg-[var(--input)] border-b border-[var(--card-border)]">
                        {group.lang === 'sw' ? '🇰🇪 ' : '🇬🇧 '}{group.group}
                      </div>
                      {Object.entries(group.items).map(([key, t]) => (
                        <button key={key} onClick={() => applyTemplate(key)}
                          className="w-full text-left px-4 py-2 text-sm font-medium hover:bg-indigo-500/10 hover:text-indigo-500 transition-colors">
                          {t.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active template badge */}
          {activeTemplate && (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-500/5 border-b border-indigo-500/10">
              <span className="text-sm">{activeTemplate.lang === 'sw' ? '🇰🇪' : '🇬🇧'}</span>
              <span className="text-xs font-bold text-indigo-500">Muundo: {activeTemplate.label}</span>
              <span className="text-xs text-muted ml-auto">Jaza sehemu zilizoachiwa / Fill in the blanks</span>
            </div>
          )}
        </>
      )}

      {/* ─── Editor ── */}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={e => {
          // Block external rich paste — allow plain text only
          if (e.ctrlKey && e.key === 'v') {
            e.preventDefault()
            navigator.clipboard.readText().then(text => {
              document.execCommand('insertText', false, text)
            }).catch(() => {})
          }
        }}
        data-placeholder={placeholder}
        className={`
          min-h-[480px] p-6 md:p-8 outline-none leading-9
          font-serif text-base text-[var(--text)]
          [&_table]:border-collapse [&_table]:w-full [&_table]:my-4
          [&_td]:border [&_td]:border-[var(--card-border)] [&_td]:p-2
          [&_th]:border [&_th]:border-[var(--card-border)] [&_th]:p-2 [&_th]:bg-[var(--input)] [&_th]:font-bold
          [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6
          [&_hr]:border-[var(--card-border)] [&_hr]:my-4 [&_p]:mb-3
          empty:before:content-[attr(data-placeholder)] empty:before:text-muted empty:before:font-sans empty:before:not-italic
          ${readOnly ? 'cursor-default' : 'bg-white dark:bg-[var(--bg)]'}
        `}
        style={{ fontFamily: '"Times New Roman", Georgia, serif' }}
      />

      {/* ─── Word count footer ── */}
      {!readOnly && (
        <div className={`flex items-center justify-between px-4 py-2 border-t border-[var(--card-border)] text-xs font-bold ${isOverLimit ? 'bg-red-500/10 text-red-500' : 'bg-[var(--card)] text-muted'}`}>
          <span>{wordCount.toLocaleString()} word{wordCount !== 1 ? 's' : ''} / maneno</span>
          {wordLimit && (
            <span className={isOverLimit ? 'font-black' : ''}>
              {isOverLimit
                ? `⚠ ${wordCount - wordLimit} maneno zaidi ya kikomo`
                : `${wordLimit - wordCount} maneno zilizobaki / words remaining`}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
