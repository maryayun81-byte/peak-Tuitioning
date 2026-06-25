'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { HOUSES, type HouseId, type HouseStanding, type DuelStreak } from '@/types/houses'

const TERRITORIES = [
  { id: 'highlands', name: 'The Highlands', adjacent: ['lowlands', 'coast', 'forest'] },
  { id: 'lowlands', name: 'The Lowlands', adjacent: ['highlands', 'coast', 'desert'] },
  { id: 'coast', name: 'The Coast', adjacent: ['highlands', 'lowlands', 'forest'] },
  { id: 'forest', name: 'The Forest', adjacent: ['highlands', 'coast', 'valley'] },
  { id: 'desert', name: 'The Desert', adjacent: ['lowlands', 'valley', 'mountains'] },
  { id: 'valley', name: 'The Valley', adjacent: ['forest', 'desert', 'mountains'] },
  { id: 'mountains', name: 'The Mountains', adjacent: ['desert', 'valley', 'peaks'] },
  { id: 'peaks', name: 'The Peaks', adjacent: ['mountains', 'city', 'tundra'] },
  { id: 'city', name: 'The City', adjacent: ['peaks', 'tundra', 'delta'] },
  { id: 'tundra', name: 'The Tundra', adjacent: ['peaks', 'city', 'delta'] },
  { id: 'delta', name: 'The Delta', adjacent: ['city', 'tundra', 'plains'] },
  { id: 'plains', name: 'The Plains', adjacent: ['delta', 'harbor', 'ridge'] },
  { id: 'harbor', name: 'The Harbor', adjacent: ['plains', 'ridge', 'islands'] },
  { id: 'ridge', name: 'The Ridge', adjacent: ['plains', 'harbor', 'islands'] },
  { id: 'islands', name: 'The Islands', adjacent: ['harbor', 'ridge'] },
  { id: 'capital', name: 'The Capital', adjacent: ['peaks', 'city', 'plains'] },
]

async function getStudentId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: student } = await supabase.from('students').select('id').eq('user_id', user.id).single()
  if (!student) throw new Error('Student not found')
  return { studentId: student.id, supabase }
}

async function getOrInitAdmin() {
  const { createAdminClient } = await import('@/lib/supabase/server')
  return createAdminClient()
}

// ── HOUSE SELECTION ─────────────────────────────────────────────

export async function joinHouse(houseId: HouseId) {
  const { studentId, supabase } = await getStudentId()
  const { error } = await supabase.from('student_houses').upsert({
    student_id: studentId,
    house_id: houseId,
    joined_at: new Date().toISOString(),
  }, { onConflict: 'student_id' })
  if (error) throw error
  revalidatePath('/student/duels')
  revalidatePath('/student')
}

export async function getMyHouse(): Promise<{ houseId: HouseId; joinedAt: string } | null> {
  const { studentId, supabase } = await getStudentId()
  const { data } = await supabase.from('student_houses').select('house_id, joined_at').eq('student_id', studentId).maybeSingle()
  if (!data) return null
  return { houseId: data.house_id as HouseId, joinedAt: data.joined_at }
}

export async function getHouseMembers(houseId: HouseId) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('student_houses')
    .select('student:students(id, full_name, avatar_url, duel_rating)')
    .eq('house_id', houseId)
    .order('joined_at', { ascending: false })
    .limit(50)
  return data?.map((d: any) => d.student).filter(Boolean) || []
}

// ── TERRITORY MAP ───────────────────────────────────────────────

export async function getTerritoryMap() {
  const admin = await getOrInitAdmin()
  const { data: territories } = await admin.from('territory_control').select('*')
  if (!territories || territories.length === 0) {
    // Seed territories
    const seeds = TERRITORIES.map((t, i) => ({
      territory_id: t.id,
      owner: HOUSES[i % HOUSES.length].id,
      points: 0,
      threshold: 100,
    }))
    const { data: seeded } = await admin.from('territory_control').insert(seeds).select()
    return (seeded || seeds).map((s: any) => ({
      ...TERRITORIES.find(t => t.id === s.territory_id),
      owner: s.owner as HouseId,
      points: s.points,
      threshold: s.threshold,
    }))
  }
  return territories.map((t: any) => ({
    ...TERRITORIES.find(tt => tt.id === t.territory_id),
    owner: t.owner as HouseId,
    points: t.points,
    threshold: t.threshold,
  }))
}

export async function awardTerritoryPoints(winnerHouseId: HouseId, points: number) {
  const admin = await getOrInitAdmin()
  const { data: territories } = await admin.from('territory_control').select('*')

  if (!territories) return

  // Award points to a random territory owned by the winner
  const owned = territories.filter((t: any) => t.owner === winnerHouseId)
  if (owned.length === 0) return

  const target = owned[Math.floor(Math.random() * owned.length)]
  const newPoints = (target.points || 0) + points
  const threshold = target.threshold || 100

  if (newPoints >= threshold) {
    // Find adjacent enemy territories to attack
    const territoryDef = TERRITORIES.find(t => t.id === target.territory_id)
    if (territoryDef) {
      const adjacentEnemy = territories.filter((t: any) =>
        territoryDef.adjacent.includes(t.territory_id) && t.owner !== winnerHouseId
      )
      if (adjacentEnemy.length > 0) {
        const attackTarget = adjacentEnemy[Math.floor(Math.random() * adjacentEnemy.length)]
        await admin.from('territory_control').update({
          owner: winnerHouseId,
          points: newPoints - threshold,
        }).eq('territory_id', attackTarget.territory_id)
      }
    }
    await admin.from('territory_control').update({
      points: 0,
    }).eq('territory_id', target.territory_id)
  } else {
    await admin.from('territory_control').update({
      points: newPoints,
    }).eq('territory_id', target.territory_id)
  }
}

// ── HOUSE STANDINGS ─────────────────────────────────────────────

export async function getHouseStandings(): Promise<HouseStanding[]> {
  const supabase = await createClient()

  const { data: territories } = await supabase.from('territory_control').select('owner, points')
  const { data: members } = await supabase.from('student_houses').select('house_id')

  const territoryCount: Record<string, number> = {}
  const totalPoints: Record<string, number> = {}
  const memberCount: Record<string, number> = {}

  territories?.forEach((t: any) => {
    territoryCount[t.owner] = (territoryCount[t.owner] || 0) + 1
    totalPoints[t.owner] = (totalPoints[t.owner] || 0) + (t.points || 0)
  })

  members?.forEach((m: any) => {
    memberCount[m.house_id] = (memberCount[m.house_id] || 0) + 1
  })

  return HOUSES.map(h => ({
    houseId: h.id,
    territoryCount: territoryCount[h.id] || 0,
    totalPoints: totalPoints[h.id] || 0,
    memberCount: memberCount[h.id] || 0,
    weeklyWins: 0,
  }))
}

// ── STREAKS ─────────────────────────────────────────────────────

export async function getMyStreak(): Promise<DuelStreak> {
  const { studentId, supabase } = await getStudentId()
  const { data } = await supabase.from('duel_streaks').select('*').eq('student_id', studentId).maybeSingle()
  if (!data) return { current: 0, longest: 0, lastDuelDate: '', freezesAvailable: 1 }
  return {
    current: data.current_streak,
    longest: data.longest_streak,
    lastDuelDate: data.last_duel_date,
    freezesAvailable: data.freezes_available,
  }
}

export async function updateStreak(studentId?: string) {
  if (!studentId) {
    const s = await getStudentId()
    studentId = s.studentId
  }
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase.from('duel_streaks').select('*').eq('student_id', studentId).maybeSingle()

  if (!existing) {
    await supabase.from('duel_streaks').insert({
      student_id: studentId,
      current_streak: 1,
      longest_streak: 1,
      last_duel_date: today,
      freezes_available: 1,
    })
    return
  }

  const lastDate = existing.last_duel_date
  const isConsecutive = lastDate === getYesterday(today)
  const isSameDay = lastDate === today

  if (isSameDay) return

  let newStreak = isConsecutive ? existing.current_streak + 1 : 1
  // Use freeze if streak would break but freezes available
  if (!isConsecutive && existing.current_streak > 0 && existing.freezes_available > 0) {
    newStreak = existing.current_streak
    await supabase.from('duel_streaks').update({
      freezes_available: existing.freezes_available - 1,
      last_duel_date: today,
    }).eq('student_id', studentId)
    return
  }

  const newLongest = Math.max(newStreak, existing.longest_streak)

  await supabase.from('duel_streaks').update({
    current_streak: newStreak,
    longest_streak: newLongest,
    last_duel_date: today,
    freezes_available: existing.freezes_available,
  }).eq('student_id', studentId)
}

function getYesterday(today: string) {
  const d = new Date(today)
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export async function getStreakLeaderboard() {
  const admin = await getOrInitAdmin()
  const { data } = await admin
    .from('duel_streaks')
    .select('student:students(id, full_name, avatar_url, house_id), current_streak, longest_streak')
    .order('current_streak', { ascending: false })
    .limit(20)
  return data || []
}

// ── SCORE HOOK INTO DUEL RESULT ────────────────────────────────

export async function processDuelForHouses(winnerStudentId: string) {
  if (!winnerStudentId || winnerStudentId === '00000000-0000-0000-0000-000000000000') return

  const supabase = await createClient()
  const { data: house } = await supabase.from('student_houses').select('house_id').eq('student_id', winnerStudentId).maybeSingle()
  if (!house) return

  await awardTerritoryPoints(house.house_id as HouseId, 10)
}
