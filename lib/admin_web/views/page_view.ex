defmodule Admin.PageView do
  use Admin, :view

  def js_script_tag(filename) do
    base = Application.get_env(:admin, :script_tag_base) || "/js/"
    src = base <> filename
    ~s(<script src="#{src}"></script>)
  end
end
