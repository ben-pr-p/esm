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

export default [
  {
    title: "ESM Call #1",
    fn: ev =>
      isInFuture(ev) &&
      ev.tags.includes(ESM_TAG) &&
      ev.status == "tentative" &&
      !ev.tags.includes("Event: Action: Called")
  },
  {
    title: "Needs Approval",
    fn: ev =>
      isInFuture(ev) &&
      ev.status == "tentative" &&
      (!ev.tags.includes(ESM_TAG) || ev.tags.includes("Event: Action: Called"))
  },
  {
    title: "Needs Logistics",
    fn: ev =>
      isInFuture(ev) &&
      ev.tags.includes(ESM_TAG) &&
      ev.status == "confirmed" &&
      !ev.tags.includes("Event: Action: Logisticsed")
  },
  {
    title: "Upcoming",
    fn: ev => {
      return (
        ev.status == "confirmed" &&
        isInFuture(ev) &&
        !isToday(ev) &&
        (!ev.tags.includes(ESM_TAG) ||
          ev.tags.includes("Event: Action: Logisticsed"))
      );
    }
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
        ev.status == "confirmed" &&
        isInPast(ev) &&
        !isToday(ev) &&
        !ev.tags.includes("Event: Action: Debriefed") &&
        !ev.tags.includes("Source: Sync")
      );
    }
  },
  {
    title: "Past",
    fn: ev => {
      const match_date = ev.end_date || ev.start_date;
      return isInPast(ev) && ev.tags.includes("Event: Action: Debriefed");
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
