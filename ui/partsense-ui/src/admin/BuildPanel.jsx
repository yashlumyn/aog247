import { useEffect, useRef, useState } from "react"

const STATUS_STYLES = {
  idle:    "text-gray-400",
  running: "text-yellow-400",
  success: "text-green-400",
  failed:  "text-red-400",
}

const STATUS_LABELS = {
  idle:    "Idle",
  running: "Running…",
  success: "Success",
  failed:  "Failed",
}

const STAGES = [
  { key: "MODEL_LOAD",  label: "Model load",          detail: "WideResNet50 weights loading" },
  { key: "IMAGE_LOOP",  label: "Process images",       detail: null }, // detail set dynamically
  { key: "CONCATENATE", label: "Concatenate patches",  detail: "Merging patch tensors" },
  { key: "SUBSAMPLE",   label: "Subsample",            detail: "Reducing to 20,000 patches" },
  { key: "SAVE",        label: "Save memory bank",     detail: "Writing memory bank to disk" },
]

const STAGE_KEYS = STAGES.map((s) => s.key)

function parseStage(line) {
  if (!line.startsWith("STAGE:")) return null
  const rest = line.slice(6)
  if (rest.startsWith("IMAGE_LOOP ")) {
    const [idx, total] = rest.slice(11).split("/").map(Number)
    return { key: "IMAGE_LOOP", imageIdx: idx, imageTotal: total }
  }
  return { key: rest.trim() }
}

function computeProgress(parsed, status) {
  if (status === "success") return 100
  if (!parsed) return 0
  const { key, imageIdx, imageTotal } = parsed
  if (key === "IMAGE_LOOP" && imageIdx && imageTotal) {
    return 10 + Math.round((imageIdx / imageTotal) * 60)
  }
  const base = { MODEL_LOAD: 2, IMAGE_LOOP: 10, CONCATENATE: 70, SUBSAMPLE: 82, SAVE: 92 }
  return base[key] ?? 0
}

// pending | active | done | failed
function stageState(stageKey, activeKey, status) {
  if (!activeKey) return "pending"
  const activeIdx = STAGE_KEYS.indexOf(activeKey)
  const thisIdx   = STAGE_KEYS.indexOf(stageKey)
  if (status === "success") return "done"
  if (status === "failed" && stageKey === activeKey) return "failed"
  if (thisIdx < activeIdx) return "done"
  if (thisIdx === activeIdx) return "active"
  return "pending"
}

function StepIndicator({ state, number }) {
  if (state === "done") {
    return (
      <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    )
  }
  if (state === "active") {
    return (
      <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 ring-2 ring-blue-400 ring-offset-1 ring-offset-gray-800">
        <span className="text-white" style={{fontSize:"9px"}}>{number}</span>
      </div>
    )
  }
  if (state === "failed") {
    return (
      <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
        <span className="text-white" style={{fontSize:"9px"}}>✕</span>
      </div>
    )
  }
  return (
    <div className="w-4 h-4 rounded-full border border-gray-600 flex items-center justify-center flex-shrink-0">
      <span className="text-gray-500" style={{fontSize:"9px"}}>{number}</span>
    </div>
  )
}

export default function BuildPanel() {
  const [status, setStatus]     = useState("idle")
  const [logs, setLogs]         = useState([])
  const [summary, setSummary]   = useState(null)
  const [progress, setProgress] = useState(0)
  const [stageInfo, setStageInfo] = useState(null)  // { key, imageIdx, imageTotal }
  const logEndRef               = useRef(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  const activeKey = stageInfo?.key ?? null

  const runBuild = async () => {
    setStatus("running")
    setLogs([])
    setSummary(null)
    setProgress(0)
    setStageInfo(null)

    const res = await fetch("/admin/build", { method: "POST" })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      setLogs([`Error: ${err.detail}`])
      setStatus("failed")
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })

      const events = buf.split("\n\n")
      buf = events.pop()

      for (const event of events) {
        const dataLine = event.replace(/^data: /, "").trim()
        if (!dataLine) continue
        try {
          const msg = JSON.parse(dataLine)
          if (msg.type === "log") {
            const parsed = parseStage(msg.line)
            if (parsed) {
              setStageInfo(parsed)
              setProgress(computeProgress(parsed, "running"))
            } else {
              setLogs((prev) => [...prev, msg.line])
            }
          } else if (msg.type === "done") {
            setStatus(msg.status)
            setProgress(msg.status === "success" ? 100 : progress)
            setSummary({ images: msg.images, memory_shape: msg.memory_shape })
          }
        } catch {
          // ignore malformed event
        }
      }
    }
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-white">Build Memory Bank</h2>
        <span className={`text-xs font-mono ${STATUS_STYLES[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      <button
        onClick={runBuild}
        disabled={status === "running"}
        className="px-3 py-1 bg-blue-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
      >
        Build Memory Bank
      </button>

      {/* Step list — always visible */}
      <ol className="mt-3 space-y-1.5">
        {STAGES.map((stage, i) => {
          const state = stageState(stage.key, activeKey, status)
          const isPending = state === "pending"
          const isActive  = state === "active"

          let detail = stage.detail
          if (stage.key === "IMAGE_LOOP" && isActive && stageInfo?.imageTotal) {
            detail = `Processing image ${stageInfo.imageIdx} of ${stageInfo.imageTotal}`
          }

          return (
            <li key={stage.key} className="flex items-center gap-2">
              <StepIndicator state={state} number={i + 1} />
              <div className="flex items-baseline gap-2 min-w-0">
                <span className={`text-xs font-medium ${isPending ? "text-gray-500" : "text-white"}`}>
                  {i + 1}. {stage.label}
                </span>
                {detail && (
                  <span className={`text-xs truncate ${isPending ? "text-gray-600" : isActive ? "text-blue-300" : "text-gray-400"}`}>
                    {detail}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {/* Progress bar */}
      <div className="mt-3 space-y-0.5">
        <div className="w-full bg-gray-700 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              status === "failed" ? "bg-red-500" : status === "success" ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 text-right">{progress}%</div>
      </div>

      {/* Log window */}
      {logs.length > 0 && (
        <div className="mt-2 rounded bg-gray-900 border border-gray-700 p-2 h-24 overflow-y-auto font-mono text-xs text-gray-400">
          {logs.map((line, i) => (
            <div key={i}>{line || "\u00A0"}</div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}

      {/* Summary */}
      {summary && status === "success" && (
        <div className="mt-2 text-xs text-gray-300 space-y-0.5">
          {summary.images !== undefined && (
            <div>Images used: <span className="text-white font-mono">{summary.images}</span></div>
          )}
          {summary.memory_shape && (
            <div>Memory shape: <span className="text-white font-mono">{summary.memory_shape}</span></div>
          )}
        </div>
      )}
    </div>
  )
}
