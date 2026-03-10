import { useEffect, useRef, useState } from "react"

const IMAGE_ACCEPT = "image/jpeg,image/png,image/bmp,image/tiff,image/webp"

export default function TrainingDataPanel() {
  const [files, setFiles]           = useState([])
  const [count, setCount]           = useState(0)
  const [selectedFiles, setSelected] = useState([])
  const [uploading, setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [listError, setListError]   = useState(null)
  const [clearConfirm, setClearConfirm] = useState(false)
  const inputRef                    = useRef(null)

  const loadImages = () => {
    setListError(null)
    fetch("/admin/training-images")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.json()
      })
      .then((data) => {
        setFiles(data.files)
        setCount(data.count)
      })
      .catch((e) => setListError(e.message))
  }

  useEffect(() => { loadImages() }, [])

  const handleUpload = async () => {
    if (!selectedFiles.length) return
    setUploading(true)
    setUploadError(null)

    const formData = new FormData()
    for (const f of selectedFiles) formData.append("files", f)

    try {
      const res = await fetch("/admin/training-images/upload", { method: "POST", body: formData })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `${res.status} ${res.statusText}`)
      }
      const data = await res.json()
      setCount(data.count)
      setSelected([])
      if (inputRef.current) inputRef.current.value = ""
      loadImages()
    } catch (e) {
      setUploadError(e.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (filename) => {
    try {
      const res = await fetch(`/admin/training-images/${encodeURIComponent(filename)}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      loadImages()
    } catch (e) {
      setListError(e.message)
    }
  }

  const handleClearAll = async () => {
    try {
      const res = await fetch("/admin/training-images", { method: "DELETE" })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      setClearConfirm(false)
      loadImages()
    } catch (e) {
      setListError(e.message)
      setClearConfirm(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-white">Training Data</h2>
          <p className="text-xs text-gray-500 mt-0.5">{count} image{count !== 1 ? "s" : ""} — renders_v2_baseline</p>
        </div>
        {clearConfirm ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">Delete all images?</span>
            <button
              onClick={handleClearAll}
              className="px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-white transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => setClearConfirm(false)}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setClearConfirm(true)}
            disabled={files.length === 0}
            className="px-2 py-1 bg-gray-700 hover:bg-red-800 rounded text-xs text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Upload row */}
      <div className="flex items-center gap-2 mb-3">
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          onChange={(e) => setSelected(Array.from(e.target.files || []))}
          className="text-xs text-gray-300 flex-1 min-w-0"
        />
        <button
          onClick={handleUpload}
          disabled={!selectedFiles.length || uploading}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {uploading ? "Uploading…" : `Upload${selectedFiles.length > 0 ? ` (${selectedFiles.length})` : ""}`}
        </button>
      </div>

      {uploadError && (
        <p className="text-xs text-red-400 mb-2">{uploadError}</p>
      )}
      {listError && (
        <p className="text-xs text-red-400 mb-2">{listError}</p>
      )}

      {files.length === 0 && !listError && (
        <p className="text-xs text-gray-500">No training images found.</p>
      )}

      {files.length > 0 && (
        <div className="overflow-auto max-h-48 rounded border border-gray-700">
          <table className="w-full text-xs">
            <thead className="sticky top-0">
              <tr className="border-b border-gray-700">
                <th className="px-3 py-2 text-left text-gray-400 font-medium bg-gray-900">Filename</th>
                <th className="px-3 py-2 bg-gray-900 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {files.map((filename) => (
                <tr key={filename} className="hover:bg-gray-750">
                  <td className="px-3 py-1.5 text-gray-300 font-mono">{filename}</td>
                  <td className="px-3 py-1.5 text-right">
                    <button
                      onClick={() => handleDelete(filename)}
                      className="text-gray-500 hover:text-red-400 transition-colors leading-none"
                      title={`Delete ${filename}`}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
