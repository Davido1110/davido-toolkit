import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { saveAs } from 'file-saver'

export async function fillAndDownload(
  templatePath: string,
  data: Record<string, string>,
  filename: string
) {
  const response = await fetch(templatePath)
  if (!response.ok) throw new Error(`Failed to fetch template: ${templatePath}`)

  const buffer = await response.arrayBuffer()
  const zip = new PizZip(buffer)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
  })

  try {
    doc.render(data)
  } catch (err: any) {
    // Expose detailed docxtemplater errors
    const detail = err?.properties?.errors
      ?.map((e: any) => e?.properties?.explanation || e?.message || JSON.stringify(e))
      .join('\n')
    throw new Error(detail || err?.message || 'Template render failed')
  }

  const blob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })

  saveAs(blob, filename)
}
