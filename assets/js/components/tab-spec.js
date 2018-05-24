const moment = require("moment-timezone");
const ESM_TAG = "Event: Should Contact Host";

const isInPast = ev => {
  const match_date = ev.end_date || ev.start_date;
  return (
    moment
      .tz(match_date, ev.time_zone || ev.location.time_zone)
      .toDate()
      .getTime() < new Date().getTime()
  );
};

const isToday = ev => {
  const start_date = moment
    .tz(ev.start_date, ev.time_zone || ev.location.time_zone)
    .toDate();

  const now = new Date();
  return (
    now.getMonth() == start_date.getMonth() &&
    now.getDate() == start_date.getDate()
  );
};

const isInFuture = ev => {
  const match_date = ev.end_date || ev.start_date;
  return new Date(match_date).getTime() > new Date().getTime();
};

const isIn5Days = ev => {
  const match_date = ev.end_date || ev.start_date;
  return moment(match_date).diff(moment(), "days") < 5;
};

const isStaff = ev => {
  return ev.contact.email_address;
};

export default [
  {
    title: "Needs Approval",
    fn: ev => isInFuture(ev) && ev.status == "tentative"
  },
  {
    title: "Upcoming",
    fn: ev => {
      return ev.status == "confirmed" && isInFuture(ev) && !isIn5Days(ev);
    }
  },

  {
    title: "ESM Call",
    fn: ev =>
      isInFuture(ev) &&
      ev.status == "confirmed" &&
      isIn5Days(ev) &&
      !ev.tags.includes("Event: Action: Logisticsed") &&
      !isStaff(ev)
  },

  {
    title: "Ready to Go",
    fn: ev =>
      isInFuture(ev) &&
      ev.status == "confirmed" &&
      isIn5Days(ev) &&
      !isToday(ev) &&
      (ev.tags.includes("Event: Action: Logisticsed") || isStaff(ev))
  },

  {
    title: "Today",
    fn: ev => {
      return ev.status == "confirmed" && isToday(ev);
    }
  },

  {
    title: "Needs Debrief",
    fn: ev => {
      const match_date = ev.end_date || ev.start_date;

      return (
        isInPast(ev) &&
        !isToday(ev) &&
        !ev.tags.includes("Event: Action: Debriefed") &&
        ev.status == "confirmed"
      );
    }
  },

  {
    title: "Past",
    fn: ev => {
      const match_date = ev.end_date || ev.start_date;
      return (
        isInPast(ev) &&
        (ev.tags.includes("Event: Action: Debriefed") ||
          ev.tags.includes("Source: Sync"))
      );
    }
  },

  {
    title: "Rejected",
    fn: ev => ev.status == "rejected"
  },
  {
    title: "Cancelled",
    fn: ev => ev.status == "cancelled"
  },

  {
    title: "Unapproved in the Past",
    fn: ev => ev.status == "tentative" && isInPast(ev)
  }
];
