/**
 * kcse-set-books.ts
 * Master list of KCSE / CBC / Junior Secondary set books for all subjects.
 * Used in ExamBuilder to let teachers select a set book and paste an extract.
 */

export interface SetBook {
  id: string
  title: string
  author: string
  subject: 'english' | 'kiswahili' | 'literature' | 'fasihi' | 'history' | 'cre' | 'custom'
  curriculum: 'KCSE' | 'CBC' | 'Both'
  genre?: string
}

export const SET_BOOKS: SetBook[] = [
  // ── KCSE English Set Books ────────────────────────────────────────────────
  { id: 'river_source', title: 'The River and the Source', author: 'Margaret Ogola', subject: 'english', curriculum: 'KCSE', genre: 'Novel' },
  { id: 'doll_house', title: "A Doll's House", author: 'Henrik Ibsen', subject: 'english', curriculum: 'KCSE', genre: 'Play' },
  { id: 'floating_world', title: 'An Artist of the Floating World', author: 'Kazuo Ishiguro', subject: 'english', curriculum: 'KCSE', genre: 'Novel' },
  { id: 'fathers_nations', title: 'Fathers of Nations', author: 'Paul B. Vitta', subject: 'english', curriculum: 'KCSE', genre: 'Novel' },
  { id: 'blossoms_dust', title: 'Blossoms of the Savannah', author: 'Henry Ole Kulet', subject: 'english', curriculum: 'KCSE', genre: 'Novel' },
  { id: 'memories_earth', title: 'Memories We Lost and Other Stories', author: 'Chris Wanjala (Ed.)', subject: 'english', curriculum: 'KCSE', genre: 'Short Stories' },
  { id: 'betrayal_bush', title: 'Betrayal in the City', author: 'Francis Imbuga', subject: 'english', curriculum: 'KCSE', genre: 'Play' },
  { id: 'mine_bone', title: "The Caucasian Chalk Circle / The Merchant of Venice", author: 'Shakespeare / Brecht', subject: 'english', curriculum: 'KCSE', genre: 'Play' },
  { id: 'a_raisin_sun', title: 'A Raisin in the Sun', author: 'Lorraine Hansberry', subject: 'english', curriculum: 'KCSE', genre: 'Play' },
  { id: 'inheritance', title: 'The Inheritance', author: 'David Mulwa', subject: 'english', curriculum: 'KCSE', genre: 'Play' },
  { id: 'silent_song', title: 'Silent Song and Other Stories', author: 'Various', subject: 'english', curriculum: 'KCSE', genre: 'Short Stories' },
  { id: 'grapes_wrath', title: 'The Grapes of Wrath', author: 'John Steinbeck', subject: 'english', curriculum: 'KCSE', genre: 'Novel' },
  { id: 'things_apart', title: 'Things Fall Apart', author: 'Chinua Achebe', subject: 'english', curriculum: 'KCSE', genre: 'Novel' },

  // ── KCSE Fasihi (Kiswahili Literature) ────────────────────────────────────
  { id: 'chozi_la_heri', title: 'Chozi la Heri', author: 'S.A. Mohamed', subject: 'fasihi', curriculum: 'KCSE', genre: 'Tamthilia' },
  { id: 'kigogo', title: 'Kigogo', author: 'Changilwe/E.A. Mshindo', subject: 'fasihi', curriculum: 'KCSE', genre: 'Tamthilia' },
  { id: 'mstahimilivu', title: 'Mstahimilivu', author: 'S.A. Mohamed', subject: 'fasihi', curriculum: 'KCSE', genre: 'Riwaya' },
  { id: 'tumbuizo', title: 'Tumbuizo la Majonzi', author: 'Various', subject: 'fasihi', curriculum: 'KCSE', genre: 'Mashairi' },
  { id: 'nyota_ya_rehema', title: 'Nyota ya Rehema', author: 'M.S. Mohamed', subject: 'fasihi', curriculum: 'KCSE', genre: 'Riwaya' },
  { id: 'bina_adam', title: 'Bina-Adamu!', author: 'Said Ahmed Mohamed', subject: 'fasihi', curriculum: 'KCSE', genre: 'Tamthilia' },
  { id: 'kivuli_kinaishi', title: 'Kivuli Kinaishi', author: 'Ben Mtobwa', subject: 'fasihi', curriculum: 'KCSE', genre: 'Riwaya' },
  { id: 'dira_ya_mjakazi', title: 'Dira ya Mjakazi', author: 'Margaret Atwood (Trans.)', subject: 'fasihi', curriculum: 'KCSE', genre: 'Riwaya' },
  { id: 'ushairi_wa_kcse', title: 'Ushairi wa KCSE (Diwani)', author: 'Various', subject: 'fasihi', curriculum: 'KCSE', genre: 'Mashairi' },

  // ── CBC Junior Secondary Set Books ────────────────────────────────────────
  { id: 'tales_of_unity', title: 'Tales of Unity and Diversity', author: 'Various', subject: 'english', curriculum: 'CBC', genre: 'Short Stories' },
  { id: 'wonder_weavers', title: 'Wonder Weavers', author: 'Various', subject: 'english', curriculum: 'CBC', genre: 'Reader' },

  // ── CRE Set Books ─────────────────────────────────────────────────────────
  { id: 'bible_selected', title: 'Selected Bible Passages (KCSE)', author: 'Various', subject: 'cre', curriculum: 'KCSE', genre: 'Scripture' },

  // ── History Source Material ───────────────────────────────────────────────
  { id: 'history_source', title: 'Historical Source Document / Passage', author: 'Custom', subject: 'history', curriculum: 'Both', genre: 'Primary Source' },

  // ── Custom ────────────────────────────────────────────────────────────────
  { id: 'custom', title: 'Custom / Other Book', author: '', subject: 'custom', curriculum: 'Both', genre: '' },
]

export const SET_BOOK_SUBJECTS: Record<string, string> = {
  english: '🇬🇧 English Literature',
  fasihi: '🇰🇪 Fasihi ya Kiswahili',
  kiswahili: '🇰🇪 Kiswahili',
  cre: '✝️ Christian Religious Education',
  history: '📜 History & Government',
  custom: '📝 Custom / Other',
}

export function getSetBookGroups() {
  const groups: Record<string, SetBook[]> = {}
  for (const book of SET_BOOKS) {
    const g = book.subject
    if (!groups[g]) groups[g] = []
    groups[g].push(book)
  }
  return groups
}
