defmodule Admin.Webhooks do
  require Logger
  import ShortMaps

  @cosmic_config_slug Application.get_env(:admin, :cosmic_info_slug)

  def on(hook, body = %{event: event}) do
    processed = process_event(event)

    hook
    |> exec(Map.put(body, :event, processed))
  end

  def exec("confirmed", %{event: event, team_member: team_member}) do
    %{"metadata" => %{"event_publish" => hook}} = Cosmic.get(@cosmic_config_slug)
    IO.puts("Posting webhook to #{hook} because of confirmed")
    IO.inspect(HTTPotion.post(hook, bodify(%{event: event, team_member: team_member})))
  end

  def exec("rejected", %{event: event, reason: reason, team_member: team_member}) do
    %{"metadata" => %{"event_rejected" => hook}} = Cosmic.get(@cosmic_config_slug)
    IO.puts("Posting webhook to #{hook} because of rejected")

    IO.inspect(
      HTTPotion.post(hook, bodify(%{event: event, reason: reason, team_member: team_member}))
    )
  end

  def exec("cancelled", %{event: event, team_member: team_member, reason: reason}) do
    %{"metadata" => %{"event_cancelled" => hook}} = Cosmic.get(@cosmic_config_slug)
    IO.puts("Posting webhook to #{hook} because of cancelled")

    IO.inspect(
      HTTPotion.post(hook, bodify(%{event: event, team_member: team_member, reason: reason}))
    )
  end

  def exec("tentative", %{event: event, team_member: team_member}) do
    %{"metadata" => %{"event_unpublished" => hook}} = Cosmic.get(@cosmic_config_slug)
    IO.puts("Posting webhook to #{hook} because of tentative")
    IO.inspect(HTTPotion.post(hook, bodify(%{event: event, team_member: team_member})))
  end

  def exec("edit", %{event: event, edits: edits}) do
    %{"metadata" => %{"event_edited" => hook}} = Cosmic.get(@cosmic_config_slug)
    IO.puts("Posting webhook to #{hook} because of edit")
    IO.inspect(HTTPotion.post(hook, bodify(%{event: event, edits: edits})))
  end

  def exec("message-host", ~m(event host message)a) do
    %{"metadata" => %{"message_host" => hook}} = Cosmic.get(@cosmic_config_slug)
    IO.puts("Posting webhook to #{hook} because of message-host")
    IO.inspect(HTTPotion.post(hook, bodify(~m(event host message))))
  end

  def exec("message-attendees", ~m(event attendee_emails message)a) do
    %{"metadata" => %{"message_attendees" => hook}} = Cosmic.get(@cosmic_config_slug)
    IO.puts("Posting webhook to #{hook} because of message-attendees")
    IO.inspect(HTTPotion.post(hook, bodify(~m(event attendee_emails message))))
  end

  def exec(other, %{event: event, team_member: _team_member}) do
    Logger.info("Untracked status change: #{other}, for event: #{inspect(event)}")
  end

  defp bodify(body), do: [body: Poison.encode!(IO.inspect(body))]

  defp process_event(event) do
    event
    |> Map.put(:date_line, get_date_line(event))
  end

  def get_date_line(event) do
    humanize_date(event.start_date) <>
      "from " <> humanize_time(event.start_date) <> " - " <> humanize_time(event.end_date)
  end

  defp humanize_date(dt) do
    %DateTime{month: month, day: day} = parse(dt)

    month =
      [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
      ]
      |> Enum.at(month - 1)

    "#{month} #{day} "
  end

  defp humanize_time(dt) do
    %DateTime{hour: hour, minute: minute} = parse(dt)

    {hour, am_pm} = if hour >= 12, do: {hour - 12, "PM"}, else: {hour, "AM"}
    hour = if hour == 0, do: 12, else: hour
    minute = if minute == 0, do: "", else: ":#{minute}"

    "#{hour}#{minute} " <> am_pm
  end

  def parse(nil) do
    DateTime.utc_now()
  end

  def zero_pad(int) do
    str = "#{int}"
    if String.length(str), do: str, else: "0#{str}"
  end

  def parse(dt = %DateTime{}) do
    dt
  end

  def parse(dt) do
    iso = if String.ends_with?(dt, "Z"), do: dt, else: dt <> "Z"
    {:ok, result, _} = DateTime.from_iso8601(iso)
    result
  end
end
