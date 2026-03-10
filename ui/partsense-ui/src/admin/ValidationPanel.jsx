import { useRef, useState } from "react"

export default function ValidationPanel({ onComplete }) {
  const [imageUrl, setImageUrl]   = useState(null)
  const [file, setFile]           = useState(null)
  const [result, setResult]       = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [opacity, setOpacity]     = useState(0.45)
  const inputRef                  = useRef(null)

  const onFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setImageUrl(URL.createObjectURL(f))
    setResult(null)
    setError(null)
  }

  const runInference = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/detect_anomaly", { method: "POST", body: formData })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      setResult(await res.json())
      onComplete?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Validation Inference</h2>

      <div className="flex items-center gap-3 mb-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="text-sm text-gray-300"
        />
        <button
          onClick={runInference}
          disabled={!file || loading}
          className="px-3 py-1.5 bg-blue-600 rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
        >
          {loading ? "Running…" : "Run"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-400 mb-3">{error}</p>
      )}

      {result && (
        <div>
          <div className="flex items-center gap-5 mb-1 text-sm">
            <span>
              Status:{" "}
              <span className={`font-semibold ${result.is_anomalous ? "text-red-400" : "text-green-400"}`}>
                {result.is_anomalous ? "ANOMALOUS" : "NORMAL"}
              </span>
            </span>
            <span className="text-gray-400">
              Score: <span className="text-white font-mono">{result.score.toFixed(4)}</span>
            </span>
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            Heatmap opacity
            <input
              type="range"
              min="0.1"
              max="0.8"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(e.target.value)}
            />
          </label>

          <div className="relative inline-block">
            <img
              src={imageUrl}
              alt="input"
              className="max-w-full max-h-64 object-contain rounded"
            />
            <img
              src={`data:image/png;base64,${result.heatmap}`}
              alt="heatmap"
              className="absolute top-0 left-0 max-w-full max-h-64 object-contain"
              style={{ opacity }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
