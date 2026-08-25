'use client'

import { useUserRole } from '@/lib/hooks/useUserRole'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { ShieldCheck, LogIn, Music } from 'lucide-react'

export default function AdminLoginPage() {
  const { user, role, loading } = useUserRole()
  const router = useRouter()

  useEffect(() => {
    if (user && (role === 'beam_admin' || role === 'partner_admin')) {
      router.push('/admin/orchestra-network')
    }
  }, [user, role, router])

  const handleGoogleSignIn = async () => {
    if (!auth) return
    try {
      const provider = new GoogleAuthProvider()
      const res = await signInWithPopup(auth, provider)
      if (res.user) {
        router.push('/admin/orchestra-network')
      }
    } catch (err) {
      console.error('Admin Google Sign-In Error:', err)
    }
  }

  return (
    <div className="min-h-screen bg-[#07080A] text-white flex flex-col justify-between items-center p-6 font-sans">
      <div className="w-full max-w-md my-auto text-center space-y-6 bg-[#0F1015] p-8 rounded-3xl border border-amber-400/40 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/40 flex items-center justify-center mx-auto shadow-lg">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
            General Orchestra Admin Login
          </h1>
          <p className="text-xs text-white/60 leading-relaxed font-sans max-w-xs mx-auto">
            Sign in with Google using your admin account (<strong className="text-amber-300">ezra@readyaimgo.biz</strong>) to access the complete BEAM Orchestra Network Directory.
          </p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="w-full py-3.5 px-6 rounded-full bg-amber-400 text-black font-bold text-sm hover:bg-amber-300 transition shadow-xl flex items-center justify-center space-x-2"
        >
          <LogIn className="w-4 h-4 text-black" />
          <span>Sign In with Admin Google Account</span>
        </button>

        {user && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
            Signed in as: {user.email} (Role: {role || 'User'})
          </div>
        )}

        <div className="pt-4 border-t border-white/10 flex flex-col space-y-3">
          <Link
            href="/admin/orchestra-network"
            className="text-xs text-amber-300 hover:underline font-mono font-semibold"
          >
            Go to Admin Directory →
          </Link>
          
          <Link
            href="/"
            className="text-xs text-white/60 hover:text-white transition font-medium"
          >
            ← Return to Orchestra Homepage
          </Link>
        </div>
      </div>
    </div>
  )
}
