/**
 * ResumeDownloadButton.jsx
 *
 * A button that triggers PDF generation and download using @react-pdf/renderer.
 * Renders the ResumeDocument into a PDF blob in the browser — no server needed.
 */

import { PDFDownloadLink } from '@react-pdf/renderer'
import { ResumeDocument } from './ResumeTemplate'
import Button from './ui/Button'

/**
 * @param {object}  resume   - Standard Resume JSON
 * @param {string}  filename - Download filename (without .pdf)
 * @param {string}  label    - Button label (default: "Download PDF")
 * @param {string}  variant  - Button variant (filled | outline | ghost)
 * @param {string}  className
 */
export default function ResumeDownloadButton({
  resume,
  filename = 'resume',
  label    = '⬇ Download PDF',
  variant  = 'filled',
  className = '',
}) {
  // Sanitize filename — no special chars
  const safeFilename = filename.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_')

  return (
    <PDFDownloadLink
      document={<ResumeDocument resume={resume} />}
      fileName={`${safeFilename}.pdf`}
      style={{ textDecoration: 'none' }}
    >
      {({ loading }) => (
        <Button variant={variant} className={className} disabled={loading}>
          {loading ? '⏳ Generating PDF…' : label}
        </Button>
      )}
    </PDFDownloadLink>
  )
}
