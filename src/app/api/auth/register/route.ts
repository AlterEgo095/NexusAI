import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, validatePassword, validateEmail } from '@/lib/password'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, password, language = 'fr' } = body

    if (!email || !password || !name) {
      return NextResponse.json({ success: false, error: 'Email, nom et mot de passe requis' }, { status: 400 })
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ success: false, error: 'Email invalide' }, { status: 400 })
    }

    const pwCheck = validatePassword(password)
    if (!pwCheck.valid) {
      return NextResponse.json({ success: false, error: pwCheck.errors.join('. ') }, { status: 400 })
    }

    const allowedLangs = ['fr', 'en', 'es', 'de', 'ar', 'zh']
    const userLang = allowedLangs.includes(language) ? language : 'fr'

    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Cet email est déjà utilisé' }, { status: 409 })
    }

    const hashedPassword = await hashPassword(password)

    const user = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'user',
        credits: 5000,
        language: userLang,
      },
      select: { id: true, email: true, name: true, role: true, language: true, createdAt: true },
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Register API error:', error)
    return NextResponse.json({ success: false, error: 'Erreur lors de l\'inscription' }, { status: 500 })
  }
}