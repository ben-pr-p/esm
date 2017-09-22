use Mix.Config

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :admin, Admin.Endpoint,
  http: [port: 4001],
  server: false

# Cipher
config :cipher,
  keyphrase: "testiekeyphraseforcipher",
  ivphrase: "testieivphraseforcipher",
  magic_token: "magictoken"

config :osdi, Osdi.Repo,
  adapter: Ecto.Adapters.Postgres,
  database: "osdi_repo",
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  types: GeoExample.PostgresTypes

# Print only warnings and errors during test
config :logger, level: :warn
