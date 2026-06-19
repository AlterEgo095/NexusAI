import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getOptionalUser, requireAuth, AuthError } from '@/lib/ensure-user'
import { logActivity } from '@/lib/ensure-user'
import { hashPassword, verifyPassword } from '@/lib/password'

/* ─── GET /api/settings — load profile ─── */
export async function GET() {
  try {
    const user = await getOptionalUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        credits: user.credits,
        language: user.language,
        createdAt: user.createdAt,
        lastSeen: user.lastSeen,
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    console.error('Settings fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Impossible de charger le profil' },
      { status: 500 }
    )
  }
}

/* ─── POST /api/settings — actions ─── */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'update-profile': {
        const user = await requireAuth()
        const { name, avatar } = body

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
          return NextResponse.json(
            { success: false, error: 'Le nom est requis' },
            { status: 400 }
          )
        }

        const updated = await db.user.update({
          where: { id: user.id },
          data: {
            name: name.trim().slice(0, 50),
            ...(avatar !== undefined ? { avatar: String(avatar).slice(0, 2048) } : {}),
          },
          select: { name: true, avatar: true },
        })

        await logActivity('settings', 'update-profile', `Nom mis à jour : ${updated.name}`)

        return NextResponse.json({ success: true, profile: updated })
      }

      case 'change-password': {
        const user = await requireAuth()
        const { currentPassword, newPassword } = body

        if (!currentPassword || !newPassword) {
          return NextResponse.json(
            { success: false, error: 'Tous les champs sont requis' },
            { status: 400 }
          )
        }

        if (newPassword.length < 8) {
          return NextResponse.json(
            { success: false, error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' },
            { status: 400 }
          )
        }

        // Verify current password using bcrypt
        if (!user.password) {
          return NextResponse.json(
            { success: false, error: 'Aucun mot de passe défini pour ce compte' },
            { status: 400 }
          )
        }

        const isValidCurrent = await verifyPassword(currentPassword, user.password)
        if (!isValidCurrent) {
          return NextResponse.json(
            { success: false, error: 'Mot de passe actuel incorrect' },
            { status: 401 }
          )
        }

        const hashedNew = await hashPassword(newPassword)
        await db.user.update({
          where: { id: user.id },
          data: { password: hashedNew },
        })

        await logActivity('settings', 'change-password', 'Mot de passe mis à jour')

        return NextResponse.json({ success: true, message: 'Mot de passe mis à jour' })
      }

      case 'update-language': {
        const user = await requireAuth()
        const { language } = body

        const validLanguages = ['fr', 'en', 'es', 'de', 'ar', 'zh']
        if (!validLanguages.includes(language)) {
          return NextResponse.json(
            { success: false, error: 'Langue non valide' },
            { status: 400 }
          )
        }

        await db.user.update({
          where: { id: user.id },
          data: { language },
        })

        await logActivity('settings', 'update-language', `Langue changée en ${language}`)

        return NextResponse.json({ success: true, language })
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Action non reconnue' },
          { status: 400 }
        )
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    console.error('Settings action error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}