/**
 * Shared helper for PDF generation routes.
 * Writes data to a temp JSON file, runs the Python script, returns the PDF buffer.
 * Python must be installed on the server (works locally and on Linux/Vercel with Python layer).
 */
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, readFile } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'

const execAsync = promisify(exec)

// Use 'python' on Windows, 'python3' on Linux/macOS
const PYTHON = process.platform === 'win32' ? 'python' : 'python3'
const SCRIPTS_DIR = path.resolve(process.cwd(), 'scripts', 'pdf')

export async function generatePdf(
  scriptName: string,
  data: unknown,
  filename: string,
): Promise<Response> {
  const id = crypto.randomUUID()
  const dataFile = path.join(tmpdir(), `pdf-data-${id}.json`)
  const outFile = path.join(tmpdir(), `pdf-out-${id}.pdf`)
  const scriptPath = path.join(SCRIPTS_DIR, scriptName)

  try {
    await writeFile(dataFile, JSON.stringify(data))

    const cmd = `"${PYTHON}" "${scriptPath}" "${dataFile}" "${outFile}"`
    await execAsync(cmd, { timeout: 60_000 })

    const pdfBuffer = await readFile(outFile)

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[PDF/${scriptName}] error:`, msg)
    return Response.json({ error: 'PDF generation failed', detail: msg }, { status: 500 })
  } finally {
    await unlink(dataFile).catch(() => {})
    await unlink(outFile).catch(() => {})
  }
}
