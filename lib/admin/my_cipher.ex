defmodule MyCipher do
  def decrypt(string) do
    case Cipher.decrypt(string) do
      "" -> Admin.OldSecrets.decrypt(string) |> IO.inspect()
      decrypted -> decrypted
    end
  end
end
