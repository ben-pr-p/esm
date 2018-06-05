defmodule Migrations.SetInstructions do
  import ShortMaps

  @wait_period 10000

  def go do
    EventMirror.all()
    |> Enum.filter(&is_in_future/1)
    |> Enum.each(&change_and_wait/1)
  end

  def is_in_future(~m(start_date)a) do
    {:ok, dt, _} = DateTime.from_iso8601(start_date)
    Timex.before?(Timex.now(), dt)
  end

  def change_and_wait(event) do
    EventMirror.edit(event.id, extract_instruction_edit(event))
    :timer.sleep(@wait_period)
    IO.puts("Did #{event.id}")
  end

  def extract_instruction_edit(%{contact: contact}) do
    %{
      instructions:
        "If you have questions, please contact your host, #{Map.get(contact, :name)}, who can be reached at #{
          Map.get(contact, :email_address)
        } or #{Map.get(contact, :phone_number)}."
    }
  end
end
