/* Obsidian DOOM read-only regression diagnostics, GPL-2.0-or-later.
 * This bridge observes engine state; it never changes game rules or input. */
#include "config.h"
#ifdef EMSCRIPTEN
#include <emscripten.h>
#include "doom/doomstat.h"
#include "doom/p_mobj.h"
#include "i_video.h"
#include "SDL.h"
int I_ObsidianWindowFocused(void);

EMSCRIPTEN_KEEPALIVE int DB_ReadState(int field)
{
    player_t *player = &players[consoleplayer];
    switch (field)
    {
        case 0: return gamestate;
        case 1: return player->mo ? player->mo->x : 0;
        case 2: return player->mo ? player->mo->y : 0;
        case 3: return player->mo ? (int) player->mo->angle : 0;
        case 4: return player->health;
        case 5: return player->ammo[am_clip];
        case 6: return gametic;
        case 7: return menuactive;
        case 8: return player->cmd.forwardmove;
        case 9: return player->cmd.sidemove;
        case 10: return player->cmd.buttons;
        case 11: return player->readyweapon;
        case 12: return automapactive;
        case 13: return player->cmd.angleturn;
        case 14: return musicVolume;
        case 15: return sfxVolume;
        case 16: return I_ObsidianWindowFocused();
        case 17: return usemouse;
        case 18: return SDL_GetRelativeMouseMode();
        case 19: return SDL_GetKeyboardFocus() != NULL;
        default: return 0;
    }
}
#endif
