defmodule Admin.CheckoutAgent do
  use Agent

  def start_link do
    Agent.start_link(fn -> %{} end, name: __MODULE__)
  end

  # Update state, and you can't check out two at once
  def register(id, email) do
    Agent.update(__MODULE__, fn state ->
      Map.put(state, id, email)
      |> Enum.reject(fn {other_id, other_email} -> email == other_email end)
      |> Enum.into(%{})
    end)
  end

  def who_has(id) do
    Agent.get(__MODULE__, fn state -> Map.get(state, id, nil) end)
  end

  def free(id) do
    Agent.update(__MODULE__, fn state -> Map.drop(state, [id]) end)
  end
end
