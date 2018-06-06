defmodule Admin.EventsChannel do
  use Admin, :channel
  alias Admin.{Webhooks}
  alias Phoenix.Socket.Broadcast
  use Guardian.Channel
  alias Admin.{CheckoutAgent}
  import Guardian.Phoenix.Socket
  import ShortMaps

  @attrs ~w(
    id start_date end_date featured_image_url location summary title name
    type status description contact type tags instructions attendances
    rsvp_download_url browser_url organizer_edit_url
  )a

  @instance Application.get_env(:admin, :instance, "jd")
  def deployed_url, do: Application.get_env(:admin, :deployed_url, "localhost:4000")

  intercept(["event", "events"])

  def join("events", %{"candidate_token" => token}, socket) do
    case token |> URI.encode_www_form() |> MyCipher.decrypt() do
      {:error, message} -> {:error, message}
      candidate_tag -> {:ok, assign(socket, :candidate_tag, candidate_tag)}
    end
  end

  def join("events", %{"organizer_token" => token}, socket) do
    case token |> URI.encode_www_form() |> MyCipher.decrypt() do
      {:error, message} -> {:error, message}
      organizer_id -> {:ok, assign(socket, :organizer_id, organizer_id)}
    end
  end

  def join("events", _payload, socket) do
    {:ok, socket}
  end

  # Starting sending events
  def handle_in("ready", %{"page" => "esm"}, socket) do
    send_esm_events(socket)
    {:noreply, socket}
  end

  def handle_in("ready", %{"page" => "list"}, socket) do
    send_list_events(socket)
    {:noreply, socket}
  end

  def handle_in("ready", %{"page" => "my-events"}, socket) do
    send_my_events(socket)
    {:noreply, socket}
  end

  def handle_in("ready", %{"page" => "candidate-events"}, socket) do
    send_candidate_events(socket)
    {:noreply, socket}
  end

  # Relay checking out
  def handle_in("checkout-" <> id, _, socket) do
    actor = current_resource(socket)
    CheckoutAgent.register(id, actor)
    broadcast(socket, "checkout", %{id: id, actor: actor})
    {:noreply, socket}
  end

  # Relay checking in
  def handle_in("checkin-" <> id, _, socket) do
    CheckoutAgent.free(id)
    broadcast(socket, "checkin", %{id: id})
    {:noreply, socket}
  end

  # Handle two attribute edit
  def handle_in("edit-" <> id, [["start_date", start_date], ["end_date", end_date]], socket) do
    edits = Map.new([{"start_date", start_date}, {"end_date", end_date}])
    insert_edit(%{event_id: id, edit: edits, actor: current_resource(socket)})

    new_event = apply_edit(id, edits)

    Webhooks.on("important_change", %{
      event: event_pipeline(new_event),
      attendee_emails: Rsvps.emails_for(id) |> Enum.join(";")
    })

    push(socket, "event", %{id: id, event: new_event})
    broadcast(socket, "event", %{id: id, event: new_event})
    {:noreply, socket}
  end

  # Implement simple edit, contact edit (embeded), or location edit (associative)
  def handle_in("edit-" <> id, [key, value], socket) do
    new_event =
      case key do
        "location." <> _rest -> apply_location_edit(id, [key, value])
        "contact." <> _rest -> apply_contact_edit(id, [key, value])
        _ -> apply_edit(id, [key, value])
      end

    insert_edit(%{event_id: id, edit: Map.new([{key, value}]), actor: current_resource(socket)})

    push(socket, "event", %{id: id, event: new_event})
    broadcast(socket, "event", %{id: id, event: new_event})
    {:noreply, socket}
  end

  # Implement standard tags change
  def handle_in("tags-" <> id, tags, socket) do
    insert_edit(%{event_id: id, edit: Map.new([{"tags", tags}]), actor: current_resource(socket)})

    event = EventMirror.one(id)
    calendar_tags = Enum.filter(event.tags, &String.contains?(&1, "Calendar: "))

    new_tags = Enum.concat(tags, calendar_tags)
    new_event = edit_tags_and_fetch(id, new_tags)

    push(socket, "event", %{id: id, event: new_event})
    broadcast(socket, "event", %{id: id, event: new_event})
    {:noreply, socket}
  end

  def handle_in("calendars-" <> id, calendars, socket) do
    insert_edit(%{
      event_id: id,
      edit: Map.new([{"calendars", calendars}]),
      actor: current_resource(socket)
    })

    event = EventMirror.one(id)

    as_tags = Enum.map(calendars, &"Calendar: #{&1}")
    regular_tags = Enum.reject(event.tags, &String.contains?(&1, "Calendar: "))

    new_tags = Enum.concat(regular_tags, as_tags)
    new_event = edit_tags_and_fetch(id, new_tags)

    push(socket, "event", %{id: id, event: new_event})
    broadcast(socket, "event", %{id: id, event: new_event})
    {:noreply, socket}
  end

  # Handle status changes
  def handle_in("action-" <> id, payload = %{"status" => status}, socket) do
    if status == "cancelled" do
      do_message_attendees("message_attendees_cancelled", id, payload["message"])
    end

    insert_edit(%{event_id: id, edit: %{"status" => status}, actor: current_resource(socket)})
    new_event = set_status(id, status)

    Webhooks.on(status, %{
      event: new_event,
      team_member: current_resource(socket),
      reason: payload["message"]
    })

    push(socket, "event", %{id: id, event: new_event})
    broadcast(socket, "event", %{id: id, event: new_event})
    {:noreply, socket}
  end

  # Handle action registers
  def handle_in("action-" <> id, %{"action" => action}, socket) do
    insert_edit(%{event_id: id, edit: %{"action" => action}, actor: current_resource(socket)})
    new_event = mark_action(id, action)
    push(socket, "event", %{id: id, event: new_event})
    broadcast(socket, "event", %{id: id, event: new_event})
    {:noreply, socket}
  end

  def handle_in("duplicate-" <> id, overrides, socket) do
    {old, new} = duplicate(id, overrides)
    push(socket, "event", %{id: id, event: old})
    push(socket, "event", %{id: new.id, event: new})
    broadcast(socket, "event", %{id: new.id, event: new})
    {:noreply, socket}
  end

  def handle_in("message-host-" <> id, %{"message" => message}, socket) do
    event = EventMirror.one(id)

    Webhooks.on("message_host", %{
      event: event_pipeline(event),
      host: event.contact.email_address,
      message: message
    })

    {:noreply, socket}
  end

  def handle_in("message-attendees-" <> id, %{"message" => message}, socket) do
    hook_type =
      case socket.assigns do
        %{organizer_id: _} -> "message_attendees_from_host"
        _ -> "message_attendees_from_staff"
      end

    do_message_attendees(hook_type, id, message)
    {:noreply, socket}
  end

  def handle_in("call-logs-for-" <> id, _payload, socket) do
    calls = Admin.CallLogs.get_for(id)
    push(socket, "call-logs", ~m(calls id))
    {:noreply, socket}
  end

  def handle_in("add-call-log-" <> event_id, ~m(note), socket) do
    actor = current_resource(socket)
    Admin.CallLogs.add_to(~m(actor event_id note))
    calls = Admin.CallLogs.get_for(event_id)
    push(socket, "call-logs", Map.merge(~m(calls), %{"id" => event_id}))
    {:noreply, socket}
  end

  def handle_in("edit-logs-for-" <> event_id, _payload, socket) do
    edits = Admin.EditLogs.get_for(event_id)
    push(socket, "edit-logs", Map.merge(~m(edits), %{"id" => event_id}))
    {:noreply, socket}
  end

  def handle_in("turnout-survey-for-" <> id, _payload, socket) do
    survey = Turnout.survey_for_event(id)
    push(socket, "turnout-survey", ~m(survey id) |> IO.inspect())
    {:noreply, socket}
  end

  def handle_in("edit-turnout-survey-for-" <> id, changes, socket) do
    survey = Turnout.edit_survey_for_event(id, changes)
    push(socket, "turnout-survey", ~m(survey id))
    {:noreply, socket}
  end

  def do_message_attendees(hook_type, event_id, message) do
    event = EventMirror.one(event_id)
    attendee_emails = Rsvps.emails_for(event_id)

    Webhooks.on(hook_type, %{
      event: event_pipeline(event),
      attendee_emails: Enum.join(attendee_emails, ";"),
      message: message
    })
  end

  defp send_esm_events(socket) do
    all_events =
      EventMirror.all()
      |> Enum.map(&event_pipeline/1)
      |> Enum.map(fn event ->
        %{id: event.id, event: event}
      end)

    broadcast(socket, "events", %{all_events: all_events})
  end

  defp send_potential_hosts(socket) do
    IO.puts("doing it first")
    potential_hosts = PotentialHosts.get_potential_hosts()
    IO.puts("doing it second")
    broadcast(socket, "potential-hosts", %{potential_hosts: potential_hosts})
  end

  defp send_list_events(socket) do
    all_events =
      EventMirror.all()
      |> Enum.map(&event_pipeline/1)
      |> Enum.map(fn event = %{id: id} ->
        %{id: event.id, event: event}
      end)

    broadcast(socket, "events", %{all_events: all_events})
  end

  defp send_my_events(socket = %{assigns: %{organizer_id: organizer_id}}) do
    EventMirror.all()
    |> Enum.filter(&(&1.organizer_id == organizer_id))
    |> Enum.filter(&(&1.status != "cancelled" and &1.status != "rejected"))
    |> Enum.map(&event_pipeline/1)
    |> Enum.each(fn event ->
      push(socket, "event", %{id: event.id, event: event})
    end)
  end

  defp send_candidate_events(socket = %{assigns: %{candidate_tag: candidate_tag}}) do
    EventMirror.all()
    |> Enum.filter(&Enum.member?(&1.tags || [], candidate_tag))
    |> Enum.filter(&(&1.status != "cancelled" and &1.status != "rejected"))
    |> Enum.map(&event_pipeline/1)
    |> Enum.each(fn event ->
      push(socket, "event", %{id: event.id, event: event})
    end)
  end

  def event_pipeline(event) do
    event
    |> add_rsvp_download_url()
    |> add_organizer_edit_url()
    |> add_candidate_events_url()
  end

  defp to_map(event = %{tags: tags}) do
    event
    |> Map.from_struct()
    |> Map.take(@attrs)
    |> Map.put(:tags, tags |> Enum.map(& &1.name))
  end

  defp add_rsvp_download_url(event) do
    encrypted_id = Cipher.encrypt("#{event.id}")

    Map.put(event, :rsvp_download_url, "#{deployed_url()}/rsvps/#{encrypted_id}")
  end

  defp add_organizer_edit_url(event) do
    organizer_edit_hash = Cipher.encrypt("#{event.organizer_id}")

    Map.put(event, :organizer_edit_url, "#{deployed_url()}/my-events/#{organizer_edit_hash}")
  end

  defp add_candidate_events_url(event) do
    candidate_tag =
      Enum.filter(event.tags, fn
        "Calendar: " <> cand -> cand != "Brand New Congress" and cand != "Justice Democrats"
        _ -> false
      end)
      |> List.first()

    if candidate_tag do
      hash = Cipher.encrypt(candidate_tag)
      Map.put(event, :candidate_events_url, "#{deployed_url()}/candidate-events/#{hash}")
    else
      event
    end
  end

  defp apply_edit(id, [key, value]) do
    change = Map.put(%{}, key, value)
    event = EventMirror.edit(id, change)
    event_pipeline(event)
  end

  defp apply_edit(id, change) when is_map(change) do
    event = EventMirror.edit(id, change)
    event_pipeline(event)
  end

  defp apply_contact_edit(id, [raw_key, value]) do
    "contact." <> key = raw_key
    contact_change = Map.put(%{}, key, value)
    event = EventMirror.edit(id, %{contact: contact_change})
    event_pipeline(event)
  end

  defp apply_location_edit(id, [raw_key, raw_value]) do
    {key, value} =
      case raw_key do
        "location.address_lines[0]" -> {:address_lines, [raw_value]}
        "location." <> key -> {key, raw_value}
      end

    location_change = Map.put(%{}, key, value)
    event = EventMirror.edit(id, %{location: location_change})
    post_pipeline = event_pipeline(event)

    Webhooks.on("important_change", %{
      event: post_pipeline,
      attendee_emails: Rsvps.emails_for(id) |> Enum.join(";")
    })

    post_pipeline
  end

  def edit_tags_and_fetch(id, tags) do
    event = EventMirror.edit(id, %{tags: tags})
    event_pipeline(event)
  end

  defp set_status(id, status) do
    event = EventMirror.edit(id, %{status: status})

    if status == "cancelled" do
      OsdiClient.delete(client(), "events/#{id}")
    end

    event_pipeline(event)
  end

  defp mark_action(id, action) do
    %{tags: current_tags} = EventMirror.one(id)
    tag = "Event: Action: #{String.capitalize(action)}"
    new_tags = Enum.concat(current_tags, [tag])
    event = EventMirror.edit(id, %{tags: new_tags})
    event_pipeline(event)
  end

  defp duplicate(id, overrides) do
    old = EventMirror.one(id)

    to_create =
      Enum.reduce(old, %{}, fn {key, val}, acc ->
        Map.put(acc, key, Map.get(overrides, Atom.to_string(key), val))
      end)
      |> Map.put(:status, "tentative")
      |> Map.put(:tags, Enum.reject(old.tags, &String.contains?(&1, "Action:")))
      |> Map.drop([:identifiers, :id])

    %{body: new} = OsdiClient.post(client(), "events", to_create)
    Webhooks.on("duplicate", %{event: new})
    {new, old}
  end

  defp insert_edit(%{event_id: event_id, edit: edit, actor: actor}) do
    Mongo.insert_one(:mongo, "esm_actions_#{@instance}", %{
      event_id: event_id,
      edit: edit,
      actor: actor,
      edited_at: Timex.now()
    })

    case edit do
      %{"status" => _} -> nil
      %{"tags" => _} -> nil
      %{"calendar" => _} -> nil
      %{"action" => _} -> nil
      _ -> Admin.EditAgent.record_edit(event_id)
    end
  end

  # ----------
  # -- Special section – makes it so that people in organizer edit view
  # -- only get updates for their events
  # ----------

  # Match someone in organizer edit view
  def handle_out(
        "event",
        payload = %{event: event},
        socket = %{assigns: %{organizer_id: organizer_id}}
      ) do
    if event.organizer_id == organizer_id do
      push(socket, "event", payload)
    end

    {:noreply, socket}
  end

  def handle_out(
        "event",
        payload = %{event: event},
        socket = %{assigns: %{candidate_tag: candidate_tag}}
      ) do
    if (event.tags || []) |> Enum.member?(candidate_tag) do
      push(socket, "event", payload)
    end

    {:noreply, socket}
  end

  # Match a regular logged in user
  def handle_out("event", payload, socket) do
    push(socket, "event", payload)
    {:noreply, socket}
  end

  def handle_out("event", _payload, socket = %{assigns: %{organizer_id: organizer_id}}) do
    {:noreply, socket}
  end

  # Match a regular logged in user
  def handle_out("events", payload, socket) do
    push(socket, "events", payload)
    {:noreply, socket}
  end

  def client,
    do:
      OsdiClient.build_client(
        Application.get_env(:admin, :osdi_base_url),
        Application.get_env(:admin, :osdi_api_token)
      )
end
