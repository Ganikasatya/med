import { useState } from 'react'
import { Camera } from 'lucide-react'
import { Avatar } from '../clinic/ui.jsx'
import { fileUrl } from '../../api'

/**
 * Reusable photo/logo uploader. Shows the current image (or an initials avatar)
 * with a camera button; on pick it calls `onUpload(formData)` which should POST
 * the file and return the new image URL. Used by patient / doctor / clinic.
 */
export default function PhotoUpload({ url, name, onUpload, label = 'Tap the camera to add or change photo', size = 'h-24 w-24', rounded = 'rounded-full' }) {
  const [preview, setPreview] = useState(url || null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const onChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setErr(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const newUrl = await onUpload(fd)
      if (newUrl) setPreview(newUrl)
    } catch (e2) {
      setErr(e2.message || 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {preview ? (
          <img src={fileUrl(preview)} alt={name} className={`${size} ${rounded} object-cover ring-4 ring-slate-100`} />
        ) : (
          <Avatar name={name} className={`${size} text-2xl`} />
        )}
        <label className={`absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-white shadow-md hover:bg-brand-blueDark ${busy ? 'opacity-60' : 'cursor-pointer'}`}>
          <Camera className="h-4 w-4" />
          <input type="file" accept="image/*" className="hidden" onChange={onChange} disabled={busy} />
        </label>
      </div>
      <p className="text-[12px] text-slate-400">{busy ? 'Uploading…' : err || label}</p>
    </div>
  )
}
