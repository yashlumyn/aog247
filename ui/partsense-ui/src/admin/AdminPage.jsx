import { useState } from "react"
import ActiveModelPanel from "./ActiveModelPanel"
import BuildPanel from "./BuildPanel"
import ThresholdPanel from "./ThresholdPanel"
import ValidationPanel from "./ValidationPanel"
import AuditLogPanel from "./AuditLogPanel"
import TrainingDataPanel from "./TrainingDataPanel"

export default function AdminPage() {
  const [auditRefreshKey, setAuditRefreshKey] = useState(0)

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Row 1 — Active Model full width */}
      <div className="col-span-2">
        <ActiveModelPanel />
      </div>
      {/* Row 2 col 1 */}
      <TrainingDataPanel />
      {/* Row 2 col 2 */}
      <BuildPanel />
      {/* Row 3 col 1 */}
      <ThresholdPanel />
      {/* Row 3 col 2 */}
      <ValidationPanel onComplete={() => setAuditRefreshKey((k) => k + 1)} />
      {/* Row 4 col 1 */}
      <div className="col-start-1">
        <AuditLogPanel refreshKey={auditRefreshKey} />
      </div>
    </div>
  )
}
