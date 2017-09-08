# This file is responsible for configuring your application
# and its dependencies with the aid of the Mix.Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.
use Mix.Config

# General application configuration
config :admin,
  ecto_repos: [Osdi.Repo]

# Configures the endpoint
config :admin, Admin.Endpoint,
  url: [host: "localhost"],
  secret_key_base: "bfsqn9AcIMywYeFfFrwwtpRis6Jda9AQdRrc20qyXzQlB4oBV/FA+Isy4jDAB77n",
  render_errors: [view: Admin.ErrorView, accepts: ~w(html json)],
  pubsub: [name: Admin.PubSub,
           adapter: Phoenix.PubSub.PG2]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

config :cosmic, slug: "brand-new-congress"

config :ueberauth, Ueberauth,
  providers: [
    google: {Ueberauth.Strategy.Google, [
        approval_prompt: "force",
        access_type: "offline",
        default_scope: "email profile",
        hd: System.get_env("HOSTED_DOMAIN"),
      ]}
  ]

config :ueberauth, Ueberauth.Strategy.Google.OAuth,
  client_id: System.get_env("GOOGLE_CLIENT_ID"),
  client_secret: System.get_env("GOOGLE_CLIENT_SECRET")

config :guardian, Guardian,
  allowed_algos: ["HS512"], # optional
  verify_module: Guardian.JWT,  # optional
  issuer: "MyApp",
  ttl: { 30, :days },
  allowed_drift: 2000,
  verify_issuer: true, # optional
  secret_key: %{
    "k" => "_AbBL082GKlPjoY9o-KM78PhyALavJRtZXOW7D-ZyqE",
    "kty" => "oct"
  },
  serializer: Admin.GuardianSerializer


# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{Mix.env}.exs"
