defmodule Admin.HostsChannel do
  use Admin, :channel
  alias Phoenix.Socket.Broadcast
  use Guardian.Channel
  import Guardian.Phoenix.Socket
  alias Admin.{CheckoutAgent}
  alias Esm.{Submissions}
  import ShortMaps

  def deployed_url, do: Application.get_env(:admin, :deployed_url, "http://localhost:4000/")

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

  # def handle_in("call-logs-for-" <> id, _payload, socket) do
  #   calls = Admin.CallLogs.get_for(id)
  #   push(socket, "call-logs", ~m(calls id))
  #   {:noreply, socket}
  # end

  # def handle_in("add-call-log-" <> event_id, ~m(note result), socket) do
  #   actor = current_resource(socket)

  #   Admin.CallLogs.add_to(~m(actor event_id note result))
  #   calls = Admin.CallLogs.get_for(event_id)

  #   Admin.HostStatus.set_for(event_id, result)

  #   push(socket, "call-logs", Map.merge(~m(calls), %{"id" => event_id}))
  #   send_hosts(socket)
  #   {:noreply, socket}
  # end

  def send_hosts(socket) do
    all_hosts =
      Submissions.get_all_non_created()
      |> Enum.map(&wrap_with_id/1)

    broadcast(socket, "hosts", %{all_hosts: all_hosts})
  end

  def wrap_with_id(~m(id created_at data status)) do
    host =
      Map.merge(data, %{
        "submitted_at" => created_at,
        "status" => status,
        "submission_complete_url" => deployed_url() <> "/event/host?submission_id=#{id}"
      })

    ~m(id host)
  end
end
