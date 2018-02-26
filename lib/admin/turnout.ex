defmodule Turnout do
  import ShortMaps

  def survey_for_event(event_id) do
    get_survey_id_for_event(event_id)
    |> fetch_survey_fields()
  end

  def get_survey_id_for_event(event_id) do
    %{body: event} = Ak.Api.get("event/#{event_id}") |> IO.inspect()

    event["fields"]
    |> Enum.filter(fn ~m(name) -> name == "survey_id" end)
    |> List.first()
    |> (&if(&1 == nil, do: nil, else: &1["value"])).()
  end

  def fetch_survey_fields(nil) do
    nil
  end

  def fetch_survey_fields(survey_id) do
    %{body: ~m(fields)} = Ak.Api.get("surveyaction/#{survey_id}")
    fields
  end

  def edit_survey_for_event(event_id, changes) do
    survey_id = get_survey_id_for_event(event_id)
    old_survey = fetch_survey_fields(survey_id)

    new_fields = Map.merge(old_survey, changes)
    Ak.Api.put("surveyaction/#{survey_id}", body: %{"fields" => new_fields})

    new_survey = fetch_survey_fields(survey_id)

    spawn(fn ->
      %{body: event} = OsdiClient.get(Admin.EventsChannel.client(), "events/#{event_id}")
      IO.inspect(event)
      candidate = event.tags |> Enum.filter(&is_candidate_tag/1) |> extract_candidate()

      Admin.Webhooks.on(
        "turnout_request_edit",
        ~m(event old_survey new_survey changes candidate)a
      )
    end)

    new_survey
  end

  def is_candidate_tag("Calendar: " <> candidate) do
    not Enum.member?(["Brand New Congress", "Justice Democrats", "Local Chapter"], candidate)
  end

  def is_candidate_tag(_other) do
    false
  end

  def extract_candidate(["Calendar: " <> candidate | _]), do: candidate
  def extract_candiate(_other), do: nil
end
