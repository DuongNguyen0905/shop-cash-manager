'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function login(pin: string) {
  const adminPin = process.env.ADMIN_PIN || '1234'
  
  if (pin === adminPin) {
    const cookieStore = await cookies()
    cookieStore.set('admin_token', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
    return { success: true }
  }
  
  return { success: false, error: 'Mã PIN không đúng' }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_token')
  redirect('/login')
}
