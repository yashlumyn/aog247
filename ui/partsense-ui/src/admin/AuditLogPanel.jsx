import { useEffect, useState } from "react"

// refreshKey: increment from parent to trigger a reload

const COLUMNS = [
  { key: "timestamp",      label: "Timestamp" },
  { key: "model_id",       label: "Model" },
  { key: "image_filename", label: "Image" },
  { key: "score",          label: "Score" },
  { key: "is_anomalous",   label: "Result" },
]

export default function AuditLogPanel({ refreshKey = 0 }) {
  const [entries, setEntries] = useState(undefined)
  const [error, setError]     = useState(null)

  const load = () => {
    setError(null)
    fetch("/admin/log")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.json()
      })
      .then(setEntries)
      .catch((e) => setError(e.message))
  }

  useEffect(() => { if (refreshKey > 0) load() }, [refreshKey])

  const downloadCsv = () => {
    window.location.href = "/admin/log/download"
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-white">Audit Log</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={downloadCsv}
            disabled={!entries || entries.length === 0}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Download CSV
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 mb-2">{error}</p>
      )}

      {entries === undefined && !error && (
        <p className="text-xs text-gray-500">No entries yet — click Refresh to load.</p>
      )}

      {entries !== undefined && entries.length === 0 && (
        <p className="text-xs text-gray-500">No inference entries yet.</p>
      )}

      {entries !== undefined && entries.length > 0 && (
        <div className="overflow-auto max-h-64 rounded border border-gray-700">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-750">
              <tr className="border-b border-gray-700">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap bg-gray-900"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {entries.map((row, i) => (
                <tr key={i} className="hover:bg-gray-750">
                  <td className="px-3 py-1.5 text-gray-400 whitespace-nowrap font-mono">
                    {row.timestamp}
                  </td>
                  <td className="px-3 py-1.5 text-gray-300 whitespace-nowrap font-mono">
                    {row.model_id}
                  </td>
                  <td className="px-3 py-1.5 text-gray-300 max-w-[160px] truncate" title={row.image_filename}>
                    {row.image_filename}
                  </td>
                  <td className="px-3 py-1.5 text-white font-mono whitespace-nowrap">
                    {parseFloat(row.score).toFixed(4)}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <span className={`font-semibold ${row.is_anomalous === "True" ? "text-red-400" : "text-green-400"}`}>
                      {row.is_anomalous === "True" ? "ANOMALOUS" : "NORMAL"}
                    </span>
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
