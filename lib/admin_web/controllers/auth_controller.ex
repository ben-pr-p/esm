defmodule Admin.AuthController do
  use Admin, :controller
  plug(Ueberauth)

  @cosmic_config_slug Application.get_env(:admin, :cosmic_info_slug)
  @whitelist_domain Application.get_env(:admin, :whitelist_domain)

  alias Guardian.Plug
  alias Admin.{Repo}

  def callback(%{assigns: %{ueberauth_auth: auth}} = conn, _params) do
    case authenticate(auth) do
      {:ok, user} ->
        conn
        |> Plug.sign_in(user)
        |> redirect(to: "/")

      {:error, email} when is_binary(email) ->
        json(conn, %{
          error: "Use your JD email #{email}, or request to be whitelisted from your JD contact"
        })
    end
  end

  def index(conn, _params) do
    redirect(conn, to: "/auth/google")
  end

  def delete(conn, _params) do
    conn
    |> Plug.sign_out()
    |> put_flash(:info, "Signed out")
    |> redirect(to: "/")
  end

  defp authenticate(%{info: info, uid: uid}) do
    email = Map.get(info, :email)

    cond do
      String.contains?(email, @whitelist_domain) -> {:ok, %{email: email, google_id: uid}}
      is_on_whitelist(email) -> {:ok, %{email: email, google_id: uid}}
      true -> {:error, email}
    end
  end

  defp is_on_whitelist(email) do
    %{"metadata" => %{"user_whitelist" => whitelist}} = Cosmic.get(@cosmic_config_slug)
    whitelisted = String.split(whitelist, "\n")
    Enum.member?(whitelisted, email)
  end
end
