import api from './api'
import { trackAction } from '../lib/observability/datadog'

let pendingCurrent
export const weeklyTrailAPI = {
  current: ({ includeSeen = false, dedupe = false } = {}) => {
    const request = () => api.get('/weekly-trail/current', { params: includeSeen ? { includeSeen:true } : undefined }).then(r => r.data.data)
    if (!dedupe) return request()
    if (!pendingCurrent) pendingCurrent = request().finally(() => { pendingCurrent = null })
    return pendingCurrent
  },
  seen: periodKey => api.post('/weekly-trail/current/seen', { periodKey }).then(r => r.data.data),
}

export function trailEvent(name, data) {
  const recap = data?.recap || data
  trackAction(name, {
    periodKey:data?.periodKey || recap?.periodKey,
    activeDays:recap?.activeDays,
    goalsProgressed:recap?.goalsProgressed,
    habitCompletions:recap?.habitCompletions
  })
}
