defmodule Admin.EditAgent do
  use Agent
  alias Osdi.{EventEdit, Event, Repo}
  alias Admin.{Webhooks, EventsChannel}
  import Ecto.Query

  def start_link do
    Agent.start_link(fn -> %{} end, name: __MODULE__)
  end

  def record_edit(id) do
    Agent.get_and_update __MODULE__, fn edit_ranges ->
      starting_at =
        if Map.has_key?(edit_ranges, id) do
          edit_ranges |> Map.get(id) |> Map.get(:starting_at)
        else
          DateTime.utc_now()
        end

      ending_at = Timex.shift(DateTime.utc_now(), minutes: 5)

      return = Map.put(edit_ranges, id, %{starting_at: starting_at, ending_at: ending_at})
      {return, return}
    end
  end

  defp send do
    edit_ranges = Agent.get(__MODULE__, fn edit_ranges -> edit_ranges end)

    ranges_to_send = Enum.filter edit_ranges, fn
      {_, %{ending_at: ending_at}} -> Timex.before?(ending_at, DateTime.utc_now())
    end

    ranges_to_send
    |> Enum.map(&fetch_edits/1)
    |> Enum.map(&send_edits/1)

    Enum.map ranges_to_send, fn {id, _} -> id end
  end

  defp fetch_edits({id, %{starting_at: starting_at, ending_at: ending_at}}) do
    {id, EventEdit.edits_for_within(id, starting_at, ending_at)}
  end

  defp send_edits({id, edits}) do
    event = fetch_for_web(id)
    Webhooks.on("edit", %{event: event, edits: edits})
  end

  defp clear(ids) when is_list(ids) do
    Agent.get_and_update __MODULE__, fn edit_ranges ->
      return = Map.drop(edit_ranges, ids)
      {return, return}
    end
  end

  def send_and_clear do
    sent_ids = send()
    clear(sent_ids)
  end

  def fetch_for_web(id) do
    (from e in Event, where: e.id == ^id, preload: [:tags, :location, :attendances])
    |> Repo.one()
    |> EventsChannel.for_web()
  end
end