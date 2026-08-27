/**
 * Department routing with availability fallback.
 * If the preferred department is offline, reroute to the available
 * department carrying the lightest open workload. Pure function so the
 * Test Cases page can exercise it directly.
 *
 * @param {object|null} preferred  { id, name, is_available }
 * @param {object[]} departments    [{ id, name, is_available }]
 * @param {Record<string, number>} openCountByDeptId
 * @returns {{ id, name, rerouted: boolean, reroutedFrom: string|null } | null}
 */
export function chooseDepartment(preferred, departments = [], openCountByDeptId = {}) {
  if (preferred && preferred.is_available !== false) {
    return { id: preferred.id, name: preferred.name, rerouted: false, reroutedFrom: null }
  }
  const available = departments
    .filter(d => d.is_available !== false && d.id !== preferred?.id)
    .sort((a, b) => (openCountByDeptId[a.id] || 0) - (openCountByDeptId[b.id] || 0))

  if (!available.length) {
    return preferred
      ? { id: preferred.id, name: preferred.name, rerouted: false, reroutedFrom: null }
      : null
  }
  const pick = available[0]
  return { id: pick.id, name: pick.name, rerouted: true, reroutedFrom: preferred?.name ?? null }
}
