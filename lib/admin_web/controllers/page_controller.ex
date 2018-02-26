defmodule Admin.PageController do
  use Admin, :controller
  import ShortMaps

  alias Osdi.{Repo, Tag}
  alias Guardian.Plug

  plug(
    Plug.EnsureAuthenticated,
    [handler: __MODULE__]
    when action in ~w(esm list hosts index)a
  )

  def index(conn, _params) do
    render(conn, "index.html")
  end

  def esm(conn, _params) do
    email = Plug.current_resource(conn)

    calendars =
      "candidates"
      |> Cosmic.get_type()
      |> Enum.filter(&(not is_nil(&1["metadata"]["district"])))
      |> Enum.map(& &1["title"])
      |> Enum.concat(["Brand New Congress", "Justice Democrats"])
      |> Poison.encode!()

    render(conn, "esm.html", calendars: calendars, email: email)
  end

  def list(conn, _params) do
    render(conn, "list.html")
  end

  def hosts(conn, _params) do
    render(conn, "hosts.html")
  end

  def my_events(conn, %{"token" => token}) do
    case token |> URI.encode_www_form() |> MyCipher.decrypt() do
      {:error, _message} -> alert_user_edit(conn)
      _organizer_id -> render(conn, "my-events.html", organizer_token: token)
    end
  end

  def candidate_events(conn, %{"token" => token}) do
    case token |> URI.encode_www_form() |> MyCipher.decrypt() do
      {:error, _message} ->
        alert_user_edit(conn)

      candidate_tag ->
        render(
          conn,
          "candidate-events.html",
          candidate_token: token,
          candidate_tag: candidate_tag
        )
    end
  end

  def unauthenticated(conn, _) do
    conn
    |> put_status(302)
    |> put_flash(:info, "Authentication required")
    |> redirect(to: "/auth")
  end

  def rsvps(conn, %{"encrypted" => encrypted}) do
    case encrypted |> URI.encode_www_form() |> MyCipher.decrypt() do
      {:error, _message} -> alert_user_rsvp(conn)
      id -> authorized_rsvp(conn, id)
    end
  end

  defp alert_user_rsvp(conn) do
    text(
      conn,
      "Hey there!\n\nUnfortunately, our systems could not associate this rsvp download link with an event.\nPlease contact organizing@betofortexas.com for help."
    )
  end

  defp alert_user_edit(conn) do
    text(
      conn,
      "Hey there!\n\nUnfortunately, our systems could not associate this token with a particular event host.\nPlease contact organizing@betofortexas.com for help."
    )
  end

  defp authorized_rsvp(conn, id) do
    csv_content = Rsvps.csv_for(id)
    filename = [DateTime.utc_now() |> DateTime.to_iso8601(), id, "rsvps"] |> Enum.join("-")

    conn
    |> put_resp_content_type("text/csv")
    |> put_resp_header("content-disposition", "attachment; filename=\"#{filename}.csv\"")
    |> send_resp(200, csv_content)
  end

  def events_api(conn, %{"secret" => input_secret}) do
    if secret() == input_secret do
      events =
        OsdiClient.stream(client(), "events")
        |> Enum.map(&Admin.EventsChannel.event_pipeline/1)

      json(conn, events)
    else
      text(conn, "Wrong secret.")
    end
  end

  def events_api(conn, _) do
    text(conn, "Missing secret – please visit /api/events?secret=thethingigotfromben")
  end

  def secret, do: Application.get_env(:admin, :osdi_api_token)

  def client,
    do:
      OsdiClient.build_client(
        Application.get_env(:admin, :osdi_base_url),
        Application.get_env(:admin, :osdi_api_token)
      )
end
