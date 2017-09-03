defmodule Admin.EventsChannel do
  use Admin, :channel
  alias Osdi.{Repo, Event}

  def join("events", payload, socket) do
    if authorized?(payload) do
      {:ok, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  # Channels can be used in a request/response fashion
  # by sending replies to requests from the client
  def handle_in("ready", _payload, socket) do
    send_events(socket)
    {:noreply, socket}
  end

  # It is also common to receive messages from the client and
  # broadcast to everyone in the current topic (events:lobby).
  def handle_in("shout", payload, socket) do
    broadcast socket, "shout", payload
    {:noreply, socket}
  end

  # Add authorization logic here as required.
  defp authorized?(_payload) do
    true
  end

  defp send_events(socket) do
    Event
    |> Repo.all()
    |> Repo.preload([:location, :tags])
    |> Enum.map(&to_map/1)
    |> Enum.each(fn event ->
         push socket, "event", %{id: event.id, event: event}
       end)
  end

  defp to_map(event = %Event{organizer: organizer, creator: creator, tags: tags}) do
    event
    |> Map.from_struct()
    |> Map.take(~w(id end_date featured_image_url location summary title name tags)a)
    |> IO.inspect
  end
end
