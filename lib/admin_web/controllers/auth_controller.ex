defmodule Admin.AuthController do
  use Admin, :controller
  plug(Ueberauth)

  alias Guardian.Plug
  alias Admin.{Repo}

  def callback(%{assigns: %{ueberauth_auth: auth}} = conn, _params) do
    case authenticate(auth) do
      {:ok, user} ->
        conn = Plug.sign_in(conn, user)

        conn
        |> redirect(to: "/events")

      {:error, email} when is_binary(email) ->
        json(conn, %{error: "Use your JD email #{email}!"})
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

    case String.match?(email, ~r/@justicedemocrats.com$/) do
      true ->
        {:ok, %{email: email, google_id: uid}}

      _ ->
        {:error, email}
    end
  end
end
