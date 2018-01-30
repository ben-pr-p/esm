defmodule MyCipher do
  def decrypt(string) do
    case Cipher.decrypt(string) do
      "" ->
        IO.puts "cipher could not decrypt. must be old secret"
        Admin.OldSecrets.decrypt(string) |> IO.inspect()
      decrypted ->
        IO.puts "cipher decrypted to #{decrypted}"
        decrypted
    end
  end
end
