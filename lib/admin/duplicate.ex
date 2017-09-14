defmodule Duplicate do
  alias Osdi.{Repo, Event}
  import Ecto.Query

  def by_name(name, new_month, new_day) do
    event = Repo.all(from e in Event, where: e.name == ^name) |> Repo.preload([:creator, :organizer, :modified_by, :tags, :location]) |> List.first()

    start_date = Map.put(event.start_date, :day, new_day)
    end_date = Map.put(event.end_date, :day, new_day)
    start_date = Map.put(start_date, :month, new_month)
    end_date = Map.put(end_date, :month, new_month)

    event = Map.put(event, :start_date, start_date)
    event = Map.put(event, :end_date, end_date)
    event = Map.put(event, :id, nil)
    event = Map.put(event, :attendances, [])

    event = Map.put(event, :name, Event.slug_for(event.title, event.start_date))

    Repo.insert(event)
  end
end
