import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({ title, children, close, locked = false }: { title: string; children: ReactNode; close: () => void; locked?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = ref.current
    el?.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { el?.close(); document.body.style.overflow = previous }
  }, [])
  return <dialog ref={ref} className="modal" aria-labelledby="dialog-title" onCancel={e => { e.preventDefault(); if (!locked) close() }} onClick={e => { if (e.target === e.currentTarget && !locked) {
    const r = e.currentTarget.getBoundingClientRect()
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close()
  } }}>
    <div className="modal-head"><h2 id="dialog-title">{title}</h2>{!locked && <button className="icon-button" onClick={close} aria-label="Close dialog"><X size={19}/></button>}</div>
    {children}
  </dialog>
}
