import { PageHeading } from '../../components/admin/AdminUi'

function AdminAuditLog() {
  return (
    <div className="admin-page">
      <PageHeading
        eyebrow="Governance"
        title="Audit log"
        description="A record of administrative changes and access events."
      />
    </div>
  )
}

export default AdminAuditLog
