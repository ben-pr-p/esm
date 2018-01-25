defmodule MyCipher do
  def decrpyt(string) do
    case MyCipher.decrypt(string) do
      "" -> Admin.OldSecrets.decrypt(string)
      decrypted -> decrypted
    end
  end
end
