defmodule Admin.Mixfile do
  use Mix.Project

  def project do
    [
      app: :admin,
      version: "0.1.10",
      elixir: "~> 1.5",
      elixirc_paths: elixirc_paths(Mix.env()),
      compilers: [:phoenix, :gettext] ++ Mix.compilers(),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps()
    ]
  end

  # Configuration for the OTP application.
  #
  # Type `mix help compile.app` for more information.
  def application do
    [
      mod: {Admin.Application, []},
      extra_applications: [
        :logger,
        :runtime_tools,
        :ueberauth_google,
        :guardian
      ]
    ]
  end

  # Specifies which paths to compile per environment.
  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  # Specifies your project dependencies.
  #
  # Type `mix help deps` for examples and options.
  defp deps do
    [
      {:phoenix, "~> 1.3.0"},
      {:phoenix_pubsub, "~> 1.0"},
      {:phoenix_html, "~> 2.10"},
      {:phoenix_live_reload, "~> 1.0", only: :dev},
      {:gettext, "~> 0.11"},
      {:cowboy, "~> 1.0"},
      {:cosmic, git: "https://github.com/BrandNewCongress/cosmic_ex.git"},
      {:maps, git: "https://github.com/justicedemocrats/maps_ex.git"},
      {:ueberauth_google, "~> 0.5"},
      {:guardian, "~> 0.14"},
      {:distillery, "~> 1.0.0"},
      {:cipher, ">= 1.3.3"},
      {:quantum, ">= 2.1.0"},
      {:httpotion, "~> 3.0.2"},
      {:mongodb, "~> 0.4.3"},
      {:timex, "~> 3.1"},
      {:short_maps, "~> 0.1.2"},
      {:flow, "~> 0.11"}
    ]
  end

  # Aliases are shortcuts or tasks specific to the current project.
  # For example, to create, migrate and run the seeds file at once:
  #
  #     $ mix ecto.setup
  #
  # See the documentation for `Mix` for more info on aliases.
  defp aliases do
    [
      "webpacker.setup": [
        "deps.get",
        "webpacker.frontend",
        "ecto.create",
        "run priv/repo/seeds.exs"
      ]
    ]
  end
end
