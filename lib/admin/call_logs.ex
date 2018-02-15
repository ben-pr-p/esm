defmodule Admin.CallLogs do
  import ShortMaps
  @instance Application.get_env(:admin, :instance, "jd")

  def collection, do: "call_logs_#{@instance}"

  def get_for(event_id) do
    Mongo.find(:mongo, collection(), ~m(event_id))
    |> Enum.map(&Map.drop(&1, ["_id"]))
  end

  def add_to(record = ~m(event_id note actor)) do
    timestamp = DateTime.utc_now() |> DateTime.to_iso8601()
    Mongo.insert_one(:mongo, collection(), Map.merge(record, ~m(timestamp)))
  end
end
