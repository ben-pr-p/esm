defmodule Admin.EditLogs do
  import ShortMaps

  def collection, do: "esm_actions_#{Application.get_env(:admin, :instance, "jd")}"

  def get_for(event_id) do
    Mongo.find(:mongo, collection(), ~m(event_id))
    |> Enum.map(&Map.drop(&1, ["_id"]))
  end
end
