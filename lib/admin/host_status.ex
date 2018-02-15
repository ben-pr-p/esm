defmodule Admin.HostStatus do
  import ShortMaps
  @instance Application.get_env(:admin, :instance, "jd")

  def collection, do: "host_status-#{@instance}"

  def get_all() do
    Mongo.find(:mongo, collection(), %{})
    |> Enum.map(&Map.drop(&1, ["_id"]))
  end

  def get_for(event_id) do
    Mongo.find_one(:mongo, collection(), ~m(event_id))
  end

  def set_for(event_id, result) do
    Mongo.update_many(:mongo, collection(), ~m(event_id), %{"$set" => ~m(result)}, upsert: true)
  end
end
