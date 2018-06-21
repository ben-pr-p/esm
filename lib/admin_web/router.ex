defmodule Admin.Router do
  use Admin, :router

  pipeline :browser_admin do
    plug(:accepts, ["html"])
    plug(:fetch_session)
    plug(:fetch_flash)
    plug(:protect_from_forgery)
    plug(:put_secure_browser_headers)
    plug(Guardian.Plug.VerifySession)
    plug(Guardian.Plug.LoadResource)

    plug(:put_layout, {Admin.LayoutView, :admin})
  end

  pipeline :browser_form do
    plug(:accepts, ["html"])
    plug(:fetch_session)
    plug(:fetch_flash)
    # plug(:protect_from_forgery)
    plug(:put_secure_browser_headers)

    plug(:put_layout, {Admin.LayoutView, :form})
  end

  pipeline :api do
    plug(:accepts, ["json"])
  end

  scope "/", Admin do
    pipe_through(:browser_admin)

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

  scope "/", Admin do
    pipe_through(:browser_form)

    get("/event/host", FormController, :form_one)
    post("/event/host", FormController, :form_one_submit)
    get("/event/create", FormController, :form_two)
    post("/event/create", FormController, :form_two_submit)
    get("/event/directpublish", FormController, :direct_publish)
    post("/event/directpublish", FormController, :direct_publish_submit)
    get("/events/thanks", FormController, :thanks)
    get("/event/clear-session-redirect", FormController, :clear_session_redirect)
  end

  scope "/api", Admin do
    pipe_through(:api)

    get("/events", PageController, :events_api)
    get("/events-internal", PageController, :internal_events_api)
    post("/events/create", FormController, :create)

    get("/update/cosmic", PageController, :update_cosmic)
    post("/update/cosmic", PageController, :update_cosmic)
  end

  defp handle_errors(_conn, %{kind: kind, reason: reason, stack: stacktrace}) do
    Rollbax.report(kind, reason, stacktrace)
  end
end
