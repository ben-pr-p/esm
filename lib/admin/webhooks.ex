defmodule Admin.Webhooks do
  require Logger

  def on(hook, body = %{event: event}) do
    processed = process_event(event)

    hook
    |> exec(Map.put(body, :event, processed))
    |> IO.inspect()
  end

  def exec("confirmed", %{event: event, team_member: team_member}) do
    %{"metadata" => %{"event_publish" => hook}} = Cosmic.get("event-webhooks")
    HTTPotion.post(hook, bodify(%{event: event, team_member: team_member}))
  end

  def exec("rejected", %{event: event, reason: reason, team_member: team_member}) do
    %{"metadata" => %{"event_rejected" => hook}} = Cosmic.get("event-webhooks")
    HTTPotion.post(hook, bodify(%{event: event, reason: reason, team_member: team_member}))
  end

  def exec("cancelled", %{event: event, team_member: team_member}) do
    %{"metadata" => %{"event_cancelled" => hook}} = Cosmic.get("event-webhooks")
    HTTPotion.post(hook, bodify(%{event: event, team_member: team_member}))
  end

  def exec("tentative", %{event: event, team_member: team_member}) do
    %{"metadata" => %{"event_unpublished" => hook}} = Cosmic.get("event-webhooks")
    HTTPotion.post(hook, bodify(%{event: event, team_member: team_member}))
  end

  def exec("edit", %{event: event, edits: edits}) do
    %{"metadata" => %{"event_edited" => hook}} = Cosmic.get("event-webhooks")
    HTTPotion.post(hook, bodify(%{event: event, edits: edits}))
  end

  def exec(other, %{event: event, team_member: _team_member}) do
    Logger.info "Untracked status change: #{other}, for event: #{inspect(event)}"
  end

  defp bodify(body), do: [body: Poison.encode!(body)]

  defp process_event(event) do
    event
    |> Map.put(:date_line, get_date_line(event))
  end

  def get_date_line(event) do
    humanize_date(event.start_date, event.location.time_zone) <> "from " <>
    humanize_time(event.start_date, event.location.time_zone) <> " - " <>
    humanize_time(event.end_date, event.location.time_zone)
  end

  defp humanize_date(dt, time_zone) do
    %DateTime{month: month, day: day} = get_zoned_dt(dt, time_zone)

    month = ["January", "February", "March", "April", "May", "June", "July",
             "August", "September", "October", "November", "December"] |> Enum.at(month - 1)

    "#{month}, #{day} "
  end

  defp humanize_time(dt, time_zone) do
    %DateTime{hour: hour, minute: minute} = get_zoned_dt(dt, time_zone)

    {hour, am_pm} = if hour >= 12, do: {hour - 12, "PM"}, else: {hour, "AM"}
    hour = if hour == 0, do: 12, else: hour
    minute = if minute == 0, do: "", else: ":#{minute}"

    "#{hour}#{minute} " <> am_pm
  end

  defp get_zoned_dt(dt, time_zone) do
    dt
    |> Timex.Timezone.convert(time_zone |> Timex.Timezone.get(Timex.now()))
  end

end
