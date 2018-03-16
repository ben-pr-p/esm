defmodule Admin.Router do
  use Admin, :router

  pipeline :browser do
    plug(:accepts, ["html"])
    plug(:fetch_session)
    plug(:fetch_flash)
    plug(:protect_from_forgery)
    plug(:put_secure_browser_headers)
  end

  pipeline :browser_auth do
    plug(Guardian.Plug.VerifySession)
    plug(Guardian.Plug.LoadResource)
  end

  pipeline :api do
    plug(:accepts, ["json"])
  end

  scope "/", Admin do
    pipe_through([:browser, :browser_auth])

    get("/auth", AuthController, :index)
    delete("/auth/logout", AuthController, :delete)
    get("/auth/:provider", AuthController, :request)
    get("/auth/:provider/callback", AuthController, :callback)
    post("/auth/:provider/callback", AuthController, :callback)

    get("/", PageController, :index)
    get("/esm", PageController, :esm)
    get("/list", PageController, :list)
    get("/hosts", PageController, :hosts)

    get("/my-events/:token", PageController, :my_events)
    get("/candidate-events/:token", PageController, :candidate_events)

    get("/rsvps/:encrypted", PageController, :rsvps)
  end

  scope "/api", Admin do
    pipe_through(:api)

    get("/events", PageController, :events_api)
    get("/events-internal", PageController, :internal_events_api)
    post("/events/create", FormController, :create)
  end

  defp handle_errors(_conn, %{kind: kind, reason: reason, stack: stacktrace}) do
    Rollbax.report(kind, reason, stacktrace)
  end
end
