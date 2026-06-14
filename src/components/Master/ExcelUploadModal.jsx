import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { CATEGORIES } from '../../context/AppContext'

// ── Target fields ────────────────────────────────────────────────────────────
const FIELDS = [
  { key: 'name',           label: 'Nama Item',       required: true  },
  { key: 'sku',            label: 'SKU / Kode',      required: true  },
  { key: 'category',       label: 'Kategori',        required: false },
  { key: 'rental_price',   label: 'Harga Sewa',      required: false },
  { key: 'total_stock',    label: 'Stok',            required: false },
  { key: 'purchase_price', label: 'Harga Beli',      required: false },
  { key: 'variation',      label: 'Varian',          required: false },
  { key: 'size',           label: 'Ukuran',          required: false },
  { key: 'notes',          label: 'Catatan',         required: false },
]

// ── Keyword map for fuzzy auto-detect ───────────────────────────────────────
const KEYWORDS = {
  name:           ['nama', 'name', 'item', 'barang', 'produk', 'product', 'deskripsi', 'description', 'alat'],
  sku:            ['sku', 'kode', 'code', 'id', 'nomor', 'no', 'artikel'],
  category:       ['kategori', 'category', 'jenis', 'tipe', 'type', 'kelompok', 'group'],
  rental_price:   ['sewa', 'rental', 'harga', 'price', 'tarif', 'rate', 'biaya', 'cost', 'hari', 'day'],
  total_stock:    ['stok', 'stock', 'qty', 'jumlah', 'kuantitas', 'quantity', 'unit', 'total'],
  purchase_price: ['beli', 'modal', 'purchase', 'buy', 'cost', 'pokok', 'hpp'],
  variation:      ['varian', 'variasi', 'variation', 'warna', 'color', 'tipe'],
  size:           ['ukuran', 'size', 'dimensi', 'besar', 'kapasitas'],
  notes:          ['catatan', 'notes', 'keterangan', 'note', 'info', 'remark', 'desc'],
}

function scoreMatch(colHeader, fieldKey) {
  const h = colHeader.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim()
  const words = h.split(/\s+/)
  let score = 0
  for (const kw of KEYWORDS[fieldKey]) {
    if (h === kw) { score += 10; break }
    if (h.includes(kw) || kw.includes(h)) { score += 5; break }
    if (words.some(w => kw.includes(w) || w.includes(kw))) { score += 2; break }
  }
  return score
}

function autoDetectMapping(headers) {
  const mapping = {}
  const usedFields = new Set()

  // Score each header against each field, pick best
  for (const header of headers) {
    let bestField = null
    let bestScore = 0
    for (const { key } of FIELDS) {
      if (usedFields.has(key)) continue
      const s = scoreMatch(header, key)
      if (s > bestScore) { bestScore = s; bestField = key }
    }
    if (bestField && bestScore >= 2) {
      mapping[header] = bestField
      usedFields.add(bestField)
    } else {
      mapping[header] = '__skip__'
    }
  }
  return mapping
}

function cleanNumber(val) {
  if (val === '' || val === null || val === undefined) return 0
  return Number(String(val).replace(/[^0-9]/g, '')) || 0
}

function buildRows(rawData, headers, mapping) {
  const rows = []
  const errors = []

  for (let i = 0; i < rawData.length; i++) {
    const r = rawData[i]
    if (r.every(c => c === '' || c === null || c === undefined)) continue

    const obj = {}
    headers.forEach((h, idx) => {
      const field = mapping[h]
      if (field && field !== '__skip__') obj[field] = r[idx] ?? ''
    })

    const rowNum = i + 2
    if (!obj.name && !obj.sku) { errors.push(`Baris ${rowNum}: tidak ada nama atau SKU, dilewati`); continue }

    const cat = obj.category
      ? (CATEGORIES.find(c => c.toLowerCase() === String(obj.category).toLowerCase()) || String(obj.category).trim())
      : ''

    rows.push({
      name:           String(obj.name || '').trim(),
      sku:            String(obj.sku || '').trim(),
      category:       cat,
      variation:      String(obj.variation || '').trim(),
      size:           String(obj.size || '').trim(),
      rental_price:   cleanNumber(obj.rental_price),
      purchase_price: cleanNumber(obj.purchase_price),
      total_stock:    Number(obj.total_stock) || 0,
      notes:          String(obj.notes || '').trim(),
    })
  }
  return { rows, errors }
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ExcelUploadModal({ open, onClose, onImport }) {
  const inputRef = useRef()
  const [step, setStep] = useState('pick') // pick | map | preview | importing | done
  const [fileName, setFileName] = useState('')
  const [rawHeaders, setRawHeaders] = useState([])
  const [rawData, setRawData] = useState([])
  const [mapping, setMapping] = useState({})
  const [preview, setPreview] = useState([])
  const [parseErrors, setParseErrors] = useState([])
  const [importResult, setImportResult] = useState(null)
  const [dragging, setDragging] = useState(false)

  function reset() {
    setStep('pick'); setFileName(''); setRawHeaders([]); setRawData([])
    setMapping({}); setPreview([]); setParseErrors([]); setImportResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleClose() { reset(); onClose() }

  function processFile(file) {
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const wb = XLSX.read(e.target.result, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
      if (raw.length < 2) { setParseErrors(['File kosong atau hanya berisi header.']); setStep('map'); return }

      const headers = raw[0].map(h => String(h).trim()).filter(h => h !== '')
      const data = raw.slice(1)
      const autoMap = autoDetectMapping(headers)

      setRawHeaders(headers)
      setRawData(data)
      setMapping(autoMap)
      setStep('map')
    }
    reader.readAsArrayBuffer(file)
  }

  function handleFile(e) { processFile(e.target.files[0]) }
  function handleDrop(e) { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]) }

  function applyMapping() {
    const { rows, errors } = buildRows(rawData, rawHeaders, mapping)
    setPreview(rows)
    setParseErrors(errors)
    setStep('preview')
  }

  async function handleImport() {
    setStep('importing')
    const result = await onImport(preview)
    setImportResult(result)
    setStep('done')
  }

  // Count how many headers are mapped to each field (to prevent duplicates in select)
  const usedFields = Object.values(mapping).filter(v => v !== '__skip__')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.6)' }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl slide-in flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <i className="fas fa-file-excel text-emerald-600 text-lg"></i>
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Import dari Excel</h3>
              <p className="text-xs text-slate-400">
                {step === 'pick' && 'Upload file .xlsx / .xls'}
                {step === 'map' && `Konfirmasi pemetaan kolom — ${fileName}`}
                {step === 'preview' && `Preview ${preview.length} item — ${fileName}`}
                {step === 'importing' && 'Sedang mengimport...'}
                {step === 'done' && 'Import selesai'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Step indicator */}
        {['map','preview','importing','done'].includes(step) && (
          <div className="px-5 pt-3 flex items-center gap-2 flex-shrink-0">
            {[['map','1','Pemetaan'],['preview','2','Preview'],['done','3','Selesai']].map(([s, num, label]) => {
              const active = step === s || (s === 'done' && step === 'importing')
              const done = (s === 'map' && ['preview','importing','done'].includes(step))
                        || (s === 'preview' && ['importing','done'].includes(step))
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full text-[10px] font-extrabold flex items-center justify-center
                    ${done ? 'bg-emerald-500 text-white' : active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {done ? <i className="fas fa-check text-[8px]"></i> : num}
                  </div>
                  <span className={`text-xs font-semibold ${active || done ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
                  {s !== 'done' && <div className="w-6 h-px bg-slate-200 mx-1"></div>}
                </div>
              )
            })}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── PICK ── */}
          {step === 'pick' && (
            <>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition
                  ${dragging ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40'}`}
              >
                <i className="fas fa-cloud-upload-alt text-4xl text-slate-300 mb-3 block"></i>
                <p className="font-bold text-slate-600">Drag & drop file Excel di sini</p>
                <p className="text-sm text-slate-400 mt-1">atau klik untuk memilih file</p>
                <p className="text-xs text-slate-300 mt-2">.xlsx · .xls</p>
                <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500">
                <p className="font-bold text-slate-700 mb-2">Sistem akan otomatis mendeteksi kolom — nama kolom bebas.</p>
                <p>Setelah upload, kamu bisa konfirmasi atau ubah pemetaan sebelum import.</p>
              </div>
            </>
          )}

          {/* ── MAP ── */}
          {step === 'map' && (
            <>
              <p className="text-sm text-slate-600">
                Sistem mendeteksi <strong>{rawHeaders.length} kolom</strong> dari Excel. Pastikan setiap kolom sudah dipetakan ke field yang benar, atau pilih <em>Lewati</em> jika tidak perlu.
              </p>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-extrabold text-slate-500 uppercase">Kolom di Excel</th>
                      <th className="text-left px-4 py-2.5 text-xs font-extrabold text-slate-500 uppercase">Contoh Nilai</th>
                      <th className="text-left px-4 py-2.5 text-xs font-extrabold text-slate-500 uppercase">Dipetakan ke</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rawHeaders.map((h, idx) => {
                      const sample = rawData.slice(0, 3).map(r => r[idx]).filter(v => v !== '' && v != null).join(', ')
                      const currentVal = mapping[h] || '__skip__'
                      const isAutoMapped = currentVal !== '__skip__'
                      return (
                        <tr key={h} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-700">{h}</td>
                          <td className="px-4 py-2.5 text-xs text-slate-400 max-w-[140px] truncate">{sample || '—'}</td>
                          <td className="px-4 py-2.5">
                            <select
                              value={currentVal}
                              onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}
                              className={`w-full border rounded-lg px-2 py-1.5 text-xs bg-white transition
                                ${isAutoMapped ? 'border-emerald-300 text-emerald-700 font-semibold' : 'border-slate-200 text-slate-500'}`}
                            >
                              <option value="__skip__">— Lewati —</option>
                              {FIELDS.map(f => {
                                const alreadyUsed = usedFields.filter(v => v === f.key).length > 1
                                  && mapping[h] !== f.key
                                return (
                                  <option key={f.key} value={f.key} disabled={alreadyUsed}>
                                    {f.label}{f.required ? ' *' : ''}
                                  </option>
                                )
                              })}
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Required fields check */}
              {(() => {
                const mappedFields = Object.values(mapping).filter(v => v !== '__skip__')
                const missingRequired = FIELDS.filter(f => f.required && !mappedFields.includes(f.key))
                if (missingRequired.length === 0) return null
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-start gap-2">
                    <i className="fas fa-exclamation-triangle mt-0.5 flex-shrink-0"></i>
                    <span>Field wajib belum dipetakan: <strong>{missingRequired.map(f => f.label).join(', ')}</strong></span>
                  </div>
                )
              })()}
            </>
          )}

          {/* ── PREVIEW ── */}
          {step === 'preview' && (
            <>
              {parseErrors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-bold text-amber-700 flex items-center gap-1">
                    <i className="fas fa-exclamation-triangle"></i> {parseErrors.length} baris dilewati
                  </p>
                  {parseErrors.map((e, i) => <p key={i} className="text-xs text-amber-600">{e}</p>)}
                </div>
              )}

              {preview.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <i className="fas fa-inbox text-3xl mb-2 block"></i>
                  <p>Tidak ada data valid. Kembali dan perbaiki pemetaan kolom.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-700">{preview.length} item siap diimport</p>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          {['SKU','Nama','Kategori','Varian','Ukuran','Harga Sewa','Stok'].map(h => (
                            <th key={h} className="text-left px-3 py-2 text-[10px] font-extrabold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {preview.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono text-slate-600">{row.sku || <span className="text-slate-300">-</span>}</td>
                            <td className="px-3 py-2 font-semibold text-slate-800">{row.name}</td>
                            <td className="px-3 py-2">
                              {row.category
                                ? <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">{row.category}</span>
                                : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-3 py-2 text-slate-500">{row.variation || <span className="text-slate-300">-</span>}</td>
                            <td className="px-3 py-2 text-slate-500">{row.size || <span className="text-slate-300">-</span>}</td>
                            <td className="px-3 py-2 font-bold text-slate-800">
                              {row.rental_price ? `Rp ${row.rental_price.toLocaleString()}` : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-3 py-2 font-bold text-slate-800">{row.total_stock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── IMPORTING ── */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="font-bold text-slate-700">Mengimport {preview.length} item...</p>
              <p className="text-sm text-slate-400 mt-1">Mohon tunggu</p>
            </div>
          )}

          {/* ── DONE ── */}
          {step === 'done' && importResult && (
            <div className="text-center py-8">
              <div className={`w-16 h-16 ${importResult.failed === 0 ? 'bg-emerald-100' : 'bg-amber-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                <i className={`fas fa-${importResult.failed === 0 ? 'check' : 'exclamation-triangle'} text-2xl ${importResult.failed === 0 ? 'text-emerald-600' : 'text-amber-600'}`}></i>
              </div>
              <h4 className="font-bold text-lg text-slate-800 mb-1">Import Selesai</h4>
              <p className="text-slate-500 text-sm mb-4">
                <span className="text-emerald-600 font-bold">{importResult.success} berhasil</span>
                {importResult.failed > 0 && <span className="text-rose-500 font-bold"> · {importResult.failed} gagal</span>}
              </p>
              {importResult.errors?.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-left space-y-1 max-h-32 overflow-y-auto">
                  {importResult.errors.map((e, i) => <p key={i} className="text-xs text-rose-600">{e}</p>)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button onClick={handleClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition">
            {step === 'done' ? 'Tutup' : 'Batal'}
          </button>

          {step === 'map' && (
            <>
              <button onClick={reset} className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition flex items-center gap-1">
                <i className="fas fa-redo text-xs"></i> Ganti File
              </button>
              <button
                onClick={applyMapping}
                disabled={(() => {
                  const mapped = Object.values(mapping).filter(v => v !== '__skip__')
                  return FIELDS.filter(f => f.required).some(f => !mapped.includes(f.key))
                })()}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
              >
                Lanjut Preview <i className="fas fa-arrow-right text-xs"></i>
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button onClick={() => setStep('map')} className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition flex items-center gap-1">
                <i className="fas fa-arrow-left text-xs"></i> Ubah Pemetaan
              </button>
              {preview.length > 0 && (
                <button onClick={handleImport} className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
                  <i className="fas fa-file-import"></i> Import {preview.length} Item
                </button>
              )}
            </>
          )}

          {step === 'done' && (
            <button onClick={reset} className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition">
              Import File Lain
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
