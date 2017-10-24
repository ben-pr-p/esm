defmodule Mix.Tasks.Admin.RecreateSummary do
  use Mix.Task
  alias Osdi.{Repo, Event}

  def run(_) do
    Event
    |> Repo.all()
    |> Enum.map(&set_summary/1)
    |> Enum.map(&print_summary/1)
  end

  def set_summary(event = %{description: description}) when is_binary(description) do
    IO.puts(event.summary)

    new_summary =
      String.slice(event.description, 0..199) <>
        if String.length(event.description) > 200, do: "...", else: ""

    event
    |> Ecto.Changeset.change(%{summary: new_summary})
    |> Repo.update!()
  end

  def set_summary(event), do: event

  def print_summary(event) do
    IO.puts(event.summary)
    event
  end
end
