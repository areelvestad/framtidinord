obs           = obslua
source_name   = "Kamera"
save_folder   = ""
interval_secs = 3600  -- 1 hour

function script_description()
  return "Every "..interval_secs..
         "s, takes a snapshot of the named source and saves it as yyyy-mm-dd_HH-MM-SS.jpg"
end

function script_properties()
  local props = obs.obs_properties_create()
  obs.obs_properties_add_text(props, "source_name", "Source Name", obs.OBS_TEXT_DEFAULT)
  obs.obs_properties_add_path(props, "save_folder",
    "Save Folder", obs.OBS_PATH_DIRECTORY, "", nil)
  obs.obs_properties_add_int(props, "interval_secs",
    "Interval (seconds)", 60, 86400, 1)
  return props
end

function script_update(settings)
  source_name   = obs.obs_data_get_string(settings, "source_name")
  save_folder   = obs.obs_data_get_string(settings, "save_folder")
  interval_secs = obs.obs_data_get_int(settings, "interval_secs")
  obs.timer_remove(take_snapshot)
  obs.timer_add(take_snapshot, interval_secs * 1000)
end

function take_snapshot()
  local src = obs.obs_get_source_by_name(source_name)
  if src then
    local ts = os.date("%Y-%m-%d_%H-%M-%S")
    local filename = save_folder .. "/" .. ts .. ".jpg"
    -- flags=0 uses the source’s native resolution
    obs.obs_source_save_source_screenshot(src, filename, 0)
    obs.obs_source_release(src)
  end
end

function script_unload()
  obs.timer_remove(take_snapshot)
end
