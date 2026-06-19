import { db } from '@/lib/db'
import { SystemSetting } from '@prisma/client'

/* ═══════════════════════════════════════════════════════════════════════
   System Settings Library
   Reads/writes system settings from the SystemSetting table with
   environment variable fallback for backward compatibility.
   ═══════════════════════════════════════════════════════════════════════ */

// Default settings that get seeded on first access
const DEFAULT_SETTINGS = [
  // AI Provider settings
  { key: 'ai_provider', value: 'zai', category: 'ai_provider', isSecret: false, label: 'Fournisseur IA', description: "Fournisseur IA principal (zai, openai, ollama)" },
  { key: 'default_model', value: '', category: 'ai_provider', isSecret: false, label: 'Modèle par défaut', description: "Modèle IA par défaut (vide = modèle du fournisseur)" },

  // OpenAI settings
  { key: 'openai_api_key', value: '', category: 'api_key', isSecret: true, label: 'OpenAI API Key', description: 'Clé API OpenAI pour GPT-4, DALL-E, TTS, Whisper' },

  // Ollama settings
  { key: 'ollama_base_url', value: 'http://localhost:11434', category: 'ai_provider', isSecret: false, label: 'Ollama Base URL', description: 'URL du serveur Ollama' },

  // Tavily (for OpenAI web search)
  { key: 'tavily_api_key', value: '', category: 'api_key', isSecret: true, label: 'Tavily API Key', description: 'Clé API Tavily pour la recherche web avec OpenAI' },

  // Platform settings
  { key: 'platform_name', value: 'NexusAI', category: 'platform', isSecret: false, label: 'Nom de la plateforme', description: "Nom affiché dans l'interface" },
  { key: 'default_language', value: 'fr', category: 'platform', isSecret: false, label: 'Langue par défaut', description: 'Langue par défaut pour les nouveaux utilisateurs' },
  { key: 'default_credits', value: '10000', category: 'platform', isSecret: false, label: 'Crédits par défaut', description: 'Crédits attribués aux nouveaux utilisateurs' },
  { key: 'max_conversations', value: '100', category: 'platform', isSecret: false, label: 'Max conversations', description: 'Limite de conversations par utilisateur (0 = illimité)' },

  // Feature flags
  { key: 'feature_image_gen', value: 'true', category: 'feature', isSecret: false, label: "Génération d'images", description: "Activer/désactiver la génération d'images" },
  { key: 'feature_tts', value: 'true', category: 'feature', isSecret: false, label: 'Synthèse vocale (TTS)', description: 'Activer/désactiver la synthèse vocale' },
  { key: 'feature_asr', value: 'true', category: 'feature', isSecret: false, label: 'Reconnaissance vocale (ASR)', description: 'Activer/désactiver la reconnaissance vocale' },
  { key: 'feature_web_search', value: 'true', category: 'feature', isSecret: false, label: 'Recherche web', description: 'Activer/désactiver la recherche web' },
  { key: 'feature_marketplace', value: 'true', category: 'feature', isSecret: false, label: 'Marketplace', description: "Activer/désactiver le marketplace d'agents" },
]

/**
 * Idempotently seed all default settings into the database.
 * Uses upsert so existing values are never overwritten.
 */
export async function seedSettings(): Promise<void> {
  for (const setting of DEFAULT_SETTINGS) {
    await db.systemSetting.upsert({
      where: { key: setting.key },
      update: {}, // never overwrite existing values
      create: setting,
    })
  }
}

/**
 * Get a single setting value by key.
 * Falls back to process.env[KEY.toUpperCase()] if the DB value is empty,
 * for backward compatibility with env-based configuration.
 */
export async function getSetting(key: string): Promise<string> {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key },
    })

    if (setting && setting.value !== '') {
      return setting.value
    }
  } catch (error) {
    console.warn(`[system-settings] Failed to read setting "${key}" from DB, falling back to env:`, error)
  }

  // Environment variable fallback: convert key like "openai_api_key" to "OPENAI_API_KEY"
  const envKey = key.toUpperCase()
  return process.env[envKey] || ''
}

/**
 * Get all system settings.
 * Auto-seeds defaults if the settings table is empty.
 */
export async function getAllSettings(): Promise<SystemSetting[]> {
  const count = await db.systemSetting.count()
  if (count === 0) {
    await seedSettings()
  }

  return db.systemSetting.findMany({
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  })
}

/**
 * Get settings filtered by category.
 */
export async function getSettingsByCategory(category: string): Promise<SystemSetting[]> {
  return db.systemSetting.findMany({
    where: { category },
    orderBy: { key: 'asc' },
  })
}

/**
 * Update a single setting value by key.
 */
export async function updateSetting(key: string, value: string): Promise<SystemSetting> {
  const updated = await db.systemSetting.update({
    where: { key },
    data: { value },
  })
  return updated
}

/**
 * Update multiple settings at once.
 * Returns all updated settings.
 */
export async function bulkUpdateSettings(updates: Array<{ key: string; value: string }>): Promise<SystemSetting[]> {
  const results: SystemSetting[] = []

  await db.$transaction(
    updates.map((update) =>
      db.systemSetting.update({
        where: { key: update.key },
        data: { value: update.value },
      })
    )
  )

  // Fetch all updated settings
  const updatedSettings = await db.systemSetting.findMany({
    where: { key: { in: updates.map((u) => u.key) } },
  })
  results.push(...updatedSettings)

  return results
}

/**
 * Create a custom setting.
 */
export async function createSetting(data: {
  key: string
  value: string
  category: string
  isSecret: boolean
  label: string
  description?: string
}): Promise<SystemSetting> {
  return db.systemSetting.create({ data })
}

/**
 * Delete a custom setting by key.
 */
export async function deleteSetting(key: string): Promise<void> {
  await db.systemSetting.delete({ where: { key } })
}
