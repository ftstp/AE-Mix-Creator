This script creates a mix in AE, save the final composition in specific folder, exports a tracklist of the mix created and closes the project.
It works for one or more songs (tested up to 1h30 length).

The final composition will looks like this:
- intro video at start
- all songs one after the other (sounds like a playlist, not like a mix)
- the image as the background
- layer fx for particles/smoke/fog/.. video
- layer add for small animation like subscribe/follow


Install:
1. git clone and create 4 folders in root:
- LOGO-BEFORE > put intro layer inside (you can change the timing in the .json)
- LAYER-FX > put a layer that will loop all the time (screen)
- LAYER-ADD > layer that will loop every 10 minutes  (overlay)
- MEDIA-INPUT > audio files and one PNG at 1920x1080px

2. Adapt paths in main.jsx (search d:\ and f:\ to find them all!)


Use:
open main.jsx in vs code and press F5 and enter (needs ExtendScript Debugger extension) or use python.



You can change some values in the .json:
- the resolution of the final composition, its fps
- the timing of the intro video, its fade-out duration, its opacity
- the color of the layer-fx

--
badly coded, but works ;)
