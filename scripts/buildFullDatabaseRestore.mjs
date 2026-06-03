import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const migrationsDir = path.join(root, 'supabase', 'migrations')
const outputFile = path.join(root, 'supabase', 'full_database_restore.sql')

const excluded = new Set([
  // This migration intentionally deletes teacher-created content. It is kept
  // in history but must not be part of a new-project restore script.
  '20260330_delete_all_assignments_and_quests.sql',
])

const migrations = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql') && !excluded.has(file))
  .sort((a, b) => {
    if (a === '001_schema.sql') return -1
    if (b === '001_schema.sql') return 1
    return a.localeCompare(b)
  })

const header = `-- ============================================================\n-- Peak Performance Tutoring - Full Database Restore\n-- Generated from supabase/migrations on ${new Date().toISOString()}\n--\n-- Run this in a brand-new Supabase project's SQL editor.\n-- It excludes the destructive migration:\n--   20260330_delete_all_assignments_and_quests.sql\n-- ============================================================\n\n`

const body = migrations
  .map((file) => {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8').trim()
    return [
      '-- ============================================================',
      `-- BEGIN MIGRATION: ${file}`,
      '-- ============================================================',
      content,
      `-- END MIGRATION: ${file}`,
      '',
    ].join('\n')
  })
  .join('\n')

const footer = `\n-- ============================================================\n-- Restore script complete.\n-- After running: update .env.local with the new project URL and keys,\n-- then create at least one admin user in Supabase Auth.\n-- ============================================================\n`

fs.writeFileSync(outputFile, `${header}${body}${footer}`, 'utf8')

console.log(`Wrote ${path.relative(root, outputFile)}`)
console.log(`Included ${migrations.length} migrations`)
console.log(`Excluded ${[...excluded].join(', ')}`)
