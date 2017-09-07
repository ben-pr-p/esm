defmodule Admin.EventsChannel do
  use Admin, :channel
  alias Osdi.{Repo, Event}
  import Ecto.Query

  def join("events", payload, socket) do
    if authorized?(payload) do
      {:ok, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  # Starting sending events
  def handle_in("ready", _payload, socket) do
    send_events(socket)
    {:noreply, socket}
  end

  # Implement simple edit, host edit (embeded), or location edit (associative)
  def handle_in("edit-" <> id, [key, value], socket) do
    new_event =
      case key do
        "location." <> _rest -> apply_location_edit(id, [key, value])
        "host." <> _rest -> apply_host_edit(id, [key, value])
        _ -> apply_edit(id, [key, value])
      end

    push socket, "event", %{id: id, event: new_event}
    broadcast socket, "event", %{id: id, event: new_event}
    {:noreply, socket}
  end

  # Handle status changes
  def handle_in("action-" <> id, %{"status" => status}, socket) do
    new_event = set_status(id, status)
    push socket, "event", %{id: id, event: new_event}
    broadcast socket, "event", %{id: id, event: new_event}
    {:noreply, socket}
  end

  # Handle action registers
  def handle_in("action-" <> id, %{"action" => action}, socket) do
    new_event = mark_action(id, action)
    push socket, "event", %{id: id, event: new_event}
    broadcast socket, "event", %{id: id, event: new_event}
    {:noreply, socket}
  end

  def handle_in("duplicate-" <> id, _payload, socket) do
    new_event = %{id: new_id} = duplicate(id)
    push socket, "event", %{id: new_id, event: new_event}
    broadcast socket, "event", %{id: new_id, event: new_event}
    {:noreply, socket}
  end

  # Add authorization logic here as required.
  defp authorized?(_payload) do
    true
  end

  defp send_events(socket) do
    (from e in Event,
      preload: [
        :tags,
        :location,
        organizer: [:email_addresses, :phone_numbers]])
    |> Repo.all()
    |> Enum.map(&to_map/1)
    |> Enum.each(fn event ->
         push socket, "event", %{id: event.id, event: event}
       end)
  end

  defp to_map(event = %Event{tags: tags}) do
    event
    |> Map.from_struct()
    |> Map.take(~w(id start_date end_date featured_image_url location summary title name type status description host)a)
    |> Map.put(:tags, tags |> Enum.map(&(&1.name)))
  end

  defp apply_edit(id, [key, value]) do
    set_list = %{} |> Map.put(key |> String.to_atom(), value) |> Enum.into([])

    (from e in Event, where: e.id == ^id)
    |> Repo.update_all(set: set_list)

    (from e in Event,
      where: e.id == ^id,
      preload: [
        :tags,
        :location,
        organizer: [:email_addresses, :phone_numbers]])
    |> Repo.one()
    |> for_web()
  end

  defp apply_host_edit(id, [raw_key, value]) do
    event = %{host: host} = Event |> Repo.get(id)

    "host." <> key = raw_key
    key = String.to_atom key
    host_change = %{} |> Map.put(key, value)

    host_changeset = Ecto.Changeset.change(host, host_change)

    event
    |> Ecto.Changeset.change()
    |> Ecto.Changeset.put_embed(:host, host_changeset)
    |> Repo.update!()
    |> Repo.preload([:tags, :location, organizer: [:phone_numbers, :email_addresses]])
    |> for_web()
  end

  defp apply_location_edit(id, [raw_key, raw_value]) do
    event = %{location: location} =
      Event
      |> Repo.get(id)
      |> Repo.preload(:location)

    process = if raw_key == "location.address_lines[0]" do
        fn {_key, val} -> {:address_lines, [val]} end
      else
        fn {"location." <> key, val} -> {key |> String.to_atom(), val} end
      end

    {key, value} = process.({raw_key, raw_value})

    new_location =
      location
      |> Map.from_struct()
      |> Map.drop(~w(__struct__ __meta__)a)
      |> Map.put(key, value)

    event
    |> Ecto.Changeset.cast(%{location: new_location}, [])
    |> Ecto.Changeset.cast_assoc(:location)
    |> Repo.update!()
    |> Repo.preload([:tags, :location, organizer: [:phone_numbers, :email_addresses]])
    |> for_web()
  end

  defp for_web(event) do
    event
    |> Map.take(~w(id tags start_date end_date featured_image_url location summary title name type status description host)a)
    |> (fn event = %{tags: tags} -> Map.put(event, :tags, tags |> Enum.map(&(&1.name))) end).()
  end

  defp set_status(id, status) do
    Repo.update_all((from e in Event, where: e.id == ^id), set: [status: status])

    Event
    |> Repo.get(id)
    |> Repo.preload([:tags, :location, organizer: [:phone_numbers, :email_addresses]])
    |> for_web()
  end

  defp mark_action(id, action) do
    tag = "Event: Action: #{String.capitalize(action)}"

    Event.add_tags(%Osdi.Event{id: id}, [tag])
    Event
    |> Repo.get(id)
    |> Repo.preload([:tags, :location, organizer: [:phone_numbers, :email_addresses]])
    |> for_web()
  end

  defp duplicate(id) do
    dup =
      Event
      |> Repo.get(id)
      |> Repo.preload([:tags, :location, :creator, :modified_by, organizer: [:phone_numbers, :email_addresses]])

    dup =
      dup
      |> Map.put(:start_date, dup.start_date |> Timex.shift(days: 7))
      |> Map.put(:end_date, dup.end_date |> Timex.shift(days: 7))
      |> Map.put(:status, "tentative")

    dup =
      dup
      |> Map.put(:name, Event.slug_for(dup.title, dup.start_date))
      |> Map.drop([:__struct__, :__meta__, :id, :attendances])

    %{id: new_id} =
      Event
      |> struct(dup)
      |> Repo.insert!()

    Event
    |> Repo.get(new_id)
    |> Repo.preload([:tags, :location, organizer: [:phone_numbers, :email_addresses]])
    |> for_web()
  end
end
