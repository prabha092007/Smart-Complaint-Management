/** Shared rules for complaint proof-image uploads (used by the form and the service). */
export const PROOF_BUCKET = 'complaint-proofs'
export const MAX_PROOF_FILES = 2
export const PROOF_MIME_TYPES = ['image/jpeg', 'image/png']
export const MAX_PROOF_BYTES = 5 * 1024 * 1024 // 5 MB

/** @returns {string|null} an error message, or null if the selection is valid */
export function validateProofFiles(files = []) {
  if (files.length > MAX_PROOF_FILES) {
    return `You can attach at most ${MAX_PROOF_FILES} proof images.`
  }
  for (const f of files) {
    if (!PROOF_MIME_TYPES.includes(f.type)) {
      return `"${f.name}" is not a JPEG or PNG image.`
    }
    if (f.size > MAX_PROOF_BYTES) {
      return `"${f.name}" is larger than 5 MB.`
    }
  }
  return null
}

export function proofExt(type) {
  return type === 'image/png' ? 'png' : 'jpg'
}

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/** Storage key prefix for one complaint's proof images: `<uid>/<random>` */
export function proofPrefix(userId) {
  return `${userId}/${randomId()}`
}
