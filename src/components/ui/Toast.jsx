import { useApp } from '../../context/AppContext'

export default function Toast() {
  const { toasts } = useApp()

  return (
    <div className="fixed top-4 right-3 left-3 sm:left-auto sm:right-4 z-[200] space-y-2 no-print pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={`toast-item pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-semibold max-w-sm ml-auto ${
            t.type === 'success' ? 'bg-emerald-600' : t.type === 'error' ? 'bg-rose-600' : 'bg-blue-600'
          }`}>
          <i className={t.type === 'success' ? 'fas fa-check-circle' : t.type === 'error' ? 'fas fa-times-circle' : 'fas fa-info-circle'}></i>
          <span className="flex-1">{t.msg}</span>
        </div>
      ))}
    </div>
  )
}
