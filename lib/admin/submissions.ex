defmodule Esm.Submissions do
  import ShortMaps

  def start(submission = ~m(first_name last_name email phone zip type)) do
    data = %{
      "type" => type,
      "contact" => %{
        "given_name" => first_name,
        "last_name" => last_name,
        "email_address" => email_address,
        "phone_number" => phone
      }
    }

    created_at = Timex.now()
    status = "in_progress"
    source = submission["source"]
    Mongo.insert_one!(:mongo, "submissions", ~m(source data created_at status))
  end

  def complete(submission_id, data) do
    Mongo.update_one!(:mongo, "submissions", %{"_id" => submission_id}, %{
      "$set" => %{
        "data" => data,
        "status" => "awaiting_creation"
      }
    })
  end

  def start_and_complete(data) do
    %{"_id" => submission_id} =
      data
      |> Map.merge(%{"source" => "directpublish"})
      |> start()

    complete(submission_id, data)
  end

  def create_events do
    Mongo.find(:mongo, %{"status" => "awaiting_creation"})
    |> Stream.map(&create_event/1)
    |> Stream.run()
  end

  def create_event(submission = ~m(data)) do
    case OsdiClient.post(OsdiClient.client(), "events", data) do
      %{body: ~m(id)} ->
        Mongo.update_one!(:mongo, "submissions", %{"_id" => submission["_id"]}, %{
          "$set" => %{
            "status" => "created",
            "event_id" => id
          }
        })

      %{body: error} ->
        Mongo.update_one!(:mongo, "submissions", %{"_id" => submission["_id"]}, %{
          "$set" => %{
            "status" => "failed",
            "error" => error
          }
        })
    end
  end

  def handle_abandons do
    Mongo.find(:mongo, "submissions", %{
      "status" => "awaiting_creation",
      "created_at" => %{
        "$lt" => Timex.now() |> Timex.shift(minutes: -15)
      }
    })
    |> Stream.map(&handle_abandon/1)
    |> Stream.run()
  end
end
