defmodule Admin.EditLogs do
  import ShortMaps
  @instance Application.get_env(:admin, :instance, "jd")

  def collection, do: "esm_actions_#{@instance}"

  def get_for(event_id) do
    Mongo.find(:mongo, collection(), ~m(event_id))
    |> Enum.map(&Map.drop(&1, ["_id"]))
  end
end
