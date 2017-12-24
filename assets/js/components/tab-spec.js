const moment = require('moment')
const ESM_TAG = 'Event: Should Contact Host'

const isInPast = ev => {
  const match_date = ev.end_date || ev.start_date
  return new Date(match_date).getTime() < new Date().getTime()
}

const isInFuture = ev => {
  const match_date = ev.end_date || ev.start_date
  return new Date(match_date).getTime() > new Date().getTime()
}

const isIn5Days = ev => {
  const match_date = ev.end_date || ev.start_date
  return moment(match_date).diff(moment(), 'days') < 5
}

export default [
  {
    title: 'Interest Form',
    fn: ev => false
  },
  {
    title: 'Needs Approval',
    fn: ev => isInFuture(ev) && ev.status == 'tentative'
  },
  {
    title: 'Upcoming',
    fn: ev => {
      return (
        ev.status == 'confirmed' &&
        isInFuture(ev) &&
        !isIn5Days(ev) &&
        !ev.tags.includes('Event: Action: Logisticsed')
      )
    }
  },
  {
    title: 'ESM Call',
    fn: ev =>
      isInFuture(ev) &&
      ev.status == 'confirmed' &&
      isIn5Days(ev) &&
      !ev.tags.includes('Event: Action: Logisticsed')
  },
  {
    title: 'Ready to Go',
    fn: ev =>
      isInFuture(ev) &&
      ev.status == 'confirmed' &&
      isIn5Days(ev) &&
      ev.tags.includes('Event: Action: Logisticsed')
  },
  {
    title: 'Needs Debrief',
    fn: ev => {
      const match_date = ev.end_date || ev.start_date

      return (
        ev.status == 'confirmed' &&
        isInPast(ev) &&
        !ev.tags.includes('Event: Action: Debriefed')
      )
    }
  },
  {
    title: 'Past',
    fn: ev => {
      const match_date = ev.end_date || ev.start_date

      return isInPast(ev) && ev.tags.includes('Event: Action: Debriefed')
    }
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
