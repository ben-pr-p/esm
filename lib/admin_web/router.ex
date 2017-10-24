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

    get("/events", PageController, :events)
    get("/events/esm", PageController, :esm)
    get("/events/list", PageController, :list)

    get("/my-events/:token", PageController, :my_events)

    get("/rsvps/:encrypted", PageController, :rsvps)
  end
end
