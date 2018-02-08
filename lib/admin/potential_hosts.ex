defmodule PotentialHosts do
  use Agent
  import ShortMaps

  def start_link do
    Agent.start_link(fn -> nil end, name: __MODULE__)
  end

  def get_potential_hosts do
    case Agent.get(__MODULE__, & &1) do
      nil -> Agent.get_and_update(__MODULE__, fn _ ->
          actions = do_get_potential_hosts
          {actions, actions}
        end, 100_000)
      actions ->
        spawn(fn ->
          Agent.update(__MODULE__, fn _ -> do_get_potential_hosts() end, 100_000)
        end)
        Agent.get(__MODULE__, & &1)
      end
  end

  def do_get_potential_hosts do
    [form_one, form_two] =
      [
        Task.async(fn ->
          Ak.Api.stream("action", query: %{page: 753, order_by: "-created_at"})
          |> Enum.to_list()
        end),
        Task.async(fn ->
          Ak.Api.stream("action", query: %{page: 742, order_by: "-created_at"})
          |> Enum.to_list()
        end)
      ]
      |> Enum.map(fn t -> Task.await(t, :infinity) end)
      |> Enum.map(&into_most_recent_per_user/1)

    form_one
    |> Enum.filter(fn {user, %{"created_at" => one_date}} ->
      case form_two[user] do
        nil -> true
        %{"created_at" => two_date} -> Timex.after?(datify(one_date), datify(two_date))
      end
    end)
    |> Flow.from_enumerable()
    |> Flow.map(&format_action/1)
    |> Enum.to_list()
  end

  # action_list is already sorted by date created (recent first)
  def into_most_recent_per_user(action_list) do
    Enum.reduce(action_list, %{}, fn a = ~m(user created_at), acc ->
      Map.update(acc, user, a, & &1)
    end)
  end

  def datify(str) do
    {:ok, d, _} = DateTime.from_iso8601(str <> "Z")
    d
  end

  def format_action({"/rest/v1/user/" <> user_id, action}) do
    %{body: ~m(first_name last_name email phones)} = Ak.Api.get("user/#{user_id}")
    "/rest/v1/phone/" <> phone_id = List.first(phones)
    %{body: ~m(normalized_phone)} = Ak.Api.get("phone/#{phone_id}")

    %{
      "id" => "interest-#{action["id"]}",
      "contact" => %{
        "email_address" => email,
        "phone_number" => normalized_phone,
        "name" => "#{first_name} #{last_name}"
      },
      "type" => get_in(action, ~w(fields type))
    }
  end
end
