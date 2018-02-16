export default [
  {
    title: "Uncalled",
    fn: h => !h.status
  },
  {
    title: "Not Interested",
    fn: h => h.status == "not-interested"
  },
  {
    title: "Call back later",
    fn: h => h.status == "call-back-later"
  },
  {
    title: "Success",
    fn: h => h.status == "success"
  }
];
