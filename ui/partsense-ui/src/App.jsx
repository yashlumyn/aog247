import { useState } from "react"

export default function App() {
  const [file, setFile] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [result, setResult] = useState(null)
  const [opacity, setOpacity] = useState(0.45)
  const [loading, setLoading] = useState(false)

  const onFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setImageUrl(URL.createObjectURL(f))
    setResult(null)
  }

  const runDetection = async () => {
    if (!file) return
    setLoading(true)

    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch(`${import.meta.env.VITE_API_URL}/detect_anomaly`,
   {
      method: "POST",
      body: formData,
    })

    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-4">PartSense</h1>

      <input
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="mb-4"
      />

      <div>
        <button
          onClick={runDetection}
          disabled={!file || loading}
          className="px-4 py-2 bg-blue-600 rounded disabled:opacity-50"
        >
          {loading ? "Running…" : "Detect anomaly"}
        </button>
      </div>

      {result && (
        <div className="mt-6">
          <div className="mb-2">
            Status:{" "}
            <span
              className={
                result.is_anomalous ? "text-red-400" : "text-green-400"
              }
            >
              {result.is_anomalous ? "ANOMALOUS" : "NORMAL"}
            </span>
          </div>

          <div className="mb-2 text-sm opacity-70">
            Score: {result.score.toFixed(4)}
          </div>

          <label className="text-sm">
            Heatmap opacity
            <input
              type="range"
              min="0.1"
              max="0.8"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(e.target.value)}
              className="ml-2"
            />
          </label>

         <div className="relative mt-4 inline-block">
          <img
            src={imageUrl}
            alt="input"
            className="max-w-full max-h-[80vh] object-contain"
          />

          <img
            src={`data:image/png;base64,${result.heatmap}`}
            alt="heatmap"
            className="absolute top-0 left-0 max-w-full max-h-[80vh] object-contain"
            style={{ opacity }}
          />
        </div>

        </div>
      )}
    </div>
  )
}
