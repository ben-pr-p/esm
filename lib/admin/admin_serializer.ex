defmodule Admin.GuardianSerializer do
  @behaviour Guardian.Serializer

  def for_token(%{email: email}), do: {:ok, "email:#{email}"}
  def for_token(_), do: {:error, "Unknown resource type"}

  def from_token("email:" <> email), do: {:ok, email}
  def from_token(_), do: {:error, "Unknown resource type"}
end
