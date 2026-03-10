import { useEffect, useState } from "react"

const FIELD_LABELS = {
  model_id: "Model ID",
  part_number: "Part Number",
  version: "Version",
  backbone: "Backbone",
  layers: "Layers",
  threshold: "Threshold",
  patch_count: "Patch Count",
  training_images: "Training Images",
  memory_bank_path: "Memory Bank Path",
  git_commit: "Git Commit",
  created_at: "Created",
}

function formatValue(value) {
  if (Array.isArray(value)) return value.join(", ")
  return String(value)
}

export default function ActiveModelPanel() {
  const [meta, setMeta] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch("/admin/active-model")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.json()
      })
      .then(setMeta)
      .catch((e) => setError(e.message))
  }, [])

  if (error) {
    return (
      <div className="rounded-lg border border-red-700 bg-red-900/30 p-4 text-red-300 text-sm">
        Failed to load model metadata: {error}
      </div>
    )
  }

  if (!meta) {
    return <p className="text-gray-400 text-sm">Loading…</p>
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-3">
      <h2 className="text-sm font-semibold mb-2 text-white">Active Model</h2>
      <dl className="grid grid-cols-2 gap-x-8">
        {Object.entries(FIELD_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-baseline gap-3 py-0.5 border-b border-gray-700/40">
            <dt className="text-xs text-gray-400 shrink-0 w-28">{label}</dt>
            <dd className="text-xs text-white font-mono truncate" title={meta[key] !== undefined ? formatValue(meta[key]) : "—"}>
              {meta[key] !== undefined ? formatValue(meta[key]) : "—"}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
