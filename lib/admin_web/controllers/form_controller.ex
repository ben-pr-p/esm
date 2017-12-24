defmodule AdminWeb.FormController do
  import ShortMaps

  @cosmic_config_slug Application.get_env(:admin, :cosmic_info_slug)

  def create(conn, params) do
    %{"metadata" => %{"event_submitted" => success_hook,
      "submission_failure" => failure_hook}} = Cosmic.get(@cosmic_config_slug)

    try do
      created = do_create(params)

      success_hook
      |> HTTPotion.post(body: created |> Poison.encode!())
      |> inspect()
      |> Logger.info()

      json(conn, created)
    rescue e ->
      failure_hook
      |> HTTPotion.post(body: params |> Poison.encode!())
      |> inspect()
      |> Logger.info()

      json(conn, %{"ok" => "But error"})
    end
  end

  def do_create(body)
    ~m(first_name last_name email phone city state zip event_type zip title date
       start_time end_time venue address description) = body

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

    %{body: created} = Proxy.post("events", body: ~m(
      location contact start_date end_date tags event_type title description
    ))

    created
  end

  def construct_dt(time, date) do
    [hours, minutes] = military_time(time)
    [month, day, year] = String.split(date, "/")

    %DateTime{
      year: easy_int(year), month: easy_int(month), day: easy_int(day),
      time_zone: "", hour: easy_int(hours), minute: easy_int(minutes),
      second: 0, std_offset: 0, utc_offset: 0, zone_abbr: "UTC"
    }
  end

  def military_time([time, "AM"]) do
    [hours, minutes, seconds] = String.split(time, ":")
    {hours, _} = Integer.parse(hours)
    case hours do
      12 -> [0, minutes]
      _ -> [hours, minutes]
    end
  end

  def military_time([time, "PM"]) do
    [hours, minutes, seconds] = String.split(time, ":")
    {hours, _} = Integer.parse(hours)
    case hours do
      12 -> [12, minutes]
      _ -> [hours + 12, minutes]
    end
  end
end
