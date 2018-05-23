defmodule Admin.FormView do
  use Admin, :view
  import ShortMaps

  def js_script_tag(filename) do
    base = Application.get_env(:admin, :script_tag_base) || "/js/"
    src = base <> filename
    ~s(<script src="#{src}"></script>)
  end

  def thanks_html do
    %{"metafields" => ~m(thanks)} = Cosmic.get(Application.get_env(:admin, :cosmic_config_slug))
    thanks
  end

  def intro_html do
    %{"metafields" => ~m(introduction)} =
      Cosmic.get(Application.get_env(:admin, :cosmic_config_slug))

    introduction
  end
end
