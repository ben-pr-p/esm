defmodule Admin.PageController do
  use Admin, :controller
  alias Osdi.{Repo, Tag}
  import Ecto.Query

  def index(conn, _params) do
    calendars =
      "candidates"
      |> Cosmic.get_type()
      |> Enum.filter(&(not is_nil(&1["metadata"]["district"])))
      |> Enum.map(&(&1["title"]))
      |> Enum.concat(["Brand New Congress", "Justice Democrats"])
      |> Poison.encode!()


    tags =
      (from e in "event_taggings",
        join: t in Tag, on: e.tag_id == t.id,
        select: t.name)
      |> Repo.all()
      |> Enum.to_list()
      |> Poison.encode!()

    render conn, "index.html", [calendars: calendars, tags: tags]
  end
end
