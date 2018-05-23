defmodule EventMirror do
  use Agent

  def start_link(_opts \\ []) do
    spawn(&update/0)
    Agent.start_link(fn -> %{} end, name: __MODULE__)
  end

  def update do
    all =
      OsdiClient.stream(client(), "events")
      |> Enum.reduce(%{}, fn event, acc ->
        Map.put(acc, event.id, event)
      end)

    Agent.update(__MODULE__, fn state ->
      Enum.reduce(all, state, fn {id, event}, old_state ->
        if not Map.has_key?(state, "#{id}") do
          Map.put(old_state, "#{id}", event)
        else
          old_state
        end
      end)
    end)
  end

  def all do
    Agent.get(__MODULE__, &Map.values(&1))
  end

  def one(id) do
    Agent.get(__MODULE__, fn evs ->
      case Enum.filter(evs, fn {ev_id, _ev} -> "#{ev_id}" == "#{id}" end)
           |> List.first() do
        {_, ev} -> ev
        nil -> nil
      end
    end)
  end

  def edit(id, edits) do
    spawn(fn ->
      OsdiClient.put(client(), "events/#{id}", edits)
    end)

    Agent.get_and_update(__MODULE__, fn state ->
      new_state = Map.update!(state, "#{id}", &deep_merge(&1, edits))
      {new_state[id], new_state}
    end)
  end

  def deep_merge(map, edits) do
    Enum.reduce(edits, map, fn {key, value}, acc ->
      if is_map(value) do
        Map.update(acc, safe_to_atom(key), %{}, &deep_merge(&1, value))
      else
        Map.put(acc, safe_to_atom(key), value)
      end
    end)
  end

  def safe_to_atom(key) when is_atom(key), do: key
  def safe_to_atom(key) when is_binary(key), do: String.to_atom(key)

  def client,
    do:
      OsdiClient.build_client(
        Application.get_env(:admin, :osdi_base_url),
        Application.get_env(:admin, :osdi_api_token)
      )
end
