
import { useEffect, useState } from 'react'
import { X, School, Save } from 'lucide-react'
import './SchoolFormModal.css'

function SchoolFormModal({
  mode = 'add',
  school = null,
  saving = false,
  onClose,
  onSubmit,
}) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  const isEdit = mode === 'edit'

  useEffect(() => {
    setName(school?.name || '')
    setCode(school?.code || '')
  }, [school, mode])

  const handleSubmit = (event) => {
    event.preventDefault()

    onSubmit({
      name: name.trim(),
      code: code.trim().toUpperCase(),
    })
  }

  return (
    <div
      className="school-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose()
        }
      }}
    >
      <section
        className="school-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="school-modal-title"
      >
        <div className="school-modal-header">
          <div className="school-modal-heading">
            <div className="school-modal-icon">
              <School size={23} />
            </div>

            <div>
              <h2 id="school-modal-title">
                {isEdit ? 'Edit School' : 'Add New School'}
              </h2>

              <p>
                {isEdit
                  ? 'Update the school information below.'
                  : 'Register a new school in SmartSelect.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="school-modal-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="school-modal-body">
            <div className="school-form-field">
              <label htmlFor="school-name">
                School Name <span>*</span>
              </label>

              <input
                id="school-name"
                type="text"
                placeholder="e.g. School of Computing"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={255}
                required
                autoFocus
              />

              <small>Enter the official name of the school.</small>
            </div>

            <div className="school-form-field">
              <label htmlFor="school-code">
                School Code <span>*</span>
              </label>

              <input
                id="school-code"
                type="text"
                placeholder="e.g. SOC"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.toUpperCase())
                }}
                maxLength={100}
                pattern="[A-Z0-9_-]+"
                title="Use only letters, numbers, underscores and hyphens."
                required
              />

              <small>
                Use uppercase letters, numbers, underscores or hyphens.
              </small>
            </div>
          </div>

          <div className="school-modal-footer">
            <button
              type="button"
              className="school-modal-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="school-modal-submit"
              disabled={saving || !name.trim() || !code.trim()}
            >
              <Save size={16} />

              {saving
                ? 'Saving...'
                : isEdit
                  ? 'Save Changes'
                  : 'Create School'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default SchoolFormModal
