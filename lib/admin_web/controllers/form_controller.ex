defmodule Admin.FormController do
  use Admin, :controller

  import ShortMaps

  @cosmic_config_slug Application.get_env(:admin, :cosmic_info_slug)

  def create(conn, params) do
    %{"metadata" => %{"event_submitted" => success_hook, "submission_failure" => failure_hook}} =
      Cosmic.get(@cosmic_config_slug)

    try do
      created =
        params
        |> IO.inspect()
        |> do_create()
        |> Admin.Webhooks.process_event()

      IO.puts("Posting webhook to #{success_hook}")
      IO.inspect(created)

      success_hook
      |> HTTPotion.post(body: created |> Poison.encode!())
      |> IO.inspect()

      json(conn, created)
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

    %{body: created} = Proxy.post("events", body: ~m(
      location contact start_date end_date tags type title description status
      capacity
    ))

    if Map.keys(created) |> length() < 5 do
      1 + "force error"
    end

    IO.inspect(created)
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
    rerun(
      ~s(2/9/2018 11:34:48	Travis	Boldt	Tboldt@gmail.com	2819893675	Canvass	Block-walking for Beto in Shadow Creek Ranch	We will be canvassing local neighborhoods spreading the word about Beto and registering new-voters. This is the weekend during early-voting so we can directly encourage people to go out and vote that day!	11:00:00 AM	3:00:00 PM	Travis' House	11607 Cross Spring Dr	Pearland	Tx	77584	2/24/2018		30)
    )
  end
end
