import { useState } from "react"
import AdminPage from "./admin/AdminPage"

export default function App() {
  const [view, setView] = useState("technician")
  const [file, setFile] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [result, setResult] = useState(null)
  const [opacity, setOpacity] = useState(0.45)
  const [fitScreen, setFitScreen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [verdictStatus, setVerdictStatus] = useState(null)  // null | "submitting" | "accepted" | "rejected" | "error"
  const [verdictError, setVerdictError] = useState(null)
  const [defectCategory, setDefectCategory] = useState(null)

  const onFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setImageUrl(URL.createObjectURL(f))
    setResult(null)
    setVerdictStatus(null)
    setVerdictError(null)
    setDefectCategory(null)
  }

  const submitFeedback = async (verdict) => {
    if (!result || !file) return
    setVerdictStatus("submitting")
    setVerdictError(null)
    try {
      const res = await fetch("/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_filename: file.name,
          anomaly_score: result.score,
          is_anomalous: result.is_anomalous,
          verdict,
          defect_category: defectCategory,
        }),
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      setVerdictStatus(verdict === "accept" ? "accepted" : "rejected")
    } catch (e) {
      setVerdictStatus("error")
      setVerdictError(e.message)
    }
  }

  const runDetection = async () => {
    if (!file) return
    setLoading(true)
    setVerdictStatus(null)
    setVerdictError(null)

    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch(`/detect_anomaly`,
   {
      method: "POST",
      body: formData,
    })

    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">PartSense</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView("technician")}
            className={`px-3 py-1 rounded text-sm ${view === "technician" ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"}`}
          >
            Inspection
          </button>
          <button
            onClick={() => setView("admin")}
            className={`px-3 py-1 rounded text-sm ${view === "admin" ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"}`}
          >
            Admin
          </button>
        </div>
      </div>

      {view === "admin" && <AdminPage />}

      {view === "technician" && <>
      <div className="flex items-center gap-3 mb-3">
        <input
          type="file"
          accept="image/*"
          onChange={onFileChange}
        />
        <button
          onClick={runDetection}
          disabled={!file || loading}
          className="px-4 py-1.5 bg-blue-600 rounded text-sm disabled:opacity-50"
        >
          {loading ? "Running…" : "Detect anomaly"}
        </button>
      </div>

      {result && (
        <div>
          <div className="flex items-center gap-6 mb-1 text-sm">
            <span>
              Status:{" "}
              <span className={result.is_anomalous ? "text-red-400 font-semibold" : "text-green-400 font-semibold"}>
                {result.is_anomalous ? "ANOMALOUS" : "NORMAL"}
              </span>
            </span>
            <span className="text-gray-400">
              Score: <span className="text-white">{result.score.toFixed(4)}</span>
            </span>
          </div>

          <div className="flex items-center gap-3 mt-2 mb-2">
            {verdictStatus === null || verdictStatus === "submitting" ? (
              <>
                <select
                  value={defectCategory || ""}
                  onChange={(e) => setDefectCategory(e.target.value || null)}
                  disabled={verdictStatus === "submitting"}
                  className="px-2 py-1 bg-gray-700 rounded text-sm text-gray-300 disabled:opacity-50"
                >
                  <option value="">Category (optional)</option>
                  <option value="Crack">Crack</option>
                  <option value="Corrosion">Corrosion</option>
                  <option value="Dent">Dent</option>
                  <option value="Scratch">Scratch</option>
                  <option value="Other">Other</option>
                </select>
                <button
                  onClick={() => submitFeedback("accept")}
                  disabled={verdictStatus === "submitting"}
                  className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-sm disabled:opacity-50 transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={() => submitFeedback("reject")}
                  disabled={verdictStatus === "submitting"}
                  className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-sm disabled:opacity-50 transition-colors"
                >
                  Reject
                </button>
                {verdictStatus === "submitting" && (
                  <span className="text-xs text-gray-400">Saving…</span>
                )}
              </>
            ) : verdictStatus === "error" ? (
              <span className="text-sm text-red-400">Error: {verdictError}</span>
            ) : (
              <span className="text-sm text-green-400">
                Feedback recorded — {verdictStatus === "accepted" ? "Accepted" : "Rejected"}
              </span>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
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

          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setFitScreen(true)}
              className={`px-2 py-0.5 rounded text-xs ${fitScreen ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"}`}
            >
              Fit to screen
            </button>
            <button
              onClick={() => setFitScreen(false)}
              className={`px-2 py-0.5 rounded text-xs ${!fitScreen ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"}`}
            >
              Actual size
            </button>
          </div>

          <div className={`relative inline-block ${fitScreen ? "max-h-[calc(100vh-220px)] overflow-hidden" : ""}`}>
            <img
              src={imageUrl}
              alt="input"
              className={fitScreen ? "max-w-full max-h-[calc(100vh-220px)] object-contain" : ""}
            />
            <img
              src={`data:image/png;base64,${result.heatmap}`}
              alt="heatmap"
              className={`absolute top-0 left-0 ${fitScreen ? "max-w-full max-h-[calc(100vh-220px)] object-contain" : ""}`}
              style={{ opacity }}
            />
          </div>
        </div>
      )}
      </>}
    </div>
  )
}
