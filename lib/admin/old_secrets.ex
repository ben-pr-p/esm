defmodule Admin.OldSecrets do
  import ShortMaps
  @instance Application.get_env(:admin, :instance, "jd")

  def collection, do: "old_secrets_#{@instance}"

  def decrypt(string) do
    case Mongo.find_one(:mongo, collection(), %{"key" => string}) do
      ~m(value) -> value
      _ -> nil
    end
  end

  def upload(~m(key value)) do
    Mongo.insert_one(:mongo, collection(), ~m(key value))
  end

  def upload_from_csv(path) do
    events =
      Proxy.stream("events")
      |> Enum.to_list()
      |> Enum.map(fn event = ~m(id)a -> {"#{id}", event} end)
      |> Enum.into(%{})

    kvs =
      File.stream!(path)
      |> Stream.flat_map(fn line -> extract_keys(line, events) end)
      |> Enum.to_list()
      |> Enum.each(fn kv -> upload(kv) |> IO.inspect() end)
  end

  def extract_keys(line, events) do
    [id, event_id_encrypted, organizer_id_encrypted] = String.trim(line) |> String.split(",")
    organizer_id = events[id].organizer_id

    [
      %{"key" => event_id_encrypted, "value" => id},
      %{"key" => organizer_id_encrypted, "value" => organizer_id}
    ]
  end
end
