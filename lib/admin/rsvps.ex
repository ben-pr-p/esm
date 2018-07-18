defmodule Rsvps do
  require Logger
  alias NimbleCSV.RFC4180, as: CSV

  @batch_size 20

  def stream_csv_for(id) do
    all_attendances = OsdiClient.stream(client(), "events/#{id}/attendances")

    people_ids = Enum.map(all_attendances, & &1.person) |> MapSet.new()

    Logger.info("Fetched #{MapSet.size(people_ids)} people ids")

    row_stream =
      Stream.chunk_every(people_ids, @batch_size)
      |> Stream.map(fn chunk ->
        Enum.map(
          chunk,
          &Task.async(fn ->
            %{body: body} = OsdiClient.get(client(), "people/#{&1}")
            Map.put(body, :id, &1)
          end)
        )
      end)
      |> Stream.flat_map(fn tasks ->
        Enum.map(tasks, fn t ->
          p = Task.await(t, :infinity)

          res = [
            Enum.join([p.given_name, p.family_name], " "),
            p.phone_numbers |> Enum.filter(&has_number/1) |> List.first() |> get_number()
          ]
        end)
      end)

    csv_stream = Stream.concat([["Name", "Phone"]], row_stream)

    CSV.dump_to_stream(csv_stream)
    |> Stream.map(&IO.iodata_to_binary/1)
  end

  def csv_for(id) do
    all_attendances = OsdiClient.stream(client(), "events/#{id}/attendances")

    people_ids = Enum.map(all_attendances, & &1.person) |> MapSet.new()

    Logger.info("Fetched #{MapSet.size(people_ids)} people ids")

    people_fetch_tasks =
      Enum.map(
        people_ids,
        &Task.async(fn ->
          %{body: body} = OsdiClient.get(client(), "people/#{&1}")
          Map.put(body, :id, &1)
        end)
      )

    Logger.info("Done fetching people details")

    people = Enum.map(people_fetch_tasks, fn t -> Task.await(t, :infinity) end)

    csv_content =
      Enum.map(people, fn p ->
        Enum.join(
          [
            Enum.join([p.given_name, p.family_name], " "),
            p.phone_numbers |> Enum.filter(&has_number/1) |> List.first() |> get_number()
          ],
          ","
        )
      end)

    ["Name,Phone"]
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
  defp has_number(nil), do: false
  defp has_number(map), do: is_binary(map.number) and map.number != ""
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
