defmodule Admin.PageController do
  use Admin, :controller

  alias Osdi.{Repo, Tag, Event, Attendance}
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

  def rsvps(conn, %{"name" => name}) do
    authorized_rsvp(conn, name)
  end

  defp authorized_rsvp(conn, name) do
    csv_content = Rsvps.csv_for(name)
    filename = [DateTime.utc_now() |> DateTime.to_iso8601(), name, "rsvps"] |> Enum.join("-")

    conn
    |> put_resp_content_type("text/csv")
    |> put_resp_header("content-disposition", "attachment; filename=\"#{filename}.csv\"")
    |> send_resp(200, csv_content)
  end
end
