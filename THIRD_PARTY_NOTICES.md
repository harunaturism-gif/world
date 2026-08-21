# Third-Party Notices

## Open Hotel Client

Human World's room core includes TypeScript/PixiJS 7 adaptations of selected room-engine modules from the Open Hotel Client project:

- Project: https://github.com/open-hotel/open-hotel-client
- Copyright (c) 2019 Open Hotel
- Source revision studied: `1ff598ab5bd13c3136dfcd134e5f7db988490919`
- License: MIT

Adaptation map:

- `src/engine/lib/util/Matrix.ts` → `src/game/openHotel/Matrix.ts`
- `src/engine/isometric/Vector3.ts` → `src/game/openHotel/Vector3.ts`
- `src/engine/isometric/IsometricUtils.ts` → `src/game/openHotel/IsometricUtils.ts`
- `src/game/room/Room.engine.ts` → `src/game/openHotel/RoomEngineCore.ts`
- `src/game/room/Room.model.ts` and room model types → `src/game/openHotel/RoomModel.ts`
- `src/game/room/users/RoomUser.ts` → `src/game/openHotel/RoomUser.ts`
- `src/game/imager/avatar/animation/AnimationManager.ts` → `src/game/openHotel/AnimationTimeline.ts`
- `src/game/imager/avatar/AvatarStructure.ts` → `src/game/openHotel/AvatarStructure.ts`

The adaptations retain room-owned users and coordinates, matrix/heightmap primitives, coordinate transforms, normalized animation tracks, declarative avatar-part ordering, and position-derived depth. They replace Phaser/tween assumptions with the existing React + PixiJS 7 renderer, A* routes, static collision, and soft dynamic actor occupancy. Each substantially adapted destination module also carries its source URL in a code comment.

All room, furniture, and avatar art used by Human World is original to this project. No Open Hotel, Habbo, or Sulake assets, branding, or proprietary code were copied.

### MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
