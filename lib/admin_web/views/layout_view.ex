defmodule Admin.LayoutView do
  use Admin, :view

  def js_script_tag do
    ~s(<script src="/js/app.js"></script>)
  end

  def css_link_tag do
    ~s(<link rel="stylesheet" type="text/css" href="/css/app.css" media="screen,projection" />)
  end
end
