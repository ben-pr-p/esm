defmodule Esm.Submissions do
  import ShortMaps
  require Logger

  @abandon_minutes 20

  def start(submission = ~m(first_name last_name email phone zip type)) do
    data = %{
      "type" => type,
      "contact" => %{
        "name" => "#{first_name} #{last_name}",
        "email_address" => email,
        "phone_number" => phone,
        "zip" => zip
      }
    }

    created_at = Timex.now()
    status = "in_progress"
    source = submission["source"]

    Mongo.insert_one!(:mongo, "submissions", ~m(source data created_at status))
    |> from_inserted_result()
  end

  def get_fragment(submission_id) do
    Mongo.find_one(:mongo, "submissions", to_id_query(submission_id))
  end

  def get_all_non_created do
    Mongo.find(:mongo, "submissions", %{"status" => %{"$ne" => "created"}})
    |> Enum.map(&replace_with_standard_id/1)
  end

  def complete(submission_id, data) do
    %{"data" => fragment} = Mongo.find_one(:mongo, "submissions", to_id_query(submission_id))

    Mongo.update_one!(:mongo, "submissions", %{"_id" => BSON.ObjectId.decode!(submission_id)}, %{
      "$set" => %{
        "data" => Map.merge(fragment, data),
        "status" => "awaiting_creation"
      }
    })

    :timer.apply_after(50, Esm.Submissions, :create_events, [])
  end

  def start_and_complete(data) do
    %{"_id" => submission_id} =
      data
      |> Map.merge(%{"source" => "directpublish"})
      |> start()

    complete(submission_id, data)
  end

  def create_events do
    Mongo.find(:mongo, "submissions", %{"status" => "awaiting_creation"})
    |> Stream.map(&create_event/1)
    |> Stream.run()
  end

  def create_event(submission = ~m(data)) do
    IO.inspect(submission)

    case OsdiClient.post(OsdiClient.client(), "events", data, timeout: 200_000) do
      %{body: ~m(id)a} ->
        Logger.info("Successfully created event #{id}")

        Mongo.update_one!(:mongo, "submissions", %{"_id" => submission["_id"]}, %{
          "$set" => %{
            "status" => "created",
            "event_id" => id
          }
        })

      %{body: error} ->
        Logger.error("Failed to create event: #{inspect(error)}")

        Mongo.update_one!(:mongo, "submissions", %{"_id" => submission["_id"]}, %{
          "$set" => %{
            "status" => "failed",
            "error" => error
          }
        })
    end
  end

  def from_inserted_result(%{inserted_id: obj_id}), do: BSON.ObjectId.encode!(obj_id)
  def to_id_query(id), do: %{"_id" => BSON.ObjectId.decode!(id)}

  def replace_with_standard_id(obj = %{"_id" => id}) do
    obj
    |> Map.drop(["_id"])
    |> Map.put("id", BSON.ObjectId.encode!(id))
  end

  def reset_failures do
    Mongo.update_many(:mongo, "submissions", %{"status" => "failed"}, %{
      "$set" => %{"status" => "awaiting_creation"}
    })
  end

  def handle_abandons do
    Mongo.find(:mongo, "submissions", %{
      "status" => "in_progress",
      "created_at" => %{
        "$lt" => Timex.now() |> Timex.shift(minutes: -1 * @abandon_minutes),
        "$gt" => Timex.now() |> Timex.shift(minutes: -2 * @abandon_minutes)
      }
    })
    |> Stream.map(&handle_abandon/1)
    |> Stream.run()
  end

  def handle_abandon(submission) do
    %{"metadata" => ~m(host_abandon)} =
      Cosmic.get(Application.get_env(:admin, :cosmic_config_slug))

    to_send =
      ~m(id) =
      submission
      |> replace_with_standard_id()

    encoded =
      to_send
      |> Map.put(
        "submission_complete_url",
        Application.get_env(:admin, :deployed_url, "http://localhost:4000/") <>
          "/event/host?submission_id=#{id}"
      )
      |> Poison.encode!()

    HTTPotion.post(host_abandon, body: encoded)
  end
end
