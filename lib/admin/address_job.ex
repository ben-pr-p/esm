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
      from(a in Address, where: a.updated_at > ^last_updated)
      |> Repo.all()
      |> Enum.map(&fetch_and_update_coordinates/1)
      |> length()

    Logger.info("Updated #{num_updated} coordinates")
  end

  defp fetch_and_update_coordinates(address = %Address{}) do
    %{
      address_lines: address_lines,
      locality: locality,
      region: region,
      postal_code: postal_code,
      country: country
    } = address

    address_lines_as_string = Enum.join(address_lines, ", ")

    for_google = "#{address_lines_as_string}, #{locality}, #{region}, #{postal_code}, #{country}"

    case Maps.geocode(for_google) do
      {latitude, longitude} -> Address.update_coordinates(address, {latitude, longitude})
      _other -> address
    end
  end

  def fill_missing_fields do
    # |> IO.inspect()
    from(
      a in Address,
      where: is_nil(a.postal_code) or is_nil(a.locality) or is_nil(a.region) or
        is_nil(a.postal_code) or is_nil(a.country)
    )
    |> Repo.all()
    |> inspect_length()
    |> Enum.take(1)
    |> Enum.map(&fill_missings_in_struct/1)
    |> inspect_length()
  end

  defp fill_missings_in_struct(address) do
    [address_lines, locality, region, postal_code, country] =
      ~w(address_lines locality region postal_code country)a
      |> Enum.map(fn key -> Map.get(address, key) || "" end)

    IO.inspect(address)

    to_geocode =
      "#{address_lines |> List.first()}, #{locality}, #{region}, #{country}, #{postal_code}"

    IO.inspect(to_geocode)

    replacements = Maps.fill_address(to_geocode) || %{}

    :timer.sleep(1000)

    changes =
      ~w(address_lines locality region postal_code country)a
      |> Enum.filter(fn key -> Map.get(address, key) == nil end)
      |> Enum.map(fn key -> {key, Map.get(replacements, Atom.to_string(key))} end)
      |> Enum.into(%{})
      |> IO.inspect()

    address
    |> Ecto.Changeset.change(changes)
    |> Repo.update!()
  end

  defp inspect_length(array) do
    IO.inspect(length(array))
    array
  end
end
