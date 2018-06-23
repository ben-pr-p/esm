defmodule FakeEventMirror do
  import ShortMaps

  use Agent

  def start_link(_opts \\ []) do
    Agent.start_link(fn -> %{} end, name: __MODULE__)
  end

  def update do
    :ok
  end

  def all do
    OsdiClient.stream(client(), "events")
    |> Enum.filter(fn ~m(start_date)a ->
      {:ok, std, _} = DateTime.from_iso8601(start_date)
      Timex.before?(Timex.now() |> Timex.shift(days: -1), std)
    end)
  end

  def one(id) do
    %{body: event} = OsdiClient.get(client(), "events/#{id}")
    event
  end

  def edit(id, edits) do
    %{body: event} = OsdiClient.put(client(), "events/#{id}", edits)
    event
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
