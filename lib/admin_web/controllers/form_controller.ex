defmodule Admin.FormController do
  use Admin, :controller
  alias Esm.{Submissions}
  import ShortMaps

  @max_delay_time 120

  def form_one(conn, params) do
    submission_id =
      if Map.has_key?(params, "submission_id"),
        do: params["submission_id"],
        else: get_session(conn, :submission_id)

    case submission_id do
      nil ->
        render(conn, "form_one.html")

      _submission_id ->
        redirect(conn, to: "/event/create")
    end
  end

  def form_one_submit(conn, params) do
    submission_id = Submissions.start(params)

    conn
    |> put_session(:submission_id, submission_id)
    |> render("form_two.html", type: params["type"], name: params["name"], hide_intro: true)
  end

  def form_two(conn, params) do
    submission_id =
      if Map.has_key?(params, "submission_id"),
        do: params["submission_id"],
        else: get_session(conn, :submission_id)

    case submission_id do
      nil ->
        redirect(conn, to: "/event/host")

      submission_id ->
        case Submissions.get_fragment(submission_id) do
          %{"data" => %{"type" => type, "contact" => ~m(name)}} ->
            render(conn, "form_two.html", type: type, name: name, hide_intro: false)

          nil ->
            conn
            |> delete_session(:submission_id)
            |> redirect(to: "/event/host")
        end
    end
  end

  def form_two_submit(
        conn,
        params =
          ~m(date start_time end_time title description venue capacity address city state zip)
      ) do
    data =
      Map.merge(
        %{
          "status" => "tentative",
          "location" => %{
            "venue" => venue,
            "address_lines" => [address],
            "region" => state,
            "locality" => city,
            "postal_code" => zip
          },
          "tags" => ["Event: Should Contact Host", "Source: New Volunteer Form"],
          "start_date" => combine_time_and_date(start_time, date),
          "end_date" => combine_time_and_date(end_time, date),
          "instructions" => "Your host, #{first_name}, can be reached at #{email} or #{phone}."
        },
        ~m(title description capacity)
      )

    submission_id = get_session(conn, :submission_id)
    Submissions.complete(submission_id, data)

    conn
    |> delete_session(:submission_id)
    |> render("thanks.html")
  end

  def direct_publish(conn, _params) do
    render(conn, "direct_publish.html")
  end

  def direct_publish_submit(
        conn,
        params =
          ~m(date start_time end_time title description venue capacity address city state zip first_name last_name email phone zip type)
      ) do
    source = params["source"]

    data =
      Map.merge(
        %{
          "status" => "confirmed",
          "location" => %{
            "venue" => venue,
            "address_lines" => [address],
            "region" => state,
            "locality" => city,
            "postal_code" => zip
          },
          "contact" => %{
            "given_name" => first_name,
            "last_name" => last_name,
            "email_address" => email,
            "phone_number" => phone
          },
          "tags" => ["Event: Should Contact Host", "Source: New Volunteer Form"],
          "start_date" => construct_dt(start_time, date),
          "end_date" => construct_dt(end_time, date),
          "instructions" => "Your host, #{first_name}, can be reached at #{email} or #{phone}."
        },
        ~m(title description capacity type)
      )

    Submissions.start_and_complete(data)
    render(conn, "thanks.html", direct_publish: true)
  end

  def clear_session_redirect(conn, _) do
    conn
    |> delete_session(:submission_id)
    |> redirect(to: "/event/host")
  end

  def create(conn, params) do
    %{"metadata" => %{"event_submitted" => success_hook, "submission_failure" => failure_hook}} =
      Cosmic.get(Application.get_env(:admin, :cosmic_config_slug))

    try do
      spawn(fn ->
        created =
          params
          |> IO.inspect()
          |> do_create()
          |> Admin.Webhooks.process_event()

        IO.puts("Posting webhook to #{success_hook}")
        IO.inspect(created)

        sleep_time = Enum.random(1..@max_delay_time) * 1000
        :timer.sleep(sleep_time)

        success_hook
        |> HTTPotion.post(body: created |> Poison.encode!())
        |> IO.inspect()
      end)

      text(conn, "OK")
    rescue
      error ->
        failure_hook
        |> HTTPotion.post(body: Map.put(params, "error", error) |> Poison.encode!())
        |> IO.inspect()

        conn
        |> put_status(500)
        |> json(%{"error" => error, "event" => params})
    end
  end

  def do_create(body) do
    ~m(first_name last_name email phone city state zip event_type zip title date
       start_time end_time venue address description) = body

    capacity = body["capacity"] || 50
    capacity = easy_int(capacity)

    location = %{
      venue: venue,
      locality: city,
      region: state,
      postal_code: zip,
      address_lines: [address]
    }

    contact = %{
      name: "#{first_name} #{last_name}",
      email_address: email,
      phone_number: phone
    }

    tags = ["Event: Should Contact Host", "Source: Google Form"]

    start_date = construct_dt(start_time, date)
    end_date = construct_dt(end_time, date)
    type = event_type
    status = if Map.has_key?(body, "whitelist"), do: "confirmed", else: "tentative"
    instructions = "Your host, #{first_name}, can be reached at #{email} or #{phone}."

    %{body: created} = OsdiClient.post(client(), "events", ~m(
      location contact start_date end_date tags type title description status
      capacity instructions
    ))

    if Map.keys(created) |> length() < 5 do
      1 + "force error"
    end

    IO.inspect(created)
  end

  def combine_time_and_date(time, date) do
    [hours, minutes] = String.split(time, ":")
    [year, month, day] = String.split(date, "-")

    %DateTime{
      year: easy_int(year),
      month: easy_int(month),
      day: easy_int(day),
      time_zone: "",
      hour: easy_int(hours),
      minute: easy_int(minutes),
      second: 0,
      std_offset: 0,
      utc_offset: 0,
      zone_abbr: "UTC"
    }
  end

  def construct_dt(time, date) do
    [hours, minutes] = String.split(time, " ") |> military_time()
    [month, day, year] = String.split(date, "/")

    {:ok, dt} =
      %DateTime{
        year: easy_int(year),
        month: easy_int(month),
        day: easy_int(day),
        time_zone: "",
        hour: easy_int(hours),
        minute: easy_int(minutes),
        second: 0,
        std_offset: 0,
        utc_offset: 0,
        zone_abbr: "UTC"
      }
      |> Timex.format("{YYYY}-{0M}-{0D}T{h24}:{m}")

    dt
  end

  def military_time([time, "AM"]) do
    [hours, minutes] = String.split(time, ":") |> Enum.take(2)
    {hours, _} = Integer.parse(hours)

    case hours do
      12 -> [0, minutes]
      _ -> [hours, minutes]
    end
  end

  def military_time([time, "PM"]) do
    [hours, minutes] = String.split(time, ":") |> Enum.take(2)
    {hours, _} = Integer.parse(hours)

    case hours do
      12 -> [12, minutes]
      _ -> [hours + 12, minutes]
    end
  end

  def easy_int(str) when is_binary(str) do
    {int, _} = Integer.parse(str)
    int
  end

  def easy_int(int), do: int

  def rerun(line) when is_binary(line) do
    String.split(line, "\t") |> rerun()
  end

  def rerun([
        _,
        first_name,
        last_name,
        email,
        phone,
        event_type,
        title,
        description,
        start_time,
        end_time,
        venue,
        address,
        city,
        state,
        zip,
        date,
        _,
        capacity
      ]) do
    do_create(~m(first_name last_name email phone city state zip event_type zip title date
       start_time end_time venue address description capacity))
  end

  def rerun_whitelist(line) when is_binary(line) do
    String.split(line, "\t") |> rerun_whitelist()
  end

  def rerun_whitelist([
        _,
        first_name,
        last_name,
        email,
        phone,
        event_type,
        date,
        start_time,
        end_time,
        title,
        description,
        venue,
        capacity,
        address,
        city,
        state,
        zip
      ]) do
    do_create(~m(first_name last_name email phone city state zip event_type zip title date
       start_time end_time venue address description) |> Map.merge(%{"whitelist" => true}))
  end

  def do_rerun do
    ~s[]
    |> String.split("\n")
    |> Enum.map(&IO.inspect(rerun(&1)))
  end

  def client,
    do:
      OsdiClient.build_client(
        Application.get_env(:admin, :osdi_base_url),
        Application.get_env(:admin, :osdi_api_token)
      )
end
