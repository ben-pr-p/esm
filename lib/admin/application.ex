defmodule Admin.Application do
  use Application

  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  def start(_type, _args) do
    import Supervisor.Spec

    Cosmic.update()

    # Define workers and child supervisors to be supervised
    children = [
      # Start the endpoint when the application starts
      supervisor(Admin.Endpoint, []),
      worker(Admin.Scheduler, []),
      worker(Admin.EditAgent, []),
      worker(Admin.CheckoutAgent, []),
      worker(Mongo, [
        [
          name: :mongo,
          database: "esm",
          username: Application.get_env(:admin, :mongodb_username),
          password: Application.get_env(:admin, :mongodb_password),
          hostname: Application.get_env(:admin, :mongodb_hostname),
          port: Application.get_env(:admin, :mongodb_port)
        ]
      ])
      # Start your own worker by calling: Admin.Worker.start_link(arg1, arg2, arg3)
      # worker(Admin.Worker, [arg1, arg2, arg3]),
    ]

    Application.put_env(
      :ueberauth,
      Ueberauth.Strategy.Google.OAuth,
      client_id: System.get_env("GOOGLE_CLIENT_ID"),
      client_secret: System.get_env("GOOGLE_CLIENT_SECRET")
    )

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Admin.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  def config_change(changed, _new, removed) do
    Admin.Endpoint.config_change(changed, removed)
    :ok
  end
end
