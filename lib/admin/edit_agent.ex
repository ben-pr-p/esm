defmodule EditAgent do
  use Agent

  def start_link do
    Agent.start_link(fn -> %{} end, name: __MODULE__)
  end

  def record_edit(id) do
    edited = Agent.get(__MODULE__, fn edited -> edited end)

    if Map.has_key?(edited, id) do

    end
  end

  defp queue_edit(id) do

  end
end
