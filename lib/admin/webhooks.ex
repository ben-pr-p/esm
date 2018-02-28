defmodule Admin.Webhooks do
  require Logger
  import ShortMaps

  @instance Application.get_env(:admin, :instance, "jd")
  @cosmic_config_slug Application.get_env(:admin, :cosmic_info_slug)

  def on(hook, body = %{event: event}) do
    processed = process_event(event)

    hook
    |> exec(Map.put(body, :event, processed))
  end

  def exec("confirmed", contents = %{event: event, team_member: team_member}) do
    if @instance != "jd" do
      %{"metadata" => %{"event_publish" => hook}} = Cosmic.get(@cosmic_config_slug)
      IO.puts("Posting webhook to #{hook} because of confirmed")
      IO.inspect(HTTPotion.post(hook, bodify(%{event: event, team_member: team_member})))
    else
      if Enum.member?(event["tags"], "Source: Direct Publish") do
        IO.puts("Not sending published webhook because this is a direct publish event")
      else
        %{"metadata" => %{"vol_event_submission" => hook}} = Cosmic.get(@cosmic_config_slug)
        IO.puts("Posting webhook to #{hook} because of confirmed vol event")
        IO.inspect(HTTPotion.post(hook, bodify(%{event: event, team_member: team_member})))
      end

      email = event.contact.email_address

      info =
        flatten(contents)
        |> Enum.map(fn {key, val} ->
          {"action_#{key}", val}
        end)
        |> Enum.into(~m(email))

      IO.inspect(
        Ak.Signup.process_signup(&String.contains?(&1["title"], "ESM: Event Published"), info)
      )
    end
  end

  def exec("rejected", contents = %{event: event, reason: reason, team_member: team_member}) do
    if @instance != "jd" do
      %{"metadata" => %{"event_rejected" => hook}} = Cosmic.get(@cosmic_config_slug)
      IO.puts("Posting webhook to #{hook} because of rejected")

      IO.inspect(
        HTTPotion.post(hook, bodify(%{event: event, reason: reason, team_member: team_member}))
      )
    else
      spawn(fn -> send_not_live(event) end)
      email = event.contact.email_address

      info =
        flatten(contents)
        |> Enum.map(fn {key, val} ->
          {"action_#{key}", val}
        end)
        |> Enum.into(~m(email))

      IO.inspect(
        Ak.Signup.process_signup(&String.contains?(&1["title"], "ESM: Event Rejected"), info)
      )
    end
  end

  def exec("cancelled", contents = %{event: event, team_member: team_member, reason: reason}) do
    if @instance != "jd" do
      %{"metadata" => %{"event_cancelled" => hook}} = Cosmic.get(@cosmic_config_slug)
      IO.puts("Posting webhook to #{hook} because of cancelled")

      IO.inspect(
        HTTPotion.post(hook, bodify(%{event: event, team_member: team_member, reason: reason}))
      )
    else
      spawn(fn -> send_not_live(event) end)
      email = event.contact.email_address

      info =
        flatten(contents)
        |> Enum.map(fn {key, val} ->
          {"action_#{key}", val}
        end)
        |> Enum.into(~m(email))

      IO.inspect(
        Ak.Signup.process_signup(&String.contains?(&1["title"], "ESM: Event Cancelled"), info)
      )
    end
  end

  def exec("tentative", contents = %{event: event, team_member: team_member}) do
    if @instance != "jd" do
      %{"metadata" => %{"event_unpublished" => hook}} = Cosmic.get(@cosmic_config_slug)
      IO.puts("Posting webhook to #{hook} because of tentative")
      IO.inspect(HTTPotion.post(hook, bodify(%{event: event, team_member: team_member})))
    else
      spawn(fn -> send_not_live(event) end)
      email = event.contact.email_address

      info =
        flatten(contents)
        |> Enum.map(fn {key, val} ->
          {"action_#{key}", val}
        end)
        |> Enum.into(~m(email))

      IO.inspect(
        Ak.Signup.process_signup(&String.contains?(&1["title"], "ESM: Event Unpublished"), info)
      )
    end
  end

  def exec("edit", %{event: event, edits: edits}) do
    %{"metadata" => %{"event_edited" => hook}} = Cosmic.get(@cosmic_config_slug)
    IO.puts("Posting webhook to #{hook} because of edit")
    IO.inspect(HTTPotion.post(hook, bodify(%{event: event, edits: edits})))
  end

  def exec("message_host", contents = ~m(event host message)a) do
    if @instance != "jd" do
      %{"metadata" => %{"message_host" => hook}} = Cosmic.get(@cosmic_config_slug)
      IO.puts("Posting webhook to #{hook} because of message-host")
      IO.inspect(HTTPotion.post(hook, bodify(~m(event host message))))
    else
      email = event.contact.email_address

      info =
        flatten(contents)
        |> Enum.map(fn {key, val} ->
          {"action_#{key}", val}
        end)
        |> Enum.into(~m(email))

      IO.inspect(
        Ak.Signup.process_signup(&String.contains?(&1["title"], "ESM: Event Message Host"), info)
      )
    end
  end

  def exec(hook_type = "message_attendees" <> _rest, ~m(event attendee_emails message)a) do
    hook = Cosmic.get(@cosmic_config_slug) |> get_in(["metadata", hook_type])
    IO.puts("Posting webhook to #{hook} because of #{hook_type}")
    IO.inspect(HTTPotion.post(hook, bodify(~m(event attendee_emails message))))
  end

  def exec(
        hook_type = "turnout_request_edit" <> _rest,
        ~m(event old_survey new_survey changes candidate)a
      ) do
    hook = Cosmic.get(@cosmic_config_slug) |> get_in(["metadata", hook_type])
    IO.puts("Posting webhook to #{hook} because of #{hook_type}")
    IO.inspect(HTTPotion.post(hook, bodify(~m(event old_survey new_survey changes candidate))))
  end

  def exec(hook_type = "duplicate", ~m(event)a) do
    hook = Cosmic.get(@cosmic_config_slug) |> get_in(["metadata", "event_duplicated"])

    if hook != nil do
      IO.puts("Posting webhook to #{hook} because of #{hook_type}")
      IO.inspect(HTTPotion.post(hook, bodify(~m(event))))
    end
  end

  def exec(other, %{event: event, team_member: _team_member}) do
    Logger.info("Untracked status change: #{other}, for event: #{inspect(event)}")
  end

  def send_not_live(event) do
    hook = Cosmic.get(@cosmic_config_slug) |> get_in(["metadata", "event_made_not_live"])
    IO.puts("Posting webhook to #{hook} because of event_made_not_live")
    IO.inspect(HTTPotion.post(hook, bodify(~m(event))))
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
    {:ok, result, _} = DateTime.from_iso8601(dt)
    result
  end

  def flatten(%{} = map) do
    map
    |> Map.drop(~w(name))
    |> Map.to_list()
    |> to_flat_map(%{})
  end

  def flatten(%{} = map) when map == %{}, do: %{}

  defp to_flat_map([{_k, %{} = v} | t], acc), do: to_flat_map(Map.to_list(v), to_flat_map(t, acc))
  defp to_flat_map([{k, v} | t], acc), do: to_flat_map(t, Map.put_new(acc, k, v))
  defp to_flat_map([], acc), do: acc
end
