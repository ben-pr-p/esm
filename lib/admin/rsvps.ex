defmodule Rsvps do
  def csv_for(id) do
    IO.inspect id
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
            List.first(p.email_addresses) |> Map.get(:address),
            List.first(p.phone_numbers) |> Map.get(:number),
            ""
          ],
          ","
        )
      end)

    ["Name,Email,Phone,Ref Code"]
    |> Enum.concat(csv_content)
    |> Enum.join("\n")
  end
end
