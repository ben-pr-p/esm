defmodule Admin.OldSecrets do
  import ShortMaps

  def collection, do: "old_secrets_#{Application.get_env(:admin, :instance, "jd")}"

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
      |> Enum.map(fn event = ~m(id browser_url)a ->
        obfuscated = String.split(browser_url, "/") |> List.last()
        {"#{obfuscated}", event}
      end)
      |> Enum.into(%{})

    kvs =
      File.read!(path)
      |> String.replace("\uFEFF", "")
      |> String.split("\n")
      |> Enum.flat_map(fn line -> extract_keys(line, events) end)
      |> Enum.to_list()
      |> Enum.each(fn kv -> upload(kv) |> IO.inspect() end)
  end

  def extract_keys(line, events) do
    [obfuscated, event_id_encrypted, organizer_id_encrypted] =
      case String.trim(line) |> String.split(",") do
        [a,b,c] -> [a,b,c]
        [a,b] -> [a | String.split(b, ~s("))]
      end
    IO.inspect obfuscated
    id = events[obfuscated].id
    organizer_id = events[obfuscated].organizer_id

    [
      %{"key" => ensure_double(event_id_encrypted), "value" => id},
      %{"key" => ensure_double(organizer_id_encrypted), "value" => organizer_id}
    ]
  end

  def ensure_double(string) do
    if String.ends_with?(string, "%3D%3D") do
      string
    else
      string <> "%3D"
    end
  end
end
