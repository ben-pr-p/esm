defmodule Admin.EditAgent do
  use Agent
  alias Admin.{Webhooks, EventsChannel}

  @instance Application.get_env(:admin, :instance, "jd")

  def start_link do
    Agent.start_link(fn -> %{} end, name: __MODULE__)
  end

  def record_edit(id) do
    Agent.get_and_update(__MODULE__, fn edit_ranges ->
      starting_at =
        if Map.has_key?(edit_ranges, id) do
          edit_ranges |> Map.get(id) |> Map.get(:starting_at)
        else
          DateTime.utc_now()
        end

      ending_at = Timex.shift(DateTime.utc_now(), minutes: 1)

      return = Map.put(edit_ranges, id, %{starting_at: starting_at, ending_at: ending_at})
      {return, return}
    end)
  end

  defp send do
    edit_ranges = Agent.get(__MODULE__, fn edit_ranges -> edit_ranges end)

    ranges_to_send =
      Enum.filter(edit_ranges, fn {_, %{ending_at: ending_at}} ->
        Timex.before?(ending_at, DateTime.utc_now())
      end)

    Stream.map(ranges_to_send, fn range ->
      {id, _} = to_send = fetch_edits(range)
      send_edits(to_send)
      clear([id])
    end)
    |> Stream.run()
  end

  defp fetch_edits({id, %{starting_at: starting_at, ending_at: ending_at}}) do
    {id, edits_for_within(id, starting_at, ending_at)}
  end

  defp send_edits({id, edits}) do
    %{body: event} = Proxy.get("events/#{id}")
    Webhooks.on("edit", %{event: event, edits: edits})
  end

  defp clear(ids) when is_list(ids) do
    Agent.get_and_update(__MODULE__, fn edit_ranges ->
      return = Map.drop(edit_ranges, ids)
      {return, return}
    end)
  end

  def send_and_clear do
    sent_ids = send()
  end

  def edits_for_within(id, starting_at, ending_at) do
    Mongo.find(:mongo, "esm_actions_#{@instance}", %{
      "event_id" => id,
      "$and" => [
        %{ending_at: %{"$gt" => starting_at}},
        %{ending_at: %{"$lt" => ending_at}}
      ]
    }) |> Enum.to_list()
  end
end
