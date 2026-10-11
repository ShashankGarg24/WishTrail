import api from './api'
import { datadogRum } from '@datadog/browser-rum'
let pendingTeaser
export const weeklyTrailAPI = {
  current: () => api.get('/weekly-trail/current').then(r => r.data.data),
  teaser: () => {
    if (!pendingTeaser) pendingTeaser = api.get('/weekly-trail/teaser').then(r => r.data.data).finally(() => { pendingTeaser = null })
    return pendingTeaser
  },
  history: cursor => api.get('/weekly-trail/history', { params: { cursor } }).then(r => r.data.data),
  week: key => api.get(`/weekly-trail/${encodeURIComponent(key)}`).then(r => r.data.data),
  seen: key => api.post(`/weekly-trail/${encodeURIComponent(key)}/seen`),
}
export function trailEvent(name, recap) {
  datadogRum.addAction(name, { periodKey: recap?.periodKey, current: recap?.weekInProgress })
}
