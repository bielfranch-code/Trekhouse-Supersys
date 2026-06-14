import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Don't show if already installed (running as standalone PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (localStorage.getItem('pwa-dismissed')) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
    setIsIOS(ios)

    if (ios) {
      // Show iOS instructions after a short delay
      setTimeout(() => setShow(true), 3000)
      return
    }

    // Android / Desktop: capture beforeinstallprompt
    function handler(e) {
      e.preventDefault()
      setPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    setShow(false)
    setDismissed(true)
    localStorage.setItem('pwa-dismissed', '1')
  }

  async function install() {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setShow(false)
    setPrompt(null)
  }

  if (!show || dismissed) return null

  // iOS guide
  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <i className="fas fa-mountain text-white text-lg"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-slate-800 text-sm">Install TrekSys di iPhone</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Ketuk <span className="inline-flex items-center gap-0.5 font-bold text-blue-600">
                  <i className="fas fa-arrow-up-from-bracket text-[10px]"></i> Share
                </span> lalu pilih <span className="font-bold text-slate-700">"Tambahkan ke Layar Utama"</span> untuk install seperti app.
              </p>
            </div>
            <button onClick={dismiss} className="p-1 text-slate-300 hover:text-slate-500 flex-shrink-0">
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
          {/* Arrow pointing to browser bottom bar */}
          <div className="flex justify-center mt-3">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <i className="fas fa-arrow-down animate-bounce"></i>
              <span>Tombol Share ada di bawah browser</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Android / Desktop
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <i className="fas fa-mountain text-white text-base"></i>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-white text-sm">TrekingHouse SuperSys</p>
            <p className="text-emerald-100 text-[11px]">Install sebagai aplikasi</p>
          </div>
          <button onClick={dismiss} className="p-1 text-white/60 hover:text-white">
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>
        <div className="p-4">
          <div className="space-y-2 mb-4">
            {[
              ['fas fa-bolt', 'Akses cepat dari home screen'],
              ['fas fa-wifi-slash', 'Bisa dipakai offline'],
              ['fas fa-expand', 'Tampil fullscreen tanpa browser bar'],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-2 text-xs text-slate-600">
                <i className={`${icon} text-emerald-500 w-4 text-center`}></i>
                <span>{text}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={dismiss}
              className="flex-1 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl transition"
            >
              Nanti saja
            </button>
            <button
              onClick={install}
              className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <i className="fas fa-download"></i> Install Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
