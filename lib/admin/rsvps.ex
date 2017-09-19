defmodule Rsvps do
  import Ecto.Query
  alias Osdi.{Event, Repo}

  def csv_for(name) do
    csv_content =
      (from e in Event, where: e.name == ^name, preload: [attendances: [person: [:email_addresses, :phone_numbers]]])
      |> Repo.all()
      |> Enum.take(1)
      |> List.first()
      |> Map.get(:attendances)
      |> Enum.map(&extract_person/1)

    ["Name,Email,Phone"]
    |> Enum.concat(csv_content)
    |> Enum.join("\n")
  end

  defp extract_person(%{person:
    %{given_name: given_name, family_name: family_name,
      email_addresses: email_addresses, phone_numbers: phone_numbers}}) do

    primary_email =
      email_addresses
      |> Enum.filter(&(&1.primary))
      |> Enum.map(&(&1.address))
      |> List.first()

    primary_phone =
      phone_numbers
      |> Enum.filter(&(&1.primary))
      |> Enum.map(&(&1.number))
      |> List.first()

    full_name = Enum.join [given_name, family_name], " "
    Enum.join [full_name, primary_email, primary_phone], ","
  end
end
