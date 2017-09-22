defmodule Admin.Webhooks do
  require Logger

  def on("confirmed", %{event: event, team_member: team_member}) do
    %{"metadata" => %{"event_publish" => hook}} = Cosmic.get("event-webhooks")
    IO.inspect HTTPotion.post(hook, bodify(%{event: event, team_member: team_member}))
  end

  def on("rejected", %{event: event, reason: reason, team_member: team_member}) do
    %{"metadata" => %{"event_rejected" => hook}} = Cosmic.get("event-webhooks")
    IO.inspect HTTPotion.post(hook, bodify(%{event: event, reason: reason, team_member: team_member}))
  end

  def on("cancelled", %{event: event, team_member: team_member}) do
    %{"metadata" => %{"event_cancelled" => hook}} = Cosmic.get("event-webhooks")
    IO.inspect HTTPotion.post(hook, bodify(%{event: event, team_member: team_member}))
  end

  def on("tentative", %{event: event, team_member: team_member}) do
    %{"metadata" => %{"event_unpublished" => hook}} = Cosmic.get("event-webhooks")
    IO.inspect HTTPotion.post(hook, bodify(%{event: event, team_member: team_member}))
  end

  def on("edit", %{event: event, edits: edits}) do
    %{"metadata" => %{"event_edited" => hook}} = Cosmic.get("event-webhooks")
    IO.inspect HTTPotion.post(hook, bodify(%{event: event, edits: edits}))
  end

  def on(other, %{event: event, team_member: _team_member}) do
    Logger.info "Untracked status change: #{other}, for event: #{inspect(event)}"
  end

  defp bodify(body), do: [body: Poison.encode!(body)]
end
