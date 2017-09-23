defmodule Admin.AddressJob do
  require Logger
  import Ecto.Query
  alias Osdi.{Repo, Address}

  def update_coordinates(first_pass \\ false) do
    last_updated =
      if first_pass do
        Timex.shift(Timex.now(), years: -5)
      else
        Timex.shift(Timex.now(), minutes: -5)
      end

    num_updated =
      (from a in Address, where: a.updated_at > ^last_updated)
      |> Repo.all()
      |> Enum.map(&fetch_and_update_coordinates/1)
      |> length()

    Logger.info "Updated #{num_updated} coordinates"
  end

  defp fetch_and_update_coordinates(address = %Address{}) do
    %{address_lines: address_lines, locality: locality, region: region,
      postal_code: postal_code, country: country} = address

    address_lines_as_string = Enum.join address_lines, ", "

    for_google = "#{address_lines_as_string}, #{locality}, #{region}, #{postal_code}, #{country}"
    case Maps.geocode(for_google) do
      {latitude, longitude} -> Address.update_coordinates(address, {latitude, longitude})
      _other -> address
    end
  end
end
