// Chocolate Doom's .cfg keys are DOS set-1 scancodes, not ASCII or DOM codes.
export const DOS_KEYS = {
  w: 17,
  s: 31,
  a: 30,
  d: 32,
  e: 18,
  ctrl: 29,
  shift: 54,
  left: 75,
  right: 77,
} as const;
export function nativeConfig() {
  return (
    [
      "use_mouse 1",
      "mouse_sensitivity 5",
      "sfx_volume 8",
      "music_volume 8",
      "snd_sfxdevice 3",
      "snd_musicdevice 3",
      "screenblocks 10",
      `key_up ${DOS_KEYS.w}`,
      `key_down ${DOS_KEYS.s}`,
      `key_strafeleft ${DOS_KEYS.a}`,
      `key_straferight ${DOS_KEYS.d}`,
      `key_left ${DOS_KEYS.left}`,
      `key_right ${DOS_KEYS.right}`,
      `key_use ${DOS_KEYS.e}`,
      `key_fire ${DOS_KEYS.ctrl}`,
      `key_speed ${DOS_KEYS.shift}`,
    ].join("\n") + "\n"
  );
}
export function videoConfig() {
  return (
    [
      "fullscreen 0",
      "window_width 640",
      "window_height 480",
      "grabmouse 1",
      "aspect_ratio_correct 1",
      "integer_scaling 0",
      "smooth_pixel_scaling 0",
      "force_software_renderer 1",
      "novert 1",
      'snd_dmxoption ""',
    ].join("\n") + "\n"
  );
}
