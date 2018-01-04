defmodule Rsvps do
  def csv_for(id) do
    all_attendances = Proxy.stream("events/#{id}/rsvps")
    people_ids = Enum.map(all_attendances, & &1.person)

    people_fetch_tasks = Enum.map(people_ids, &Task.async(fn ->
      %{body: body} = Proxy.get("people/#{&1}")
      body
    end))
    people = Enum.map(people_fetch_tasks, &Task.await/1)

    csv_content =
      Enum.map(people, fn p ->
        Enum.join(
          [
            Enum.join([p.given_name, p.family_name], " "),
            List.first(p.email_addresses) |> get_email(),
            List.first(p.phone_numbers) |> get_number(),
            ""
          ],
          ","
        )
      end)

    ["Name,Email,Phone,Ref Code"]
    |> Enum.concat(csv_content)
    |> Enum.join("\n")
  end

  defp get_email(nil), do: ""
  defp get_email(map), do: Map.get(map, :address, "")
  defp get_number(nil), do: ""
  defp get_number(map), do: Map.get(map, :number, "")
end
