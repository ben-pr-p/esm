defmodule Admin.HostsChannel do
  use Admin, :channel
  alias Phoenix.Socket.Broadcast
  use Guardian.Channel
  import Guardian.Phoenix.Socket
  alias Admin.{CheckoutAgent}
  import ShortMaps

  @instance Application.get_env(:admin, :instance, "jd")
  def deployed_url, do: Application.get_env(:admin, :deployed_url, "localhost:4000")

  def join("hosts", _payload, socket) do
    {:ok, socket}
  end

  # Starting sending events
  def handle_in("ready", _, socket) do
    send_hosts(socket)
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

  def handle_in("call-logs-for-" <> id, _payload, socket) do
    calls = Admin.CallLogs.get_for(id)
    push(socket, "call-logs", ~m(calls id))
    {:noreply, socket}
  end

  def handle_in("add-call-log-" <> event_id, ~m(note result), socket) do
    actor = current_resource(socket)

    Admin.CallLogs.add_to(~m(actor event_id note result))
    calls = Admin.CallLogs.get_for(event_id)

    Admin.HostStatus.set_for(event_id, result)

    push(socket, "call-logs", Map.merge(~m(calls), %{"id" => event_id}))
    send_hosts(socket)
    {:noreply, socket}
  end

  def send_hosts(socket) do
    all_hosts =
      PotentialHosts.get_potential_hosts()
      |> Flow.from_enumerable()
      |> Flow.map(&wrap_with_result/1)
      |> Enum.to_list()

    broadcast(socket, "hosts", %{all_hosts: all_hosts})
  end

  def wrap_with_result(object = ~m(id host)) do
    case Admin.HostStatus.get_for(id) do
      %{"result" => status} -> Map.put(object, "host", Map.merge(host, ~m(status)))
      nil -> object
    end
  end
end
