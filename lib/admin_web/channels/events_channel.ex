defmodule Admin.EventsChannel do
  use Admin, :channel
  alias Admin.{Webhooks}
  alias Phoenix.Socket.Broadcast
  use Guardian.Channel
  alias Admin.{CheckoutAgent}
  import Guardian.Phoenix.Socket

  @attrs ~w(
    id start_date end_date featured_image_url location summary title name
    type status description contact type tags instructions attendances
    rsvp_download_url browser_url organizer_edit_url
  )a

  @instance Application.get_env(:admin, :instance, "jd")
  @deployed_url Application.get_env(:admin, :deployed_url, "localhost:4000")

  intercept(["event", "events"])

  def join("events", %{"organizer_token" => token}, socket) do
    case token |> URI.encode_www_form() |> Cipher.decrypt() do
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

    %{body: event} = Proxy.get("events/#{id}")
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

    %{body: event} = Proxy.get("events/#{id}")

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
      do_message_attendees("message-attendees-cancelled", id, payload["message"])
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

  def handle_in("duplicate-" <> id, _payload, socket) do
    new_event = %{id: new_id} = duplicate(id)
    push(socket, "event", %{id: new_id, event: new_event})
    broadcast(socket, "event", %{id: new_id, event: new_event})
    {:noreply, socket}
  end

  def handle_in("message-host-" <> id, %{"message" => message}, socket) do
    %{body: event} = Proxy.get("events/#{id}")

    Webhooks.on("message-host", %{
      event: event_pipeline(event),
      host: event.contact.email_address,
      message: message
    })

    {:noreply, socket}
  end

  def handle_in("message-attendees-" <> id, %{"message" => message}, socket) do
    do_message_attendees("message-attendees", id, message)
    {:noreply, socket}
  end

  def do_message_attendees(hook_type, event_id, message) do
    [%{body: event}, attendee_emails] =
      [
        Task.async(fn -> Proxy.get("events/#{event_id}") end),
        Task.async(fn -> Rsvps.emails_for(event_id) end)
      ]
      |> Enum.map(fn t -> Task.await(t, :infinity) end)

    Webhooks.on(hook_type, %{
      event: event_pipeline(event),
      attendee_emails: Enum.join(attendee_emails, ";"),
      message: message
    })
  end

  defp send_esm_events(socket) do
    all_events =
      Proxy.stream("events")
      |> Enum.map(&event_pipeline/1)
      |> Enum.map(fn event ->
           id = event.identifiers |> List.first() |> String.split(":") |> List.last()
           %{id: id, event: event}
         end)

    broadcast(socket, "events", %{all_events: all_events})
  end

  defp send_list_events(socket) do
    all_events =
      Proxy.stream("events")
      |> Enum.filter(&(&1.status == "confirmed" and &1.end_date > DateTime.utc_now()))
      |> Enum.map(&event_pipeline/1)
      |> Enum.map(fn event = %{id: id} ->
           %{id: event.id, event: event}
         end)

    broadcast(socket, "events", %{all_events: all_events})
  end

  defp send_my_events(socket = %{assigns: %{organizer_id: organizer_id}}) do
    Proxy.stream("events")
    |> Flow.from_enumerable()
    |> Flow.filter(&(&1.organizer_id == organizer_id))
    |> Flow.filter(&(&1.status != "cancelled" and &1.status != "rejected"))
    |> Flow.map(&event_pipeline/1)
    |> Flow.each(fn event ->
         id = event.identifiers |> List.first() |> String.split(":") |> List.last()
         push(socket, "event", %{id: id, event: event})
       end)
    |> Flow.run()
  end

  def event_pipeline(event) do
    event
    |> add_rsvp_download_url()
    |> add_organizer_edit_url()
  end

  defp to_map(event = %{tags: tags}) do
    event
    |> Map.from_struct()
    |> Map.take(@attrs)
    |> Map.put(:tags, tags |> Enum.map(& &1.name))
  end

  defp add_rsvp_download_url(event) do
    id = event.identifiers |> List.first() |> String.split(":") |> List.last()
    encrypted_id = Cipher.encrypt(id)

    Map.put(event, :rsvp_download_url, "#{@deployed_url}/rsvps/#{encrypted_id}")
  end

  defp add_organizer_edit_url(event) do
    organizer_edit_hash = Cipher.encrypt("#{event.organizer_id}")

    Map.put(event, :organizer_edit_url, "#{@deployed_url}/my-events/#{organizer_edit_hash}")
  end

  defp apply_edit(id, [key, value]) do
    change = Map.put(%{}, key, value)
    Proxy.post("events/#{id}", body: change)
    %{body: event} = Proxy.get("events/#{id}")
    event_pipeline(event)
  end

  defp apply_edit(id, change) when is_map(change) do
    Proxy.post("events/#{id}", body: change)
    %{body: event} = Proxy.get("events/#{id}")
    event_pipeline(event)
  end

  defp apply_contact_edit(id, [raw_key, value]) do
    "contact." <> key = raw_key
    contact_change = Map.put(%{}, key, value)
    Proxy.post("events/#{id}", body: %{contact: contact_change})
    %{body: event} = Proxy.get("events/#{id}")
    event_pipeline(event)
  end

  defp apply_location_edit(id, [raw_key, raw_value]) do
    {key, value} =
      case raw_key do
        "location.address_lines[0]" -> {:address_lines, [raw_value]}
        "location." <> key -> {key, raw_value}
      end

    location_change = Map.put(%{}, key, value)
    Proxy.post("events/#{id}", body: %{location: location_change})
    %{body: event} = Proxy.get("events/#{id}")
    event_pipeline(event)
  end

  def edit_tags_and_fetch(id, tags) do
    Proxy.post("events/#{id}", body: %{tags: tags})
    %{body: event} = Proxy.get("events/#{id}")
    event_pipeline(event)
  end

  defp set_status(id, status) do
    Proxy.post("events/#{id}", body: %{status: status})
    %{body: event} = Proxy.get("events/#{id}")
    event_pipeline(event)
  end

  defp mark_action(id, action) do
    %{body: %{tags: current_tags}} = Proxy.get("events/#{id}")
    tag = "Event: Action: #{String.capitalize(action)}"
    new_tags = Enum.concat(current_tags, [tag])
    Proxy.post("events/#{id}", body: %{tags: new_tags})
    %{body: event} = Proxy.get("events/#{id}")
    event_pipeline(event)
  end

  defp duplicate(id) do
    %{body: old} = Proxy.get("events/#{id}")

    to_create =
      old
      |> Map.put(:start_date, Timex.now() |> Timex.shift(days: 7))
      |> Map.put(:end_date, Timex.now() |> Timex.shift(days: 7))
      |> Map.put(:status, "tentative")
      |> Map.drop([:identifiers])

    %{body: new} = Proxy.post("events", body: to_create)
    new
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
end
