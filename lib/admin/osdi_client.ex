defmodule OsdiClient do
  use Tesla
  import ShortMaps

  def build_client(base, osdi_api_token) do
    Tesla.build_client([
      {Tesla.Middleware.JSON, [engine: Poison, engine_opts: [keys: :atoms]]},
      {Tesla.Middleware.Headers, %{"OSDI-API-Token" => osdi_api_token}},
      {Tesla.Middleware.BaseUrl, base}
    ])
    |> IO.inspect()
  end

  def stream(client, url) do
    %{body: first_response} = get(client, url)
    Stream.unfold({client, first_response, 0}, &unfolder/1)
  end

  def unfolder({client, prev_response, next_idx}) do
    case item_at_idx(prev_response, next_idx) do
      {:ok, item} ->
        {item, {client, prev_response, next_idx + 1}}

      {:error, :out_of_items} ->
        if is_last_page(prev_response) do
          nil
        else
          next_url =
            get_in(prev_response, ~w(_links next href)a) |> String.split("/") |> List.last()

          %{body: next_request} = get(client, next_url)
          unfolder({client, next_request, 0})
        end
    end
  end

  def item_at_idx(body, idx) do
    case Enum.at(extract_embedded_items(body), idx) do
      nil -> {:error, :out_of_items}
      m when is_map(m) -> {:ok, m}
    end
  end

  def extract_embedded_items(body) do
    key =
      body._embedded
      |> Map.keys()
      |> Enum.filter(fn key -> Atom.to_string(key) |> String.starts_with?("osdi:") end)
      |> List.first()

    get_in(body, [:_embedded, key])
  end

  def is_last_page(~m(total_pages page)a) do
    total_pages == page
  end
end
