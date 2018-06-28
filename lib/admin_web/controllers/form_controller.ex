defmodule Admin.FormController do
  use Admin, :controller
  alias Esm.{Submissions}
  import ShortMaps
  require Logger

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
    |> render(
      "form_two.html",
      type: params["type"],
      name: params["name"],
      hide_intro: true,
      submission_id: submission_id
    )
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
            render(
              conn,
              "form_two.html",
              type: type,
              name: name,
              hide_intro: false,
              submission_id: submission_id
            )

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
          "end_date" => combine_time_and_date(end_time, date)
        },
        ~m(title description capacity)
      )

    submission_id = get_session(conn, :submission_id) || params["submission_id"]
    Submissions.complete(submission_id, data)

    conn
    |> delete_session(:submission_id)
    |> redirect(to: "/events/thanks")
  end

  def thanks(conn, _params) do
    render(conn, "thanks.html")
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
            "name" => "#{first_name} #{last_name}",
            "email_address" => email,
            "phone_number" => phone
          },
          "tags" => ["Event: Should Contact Host", "Source: New Volunteer Form"],
          "start_date" => construct_dt(start_time, date),
          "end_date" => construct_dt(end_time, date),
          "instructions" =>
            "If you have questions, please contact your host, #{first_name} #{last_name}, who can be reached at #{
              email
            } or #{phone}."
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

    spawn(fn ->
      try do
        created =
          params
          |> IO.inspect()
          |> do_create()
          |> Admin.Webhooks.process_event()

        Logger.info("Posting webhook to #{success_hook}")
        IO.inspect(created)

        sleep_time = Enum.random(1..@max_delay_time) * 1000
        :timer.sleep(sleep_time)

        success_hook
        |> HTTPotion.post(body: created |> Poison.encode!())
        |> IO.inspect()

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
    end)
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
    real_status = if Map.has_key?(body, "whitelist"), do: "confirmed", else: "tentative"
    status = "confirmed"

    instructions =
      "If you have questions, please contact your host #{contact.name}, who can be reached at #{
        email
      } or #{phone}."

    %{body: created = ~m(id)a} = OsdiClient.post(client(), "events", ~m(
      location contact start_date end_date tags type title description status
      capacity instructions
    ))

    Logger.info("Created event #{id}")

    if real_status == "tentative" do
      Logger.info("Now must unpublish it")
      OsdiClient.put(client(), "events/#{id}", %{"status" => "tentative"})
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
        # _,
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
    ~s[Michael	Caldwell	mcaldwell221@yahoo.com	2143108790	Canvass	Canvass for Beto | Plano	We will be knocking on doors to identify Beto supporters in our community. Please RSVP to join us! Please make sure to register for Polis, our canvassing app, at betofortexas.com/knock and come prepared with a fully charged cell phone. We'll quickly meet up and go over instructions before getting started, and will meet back where we started at noon.	10:00:00 AM	12:00:00 PM	Private Residence	4112 Merriman Dr	Plano	TX	75074	7/14/2018		0
    Nancy	Darvish	ndarvish@darvishsystems.com	2442433105	Phonebank	Phonebank for Beto | McKinney	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone. Wine will be available for volunteers who have reached legal drinking age in the State of Texas.	10:00:00 AM	12:00:00 PM	Darvish Residence	1101 Trail Ridge Dr.	McKinney	TX	75072	6/9/2018		20
    Nancy	Darvish	ndarvish@darvishsystems.com	2442433105	Phonebank	Phonebank for Beto | McKinney	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone. Wine will be available for volunteers who have reached legal drinking age in the State of Texas.	10:00:00 AM	12:00:00 PM	Darvish Residence	1101 Trail Ridge Dr.	McKinney	TX	75072	6/30/2018		20
    Elizabeth	Dierdorf	elizabeth.dierdorf@gmail.com	9402063575	Canvass	Canvass for Beto | Denton	We will be knocking on doors to identify Beto supporters in our community. Please RSVP to join us! Please make sure to register for Polis, our canvassing app, at betofortexas.com/knock and come prepared with a fully charged cell phone.	10:00:00 AM	1:00:00 PM	Lasher Residence	7517 Cottonwood Ct	Denton	TX	76210	6/14/2018		10
    Michelle	Dierdorf	dave_michelle@sbcglobal.net	8175287683	Canvass	Canvass for Beto | Denton	We will be knocking on doors to identify Beto supporters in our community. Please RSVP to join us! Please make sure to register for Polis, our canvassing app, at betofortexas.com/knock and come prepared with a fully charged cell phone.	6:00:00 PM	8:30:00 PM	Sloan Residence	7313 Fuller Circle	Denton	TX	76210	6/24/2018		10
    Ailleen	Duc	aileenduc@yahoo.com	9727439268	Phonebank	Phonebank for Beto | McKinney	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone. Please enter the neighborhood at Boston Lane; the gate will be left open for volunteers.	1:00:00 PM	3:00:00 PM	Duc Residence	6020 River Highlands Dr	McKinney	TX	75070	6/9/2018		10
    Ailleen	Duc	aileenduc@yahoo.com	9727439268	Phonebank	Phonebank for Beto | McKinney	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone. Please enter the neighborhood at Boston Lane; the gate will be left open for volunteers.	1:00:00 PM	3:00:00 PM	Duc Residence	6020 River Highlands Dr	McKinney	TX	75070	6/16/2018		10
    Kathy	Guerra	kathykguerra@yahoo.com	2147243758	Canvass	Canvass for Beto | Frisco	We will be knocking on doors to identify Beto supporters in our community. Please RSVP to join us! Please make sure to register for Polis, our canvassing app, at betofortexas.com/knock and come prepared with a fully charged cell phone.	5:00:00 PM	8:00:00 PM	Frisco Public Library	6101 Frisco Square Blvd	Frisco	TX	75034	6/9/2018		0
    Antonella	Longo	anto4texes@yahoo.com	9195233898	Canvass	Canvass for Beto | Highland Village	We will be knocking on doors to identify Beto supporters in our community. Please RSVP to join us! Please make sure to register for Polis, our canvassing app, at betofortexas.com/knock and come prepared with a fully charged cell phone.	10:00:00 AM	1:00:00 PM	Longo Residence	15 Horseshoe Dr	Highland Village	TX	75077	6/30/2018		10
    Antonella	Longo	anto4texes@yahoo.com	9195233898	Canvass	Canvass for Beto | Highland Village	We will be knocking on doors to identify Beto supporters in our community. Please RSVP to join us! Please make sure to register for Polis, our canvassing app, at betofortexas.com/knock and come prepared with a fully charged cell phone.	10:00:00 AM	1:00:00 PM	Longo Residence	15 Horseshoe Dr	Highland Village	TX	75077	7/7/2018		10
    David	Olsen	davidpolsen@sbcglobal.net	9726587389	Phonebank	Phonebank for Beto | McKinney	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone. If you are allergic to dogs, please be mindful that the host of the event will have pet dogs present.	6:00:00 PM	8:00:00 PM	Olsen Residence	1104 Chapel Hill Ct.	McKinney	TX	75069	6/12/2018		5
    David	Olsen	davidpolsen@sbcglobal.net	9726587389	Phonebank	Phonebank for Beto | McKinney	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone. If you are allergic to dogs, please be mindful that the host of the event will have pet dogs present.	6:00:00 PM	8:00:00 PM	Olsen Residence	1104 Chapel Hill Ct.	McKinney	TX	75069	6/19/2018		5
    Mark	Peterson	peterssonmark1@gmail.com	4694504242	Canvass	Canvass for Beto | McKinney	We will be knocking on doors to identify Beto supporters in our community. Please RSVP to join us! Please make sure to register for Polis, our canvassing app, at betofortexas.com/knock and come prepared with a fully charged cell phone. The cate code you will need to enter is #1530.	4:00:00 PM	6:00:00 PM	Peterson Residence	1300 Timberline Dr.	McKinney	TX	75072	6/17/2018		3
    Mark	Peterson	peterssonmark1@gmail.com	4694504242	Canvass	Canvass for Beto | McKinney	We will be knocking on doors to identify Beto supporters in our community. Please RSVP to join us! Please make sure to register for Polis, our canvassing app, at betofortexas.com/knock and come prepared with a fully charged cell phone. The cate code you will need to enter is #1530.	4:00:00 PM	6:00:00 PM	Peterson Residence	1300 Timberline Dr.	McKinney	TX	75072	6/24/2018		3
    Roy	Renzenbrink	royrenzenbrink@prodigy.net	9723452454	Phonebank	Phonebank for Beto | Frisco	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone.	7:00:00 PM	8:00:00 PM	Renzenbrink Residence	10218 Ambergate Lane	Frisco	TX	75035	6/18/2018		20
    Roy	Renzenbrink	royrenzenbrink@prodigy.net	9723452454	Phonebank	Phonebank for Beto | Frisco	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone.	7:00:00 PM	8:00:00 PM	Renzenbrink Residence	10218 Ambergate Lane	Frisco	TX	75035	6/25/2018		20
    Brian	Schorr	bschorr216@gmail.com	2162330927	Phonebank	Phonebank for Beto | Frisco	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone.	10:00:00 AM	12:00:00 PM	Schorr Residence	2879 Forest Manor Dr,	Frisco	TX	75034	6/23/2018		6
    Brian	Schorr	bschorr216@gmail.com	2162330927	Phonebank	Phonebank for Beto | Frisco	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone.	10:00:00 AM	12:00:00 PM	Schorr Residence	2879 Forest Manor Dr,	Frisco	TX	75034	6/30/2018		6
    Joanna	Snowden	jtsnowden@gmail.com	2146759823	Phonebank	Phonebank for Beto | Plano	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone. For those volunteers who are allergic to animals, please be aware that the host has a cat and a small dog.	1:00:00 PM	4:00:00 PM	Snowden Residence	3720 Stockport	Plano	TX	75025	6/9/2018		8
    Joanna	Snowden	jtsnowden@gmail.com	2146759823	Phonebank	Phonebank for Beto | Plano	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone. For those volunteers who are allergic to animals, please be aware that the host has a cat and a small dog.	1:00:00 PM	4:00:00 PM	Snowden Residence	3720 Stockport	Plano	TX	75025	6/23/2018		8
    David	Stanaway	david@stanaway.net	9562394526	Canvass	Canvass for Beto | Flower Mound	We will be knocking on doors to identify Beto supporters in our community. Please RSVP to join us! Please make sure to register for Polis, our canvassing app, at betofortexas.com/knock and come prepared with a fully charged cell phone. We will be meeting at the baseball park by Forestwood Middle School. Parking is also available at that location, which we will use as the base for our canvassing.	2:00 PM	4:00:00 PM	Wilkerson Park 	2880 Garden Rd.	Flower Mound	TX	75028	6/23/2018		20
    Sharrie	Wagner	slwsharrie@aol.com	2148500390	Phonebank	Phonebank for Beto | Plano	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone.	5:00:00 PM	7:00:00 PM	Wagner Residence	1916 Shadow Trail	Plano	TX	75075	6/20/2018		12
    Sharrie	Wagner	slwsharrie@aol.com	2148500390	Phonebank	Phonebank for Beto | Plano	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone.	5:00:00 PM	7:00:00 PM	Wagner Residence	1916 Shadow Trail	Plano	TX	75075	6/21/2018		12
    Sharrie	Wagner	slwsharrie@aol.com	2148500390	Phonebank	Phonebank for Beto | Plano	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone.	5:00:00 PM	7:00:00 PM	Wagner Residence	1916 Shadow Trail	Plano	TX	75075	6/22/2018		12
    Sharrie	Wagner	slwsharrie@aol.com	2148500390	Phonebank	Phonebank for Beto | Plano	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone.	5:00:00 PM	7:00:00 PM	Wagner Residence	1916 Shadow Trail	Plano	TX	75075	6/27/2018		12
    Sharrie	Wagner	slwsharrie@aol.com	2148500390	Phonebank	Phonebank for Beto | Plano	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone.	5:00:00 PM	7:00:00 PM	Wagner Residence	1916 Shadow Trail	Plano	TX	75075	6/28/2018		12
    Sharrie	Wagner	slwsharrie@aol.com	2148500390	Phonebank	Phonebank for Beto | Plano	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone.	5:00:00 PM	7:00:00 PM	Wagner Residence	1916 Shadow Trail	Plano	TX	75075	6/29/2018		12
    Greg and Amy	Wales	mauistubbs@gmail.com	2149238814	Phonebank	Phonebank for Beto | Garland	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone.	4:00:00 PM	7:00:00 PM	Wales Residence	2701 Green Oaks Dr	Garland	TX	75040	6/24/2018		6
    Greg and Amy	Wales	mauistubbs@gmail.com	2149238814	Phonebank	Phonebank for Beto | Garland	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone.	4:00:00 PM	7:00:00 PM	Wales Residence	2701 Green Oaks Dr	Garland	TX	75040	7/1/2018		6
    Marilyn	Levin	marilyn.levin@sbcglobal.net	9724048740	Phonebank	Phonebank for Beto | Dallas	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone.	10:00:00 AM	2:00:00 PM	Levin Residence	5007 Forest Bend Rd	Dallas	TX	75244	6/20/2018		5
    Marilyn	Levin	marilyn.levin@sbcglobal.net	9724048740	Phonebank	Phonebank for Beto | Dallas	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone.	10:00:00 AM	2:00:00 PM	Levin Residence	5007 Forest Bend Rd	Dallas	TX	75244	6/27/2018		5
    Catherine	Knight	ccknight2013@gmail.com	3182006495	Canvass	Canvass for Beto | Dallas	We will be knocking on doors to identify Beto supporters in our community. Please RSVP to join us! Please make sure to register for Polis, our canvassing app, at betofortexas.com/knock and come prepared with a fully charged cell phone. We will all initially meet up at the pool area of Brookhaven Townhomes (no entry code needed; not gated) and go from there!	11:00:00 AM	1:00:00 PM	Brookhaven Townhomes - Pool Area	3778 Vitruvian Way	Addison	TX	75001	6/23/2018		10
    Kathryn	Beaudry	beaudryka@yahoo.com	9403687938	Canvass	Canvass for Beto | Dallas	We will be knocking on doors to identify Beto supporters in our community. Please RSVP to join us! Please make sure to register for Polis, our canvassing app, at betofortexas.com/knock and come prepared with a fully charged cell phone.	9:00:00 AM	11:00:00 AM	Beaudry Residence	5826 Richmond Ave	Dallas	TX	75206	6/23/2018		0
    Craig	Beuerlein	cdbuilds@gmail.com	2147999727	Canvass	Canvass for Beto | Dallas	We will be knocking on doors to identify Beto supporters in our community. Please RSVP to join us! Please make sure to register for Polis, our canvassing app, at betofortexas.com/knock and come prepared with a fully charged cell phone.	9:00:00 AM	12:00:00 PM	Preston Hollow Park	6600 Park Lane	Dallas	TX	75225	6/16/2018		8
    Craig	Beuerlein	cdbuilds@gmail.com	2147999727	Canvass	Canvass for Beto | Dallas	We will be knocking on doors to identify Beto supporters in our community. Please RSVP to join us! Please make sure to register for Polis, our canvassing app, at betofortexas.com/knock and come prepared with a fully charged cell phone.	9:00:00 AM	12:00:00 PM	Preston Hollow Park	6600 Park Lane	Dallas	TX	75225	6/23/2018		8
    Hollis	Stair	hollis.stair@gmail.com	9728221601	Canvass	Canvass for Beto | Richardson	We will be knocking on doors to identify Beto supporters in our community. Please RSVP to join us! Please make sure to register for Polis, our canvassing app, at betofortexas.com/knock and come prepared with a fully charged cell phone.	10:00:00 AM	1:00:00 PM	Stair Residence	607 Dublin Dr	Richardson	TX	75080	6/27/2018		15
    Sam	Bortnick	sam.lens@gmail.com	2144360985	Phonebank	Phonebank for Beto | Dallas	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone. Refreshments, chips, and popcorn will be provided, as well as beer for volunteers who have reached the legal drinking age of 21 in the State of Texas.	6:00:00 PM	9:00:00 PM	Private Residence	3617 Routh St	Dallas	TX	75219	6/10/2018		4
    Sam	Bortnick	sam.lens@gmail.com	2144360985	Phonebank	Phonebank for Beto | Dallas	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone. Refreshments, chips, and popcorn will be provided, as well as beer for volunteers who have reached the legal drinking age of 21 in the State of Texas.	6:00:00 PM	9:00:00 PM	Private Residence	3617 Routh St	Dallas	TX	75219	6/17/2018		4
    Sam	Bortnick	sam.lens@gmail.com	2144360985	Phonebank	Phonebank for Beto | Dallas	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone. Refreshments, chips, and popcorn will be provided, as well as beer for volunteers who have reached the legal drinking age of 21 in the State of Texas.	6:00:00 PM	9:00:00 PM	Private Residence	3617 Routh St	Dallas	TX	75219	6/24/2018		4
    Ron	Taussig	slugtamer@sbcglobal.net	2147270876	Phonebank	Phonebank for Beto | Dallas	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone.	7:00:00 PM	9:00:00 PM	Taussig Residence	7323 Azalea Ln	Dallas	TX	75230	6/14/2018		8
    Ron	Taussig	slugtamer@sbcglobal.net	2147270876	Phonebank	Phonebank for Beto | Dallas	Join us for a phonebank to make calls to Texas voters and identify Beto supporters all across the state! Please bring your laptop and cell phone.	7:00:00 PM	9:00:00 PM	Taussig Residence	7323 Azalea Ln	Dallas	TX	75230	6/28/2018		8
    Alex	McCreight	akmccreight944@gmail.com	3162588523	Canvass	Canvass for Beto | Dallas	We will be knocking on doors to identify Beto supporters in our community. Please RSVP to join us! Please make sure to register for Polis, our canvassing app, at betofortexas.com/knock and come prepared with a fully charged cell phone.	9:00:00 AM	12:00:00 PM	Glencoe Park	3700 Glencoe St	Dallas	TX	75206	6/16/2018		0
    Alex	McCreight	akmccreight944@gmail.com	3162588523	Canvass	Canvass for Beto | Dallas	We will be knocking on doors to identify Beto supporters in our community. Please RSVP to join us! Please make sure to register for Polis, our canvassing app, at betofortexas.com/knock and come prepared with a fully charged cell phone.	9:00:00 AM	12:00:00 PM	Glencoe Park	3700 Glencoe St	Dallas	TX	75206	6/30/2018		0
    Alex	McCreight	akmccreight944@gmail.com	3162588523	Canvass	Canvass for Beto | Dallas	We will be knocking on doors to identify Beto supporters in our community. Please RSVP to join us! Please make sure to register for Polis, our canvassing app, at betofortexas.com/knock and come prepared with a fully charged cell phone.	9:00:00 AM	12:00:00 PM	Glencoe Park	3700 Glencoe St	Dallas	TX	75206	7/14/2018		0]
    |> String.split("\n")
    |> Enum.map(&rerun/1)
  end

  def client,
    do:
      OsdiClient.build_client(
        Application.get_env(:admin, :osdi_base_url),
        Application.get_env(:admin, :osdi_api_token)
      )
end
