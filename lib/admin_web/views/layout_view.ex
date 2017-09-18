defmodule Admin.LayoutView do
  use Admin, :view

  def js_script_tag(filename) do
    base = Application.get_env(:admin, :script_tag_base) || "/js/"
    src = base <> filename
    ~s(<script src="#{src}"></script>)
  end

  def css_link_tag do
    case Application.get_env(:admin, :css_tag) do
      something -> something
      nil -> ~s(<link rel="stylesheet" type="text/css" href="/css/app.css" media="screen,projection" />)
    end
  end
end
