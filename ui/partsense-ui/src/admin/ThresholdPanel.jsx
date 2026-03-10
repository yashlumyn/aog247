import { useEffect, useState } from "react"

export default function ThresholdPanel() {
  const [current, setCurrent]   = useState(null)   // persisted value from server
  const [input, setInput]       = useState("")      // controlled input
  const [saveState, setSaveState] = useState("idle") // idle | saving | saved | error
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    fetch("/admin/active-model")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      })
      .then((meta) => {
        setCurrent(meta.threshold)
        setInput(String(meta.threshold))
      })
      .catch(() => {
        setErrorMsg("Failed to load current threshold")
      })
  }, [])

  const isDirty   = input !== "" && parseFloat(input) !== current
  const isInvalid = isNaN(parseFloat(input)) || parseFloat(input) <= 0

  const save = async () => {
    if (isInvalid) return
    setSaveState("saving")
    setErrorMsg("")
    try {
      const res = await fetch("/admin/threshold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threshold: parseFloat(input) }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail)
      }
      const data = await res.json()
      setCurrent(data.threshold)
      setInput(String(data.threshold))
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 2500)
    } catch (e) {
      setErrorMsg(e.message)
      setSaveState("error")
    }
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Threshold</h2>
        {current !== null && (
          <span className="text-sm text-gray-400">
            Current: <span className="text-white font-mono">{current}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setSaveState("idle")
            setErrorMsg("")
          }}
          className={`w-32 px-3 py-1.5 rounded bg-gray-900 border text-white text-sm font-mono
            focus:outline-none focus:ring-1 focus:ring-blue-500
            ${isInvalid && input !== "" ? "border-red-500" : "border-gray-600"}`}
        />

        <button
          onClick={save}
          disabled={!isDirty || isInvalid || saveState === "saving"}
          className="px-4 py-1.5 bg-blue-600 rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
        >
          {saveState === "saving" ? "Saving…" : "Save"}
        </button>

        {saveState === "saved" && (
          <span className="text-sm text-green-400">Saved</span>
        )}
        {saveState === "error" && errorMsg && (
          <span className="text-sm text-red-400">{errorMsg}</span>
        )}
      </div>

      {isInvalid && input !== "" && (
        <p className="mt-2 text-xs text-red-400">Must be a number greater than 0</p>
      )}
    </div>
  )
}
