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
    render(conn, "esm.html", email: email)
  end

  def list(conn, _params) do
    render(conn, "list.html")
  end

  def hosts(conn, _params) do
    render(conn, "hosts.html")
  end

  def my_events(conn, %{"token" => token}) do
    case token |> URI.encode_www_form() |> MyCipher.decrypt() do
      {:error, _message} ->
        alert_user_edit(conn)

      _organizer_id ->
        render(
          conn,
          "my-events.html",
          organizer_token: token,
          help_email: Application.get_env(:admin, :help_email)
        )
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

  def internal_events_api(conn, params = %{"secret" => input_secret}) do
    if secret() == input_secret do
      events =
        OsdiClient.stream(client(), "events")
        |> Enum.map(&Admin.EventsChannel.event_pipeline/1)
        |> Enum.filter(fn ev -> if params["future"], do: is_in_future?(ev), else: true end)
        |> Enum.filter(fn ev ->
          if params["confirmed"], do: ev.status == "confirmed", else: true
        end)
        |> Enum.map(fn ev ->
          tags = Map.get(ev, :tags, [])

          candidate_tag =
            Enum.filter(
              tags,
              &(String.contains?(&1, "Calendar:") and
                  not (String.contains?(&1, "Justice Democrats") or
                         String.contains?(&1, "Brand New Congress") or
                         String.contains?(&1, "Local Chapter")))
            )
            |> List.first()

          candidate =
            case candidate_tag do
              nil -> nil
              "Calendar: " <> c -> c
            end

          flags =
            %{}
            |> Map.put("direct_publish", Enum.member?(tags, "Source: Direct Publish"))
            |> Map.put("synced", Enum.member?(tags, "Source: Sync"))
            |> Map.put("editable", not Enum.member?(tags, "Source: Sync"))
            |> Map.put("local_chapter", Enum.member?(tags, "Calendar: Local Chapter"))
            |> Map.put("candidate", candidate)

          Map.merge(ev, flags)
        end)

      json(conn, events)
    else
      text(conn, "Wrong secret.")
    end
  end

  def interval_events_api(conn, _) do
    text(conn, "Missing secret – please visit /api/events?secret=thethingigotfromben")
  end

  def update_cosmic(conn, _) do
    Cosmic.update()
    text(conn, "OK")
  end

  def is_in_future?(ev) do
    case DateTime.from_iso8601(ev.start_date) do
      {:ok, dt, _} -> Timex.now() |> Timex.before?(dt)
      _ -> false
    end
  end

  def client,
    do:
      OsdiClient.build_client(
        Application.get_env(:admin, :osdi_base_url),
        Application.get_env(:admin, :osdi_api_token)
      )
end
