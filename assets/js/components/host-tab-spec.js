export default [
  {
    title: "In Progress",
    fn: h => h.status == "in_progress"
  },
  {
    title: "Awaiting Creation by Tool",
    fn: h => h.status == "awaiting_creation"
  },
  {
    title: "Failed",
    fn: h => h.status == "failed"
  }
];
