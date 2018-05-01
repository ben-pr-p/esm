defmodule Rsvps do
  def csv_for(id) do
    all_attendances = OsdiClient.stream(client(), "events/#{id}/attendances")

    people_sources =
      Enum.reduce(all_attendances, %{}, fn attendance, acc ->
        Map.put(acc, attendance.person, get_in(attendance, ~w(referrer_data source)a))
      end)

    people_ids = Enum.map(all_attendances, & &1.person) |> MapSet.new()

    people_fetch_tasks =
      Enum.map(
        people_ids,
        &Task.async(fn ->
          %{body: body} = OsdiClient.get(client(), "people/#{&1}")
          Map.put(body, :id, &1)
        end)
      )

    people = Enum.map(people_fetch_tasks, fn t -> Task.await(t, :infinity) end)

    csv_content =
      Enum.map(people, fn p ->
        Enum.join(
          [
            Enum.join([p.given_name, p.family_name], " "),
            List.first(p.email_addresses) |> get_email(),
            List.first(p.phone_numbers) |> get_number(),
            Map.get(p, :postal_addresses, []) |> List.first() |> get_zip(),
            Map.get(people_sources, p.id)
          ],
          ","
        )
      end)

    ["Name,Email,Phone,Zip,Source"]
    |> Enum.concat(csv_content)
    |> Enum.join("\n")
  end

  def emails_for(id) do
    all_attendances = OsdiClient.stream(client(), "events/#{id}/attendances")
    people_ids = Enum.map(all_attendances, & &1.person)

    people_ids
    |> Enum.map(
      &Task.async(fn ->
        %{body: body} = OsdiClient.get(client(), "people/#{&1}")
        body
      end)
    )
    |> Enum.map(fn t -> Task.await(t, :infinity) end)
    |> Enum.map(&(List.first(&1.email_addresses) |> get_email()))
  end

  defp get_email(nil), do: ""
  defp get_email(map), do: Map.get(map, :address, "")
  defp get_number(nil), do: ""
  defp get_number(map), do: Map.get(map, :number, "")
  defp get_zip(nil), do: ""
  defp get_zip(map), do: Map.get(map, :postal_code, "")

  def client,
    do:
      OsdiClient.build_client(
        Application.get_env(:admin, :osdi_base_url),
        Application.get_env(:admin, :osdi_api_token)
      )
end
