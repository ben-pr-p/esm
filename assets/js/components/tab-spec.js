const ESM_TAG = 'Event: Should Contact Host'

export default [
  {
    title: 'ESM Call #1',
    fn: ev =>
      ev.tags.includes(ESM_TAG) &&
      ev.status == 'tentative' &&
      !ev.tags.includes('Event: Action: Called')
  },
  {
    title: 'Needs Approval',
    fn: ev =>
      ev.status == 'tentative' &&
      (!ev.tags.includes(ESM_TAG) || ev.tags.includes('Event: Action: Called'))
  },
  {
    title: 'Needs Logistics',
    fn: ev =>
      ev.tags.includes(ESM_TAG) &&
      ev.status == 'confirmed' &&
      !ev.tags.includes('Event: Action: Logisticsed')
  },
  {
    title: 'Upcoming',
    fn: ev =>
      ev.status == 'confirmed' &&
      new Date(ev.end_date).getTime() > new Date().getTime() &&
      (!ev.tags.includes(ESM_TAG) ||
        ev.tags.includes('Event: Action: Logisticsed'))
  },
  {
    title: 'Needs Debrief',
    fn: ev =>
      ev.status == 'confirmed' &&
      new Date(ev.end_date).getTime() < new Date().getTime() &&
      !ev.tags.includes('Event: Action: Debriefed')
  },
  {
    title: 'Past',
    fn: ev =>
      new Date(ev.end_date).getTime() < new Date().getTime() &&
      ev.tags.includes('Event: Action: Debriefed')
  },
  {
    title: 'Rejected',
    fn: ev => ev.status == 'rejected'
  },
  {
    title: 'Cancelled',
    fn: ev => ev.status == 'cancelled'
  }
]
