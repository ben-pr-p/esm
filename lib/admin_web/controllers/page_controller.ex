defmodule Admin.PageController do
  use Admin, :controller

  alias Osdi.{Repo, Tag}
  alias Guardian.Plug

  import Ecto.Query

  plug Plug.EnsureAuthenticated, [handler: __MODULE__]
    when action in ~w(index)a

  def index(conn, params) do
    email = Plug.current_resource(conn)

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

    render conn, "index.html", [calendars: calendars, tags: tags, email: email]
  end

  def unauthenticated(conn, _) do
    conn
    |> put_status(302)
    |> put_flash(:info, "Authentication required")
    |> redirect(to: "/auth")
  end
end
